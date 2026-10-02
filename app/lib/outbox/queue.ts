import type { KeyValueStore } from '../secure-storage/session-cache';
import {
  InvalidOutboxOpError,
  entityIdOf,
  outboxItemSchema,
  outboxOpSchema,
  withoutUndefined,
  type OutboxItem,
  type OutboxOp,
} from './types';

/** MMKV key of the persisted queue. Bump the suffix if the item shape changes incompatibly. */
export const OUTBOX_STORAGE_KEY = 'outbox.v1';

export interface OutboxQueue {
  /** The queued writes, oldest first. */
  items(): readonly OutboxItem[];
  /**
   * Queues a write, folding it into an earlier one where it can (see the coalescing rules below).
   * Returns the item that now carries the write, or null when nothing needs to reach the server
   * (a delete of a note that never left the device, or an edit to a note already being deleted).
   * Throws `InvalidOutboxOpError` for a write that does not match the schema.
   */
  enqueue(op: OutboxOp, opts: { createdOffline: boolean }): OutboxItem | null;
  /** The oldest item that may be sent now: not in flight, not in backoff, nothing earlier pending for its row. */
  nextReady(now: number): OutboxItem | undefined;
  /** Marks an item as being sent and counts the attempt. Returns the snapshot to send. */
  markAttempt(key: string): OutboxItem | undefined;
  /** Removes an item once the server has applied revision `rev`; a newer revision stays queued. */
  complete(key: string, rev: number): void;
  /** Leaves an item queued until `at` (epoch ms). */
  scheduleRetry(key: string, at: number): void;
  /** Removes an item and every later write to the same row (they depend on it). Returns what was removed. */
  dropWithDependents(key: string): OutboxItem[];
  /**
   * The earliest backoff end after `now`, if any. Items already due but queued behind a row in
   * backoff are covered by that row's time, so this never asks for a timer that finds nothing to do.
   */
  earliestRetryAt(now: number): number | undefined;
  /** Ends every backoff, for when the connection comes back. */
  retryAllNow(): void;
  /** Notified after every change; used by the notes cache to show pending writes. */
  subscribe(listener: () => void): () => void;
}

interface Deps {
  store: KeyValueStore;
  newKey: () => string;
  now: () => number;
  /** Called with a count when persisted items could not be read back. Never receives item content. */
  onUnreadable?: (count: number) => void;
}

function load(deps: Deps): OutboxItem[] {
  const raw = deps.store.getString(OUTBOX_STORAGE_KEY);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    deps.onUnreadable?.(1);
    return [];
  }
  if (!Array.isArray(parsed)) {
    deps.onUnreadable?.(1);
    return [];
  }
  const items: OutboxItem[] = [];
  let unreadable = 0;
  for (const entry of parsed) {
    const result = outboxItemSchema.safeParse(entry);
    if (result.success) items.push(result.data);
    else unreadable += 1;
  }
  if (unreadable > 0) deps.onUnreadable?.(unreadable);
  return items;
}

/**
 * The offline outbox (docs/07 §1, §4.2 step 1): an ordered list of writes persisted in the
 * encrypted MMKV file after every change, so it survives an app kill.
 *
 * Coalescing, last write wins:
 * - an edit to a note whose create is still queued is folded into the create;
 * - an edit following a queued edit of the same note is folded into that edit;
 * - otherwise an edit is a separate queued update;
 * - a delete drops every queued write for the note; if the create never left the device, nothing
 *   is sent at all, otherwise a delete is queued (the create may already be on the server).
 * Folding into an item that is in flight bumps its revision, so the worker re-sends it after the
 * current attempt instead of clearing it.
 */
export function createOutboxQueue(deps: Deps): OutboxQueue {
  let items: OutboxItem[] = load(deps);
  const inFlight = new Set<string>();
  const listeners = new Set<() => void>();

  function commit(next: OutboxItem[]): void {
    items = next;
    deps.store.set(OUTBOX_STORAGE_KEY, JSON.stringify(items));
    for (const listener of listeners) listener();
  }

  function replace(key: string, update: (item: OutboxItem) => OutboxItem): OutboxItem | undefined {
    let updated: OutboxItem | undefined;
    const next = items.map((item) => {
      if (item.key !== key) return item;
      updated = update(item);
      return updated;
    });
    if (updated) commit(next);
    return updated;
  }

  function lastFor(entityId: string): OutboxItem | undefined {
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const item = items[i];
      if (item && entityIdOf(item.op) === entityId) return item;
    }
    return undefined;
  }

  function append(op: OutboxOp, createdOffline: boolean): OutboxItem {
    const now = deps.now();
    const item: OutboxItem = {
      key: deps.newKey(),
      op,
      rev: 0,
      attempts: 0,
      nextAttemptAt: now,
      enqueuedAt: now,
      createdOffline,
    };
    commit([...items, item]);
    return item;
  }

  /** Folding a later write in: a new revision, sendable straight away. */
  function folded(item: OutboxItem, op: OutboxOp): OutboxItem {
    return { ...item, op, rev: item.rev + 1, nextAttemptAt: Math.min(item.nextAttemptAt, deps.now()) };
  }

  return {
    items: () => items,

    enqueue(input, { createdOffline }) {
      // Everything queued must read back after a restart: validate, and drop `undefined` keys
      // (a form spreading an unset field) so they never overwrite a required field when folded.
      const parsed = outboxOpSchema.safeParse(input);
      if (!parsed.success) {
        throw new InvalidOutboxOpError(
          String((input as { kind?: unknown }).kind),
          parsed.error.issues.map((issue) => issue.path.join('.')),
        );
      }
      const op: OutboxOp =
        parsed.data.kind === 'note_update' ? { ...parsed.data, patch: withoutUndefined(parsed.data.patch) } : parsed.data;
      if (op.kind === 'note_update') {
        const last = lastFor(op.noteId);
        if (last?.op.kind === 'note_delete') return null;
        if (last?.op.kind === 'note_create') {
          const merged: OutboxOp = { ...last.op, fields: { ...last.op.fields, ...op.patch }, edited_at: op.edited_at };
          return replace(last.key, (item) => folded(item, merged)) ?? null;
        }
        if (last?.op.kind === 'note_update') {
          const merged: OutboxOp = { ...last.op, patch: { ...last.op.patch, ...op.patch }, edited_at: op.edited_at };
          return replace(last.key, (item) => folded(item, merged)) ?? null;
        }
        return append(op, createdOffline);
      }

      if (op.kind === 'note_delete') {
        const forNote = items.filter((item) => entityIdOf(item.op) === op.noteId);
        if (forNote.some((item) => item.op.kind === 'note_delete')) return null;
        const create = forNote.find((item) => item.op.kind === 'note_create');
        const neverSent = create !== undefined && create.attempts === 0 && !inFlight.has(create.key);
        if (forNote.length > 0) commit(items.filter((item) => entityIdOf(item.op) !== op.noteId));
        if (neverSent) return null;
        return append(op, createdOffline);
      }

      return append(op, createdOffline);
    },

    nextReady(now) {
      const blocked = new Set<string>();
      for (const item of items) {
        const entity = entityIdOf(item.op);
        if (blocked.has(entity)) continue;
        if (inFlight.has(item.key) || item.nextAttemptAt > now) {
          blocked.add(entity);
          continue;
        }
        return item;
      }
      return undefined;
    },

    markAttempt(key) {
      const updated = replace(key, (item) => ({ ...item, attempts: item.attempts + 1 }));
      if (updated) inFlight.add(key);
      return updated;
    },

    complete(key, rev) {
      inFlight.delete(key);
      const item = items.find((candidate) => candidate.key === key);
      if (!item) return;
      if (item.rev === rev) commit(items.filter((candidate) => candidate.key !== key));
      else commit([...items]); // a newer revision stays queued; tell listeners the attempt ended
    },

    scheduleRetry(key, at) {
      inFlight.delete(key);
      replace(key, (item) => ({ ...item, nextAttemptAt: at }));
    },

    dropWithDependents(key) {
      inFlight.delete(key);
      const index = items.findIndex((item) => item.key === key);
      const target = items[index];
      if (!target) return [];
      const entity = entityIdOf(target.op);
      const removed = items.filter((item, i) => i >= index && entityIdOf(item.op) === entity && !inFlight.has(item.key));
      const removedKeys = new Set(removed.map((item) => item.key));
      commit(items.filter((item) => !removedKeys.has(item.key)));
      return removed;
    },

    earliestRetryAt(now) {
      let earliest: number | undefined;
      for (const item of items) {
        if (inFlight.has(item.key) || item.nextAttemptAt <= now) continue;
        if (earliest === undefined || item.nextAttemptAt < earliest) earliest = item.nextAttemptAt;
      }
      return earliest;
    },

    retryAllNow() {
      const now = deps.now();
      if (items.every((item) => item.nextAttemptAt <= now)) return;
      commit(items.map((item) => (item.nextAttemptAt > now ? { ...item, nextAttemptAt: now } : item)));
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
