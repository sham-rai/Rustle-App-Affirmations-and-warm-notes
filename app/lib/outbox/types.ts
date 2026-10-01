import { LIFE_AREAS } from '@rustle/shared';
import { z } from 'zod';

// The persisted shape of the outbox. Validated with zod on load, so an app update that changes it,
// or a damaged file, drops the unreadable items instead of crashing the worker.

/** `notes.source` values (migration 1 check constraint). */
export const NOTE_SOURCES = ['onboarding', 'board', 'checkin', 'voice'] as const;

/**
 * Longest note body, in characters (code points, as Postgres `char_length` counts). The app
 * refuses a longer body before queueing. The matching server-side cap is not in the database
 * today: it lands with M1-11, and once it does a longer write would be a permanent 23514 and the
 * note would vanish after showing. Moves to `NOTE_BODY_MAX_CHARS` in packages/shared/limits.ts with M1-11.
 */
export const NOTE_BODY_MAX_CHARS = 2000;
/** Longest check-in line (`checkins.line` check constraint). Moves to packages/shared/limits.ts with M1-11. */
export const CHECKIN_LINE_MAX_CHARS = 280;

/** Length in code points, so an emoji counts once, as it does for the database. */
export function charLength(text: string): number {
  return Array.from(text).length;
}

const mood = z.number().int().min(1).max(5);
const isoTime = z.string().min(1);

/** The note columns a user may write (migration 1 column grants on the `notes` view). */
export const noteFieldsSchema = z.object({
  body: z.string().refine((body) => charLength(body) <= NOTE_BODY_MAX_CHARS),
  mood: mood.nullable(),
  source: z.enum(NOTE_SOURCES),
  wants_reply: z.boolean(),
  pinned: z.boolean(),
  hidden_from_recap: z.boolean(),
  exclude_from_ai: z.boolean(),
  life_areas: z.array(z.enum(LIFE_AREAS)),
});
export type NoteFields = z.infer<typeof noteFieldsSchema>;
export const notePatchSchema = noteFieldsSchema.partial();
export type NotePatch = z.infer<typeof notePatchSchema>;

export const outboxOpSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('note_create'),
    noteId: z.string().uuid(),
    fields: noteFieldsSchema,
    created_at: isoTime,
    /** Set once an offline edit has been folded into the create. */
    edited_at: isoTime.nullable(),
  }),
  z.object({
    kind: z.literal('note_update'),
    noteId: z.string().uuid(),
    patch: notePatchSchema,
    edited_at: isoTime,
  }),
  z.object({
    kind: z.literal('note_delete'),
    noteId: z.string().uuid(),
    deleted_at: isoTime,
  }),
  z.object({
    kind: z.literal('checkin_create'),
    checkinId: z.string().uuid(),
    mood,
    energy: mood.nullable(),
    line: z
      .string()
      .refine((line) => charLength(line) <= CHECKIN_LINE_MAX_CHARS)
      .nullable(),
    created_at: isoTime,
  }),
]);
export type OutboxOp = z.infer<typeof outboxOpSchema>;
export type OutboxOpKind = OutboxOp['kind'];

export const outboxItemSchema = z.object({
  /** Idempotency key of this queued write; a re-send with the same key never makes a second row. */
  key: z.string().min(1),
  op: outboxOpSchema,
  /** Bumped whenever a later edit is folded into this item; a sync only clears the revision it sent. */
  rev: z.number().int().nonnegative(),
  /** Send attempts so far. Above zero means the server may already have applied it. */
  attempts: z.number().int().nonnegative(),
  /** Epoch ms before which the worker leaves this item (and later writes to the same row) alone. */
  nextAttemptAt: z.number(),
  enqueuedAt: z.number(),
  /** True when the device was offline as the write was made (analytics: `board_note_created.offline`). */
  createdOffline: z.boolean(),
});
export type OutboxItem = z.infer<typeof outboxItemSchema>;

/** The row an item writes to; items for the same row are sent in order. */
export function entityIdOf(op: OutboxOp): string {
  return op.kind === 'checkin_create' ? op.checkinId : op.noteId;
}

/** Drops keys whose value is `undefined`: JSON would drop them on the way to disk anyway. */
export function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

/** A write refused before queueing because it does not match the outbox schema. Field paths only, no values. */
export class InvalidOutboxOpError extends Error {
  readonly kind: string;
  readonly paths: string[];
  constructor(kind: string, paths: string[]) {
    super(`invalid_outbox_op:${kind}:${paths.join(',')}`);
    this.name = 'InvalidOutboxOpError';
    this.kind = kind;
    this.paths = paths;
  }
}

/** Why a queued write was given up on. Carries ids and codes only, never note or check-in text. */
export interface OutboxError {
  kind: OutboxOpKind;
  /** The note or check-in id. */
  entityId: string;
  /** The idempotency key of the dropped item. */
  key: string;
  /** HTTP status from PostgREST (0 for a network failure). */
  status: number;
  /** Postgres SQLSTATE or PostgREST error code, e.g. `42501` for an RLS denial. */
  code: string;
}

export type SendResult =
  | { outcome: 'ok' }
  | { outcome: 'transient'; status: number; code: string }
  | { outcome: 'permanent'; status: number; code: string };

/** Sends one queued write to the server. Implemented over Supabase in transport.ts. */
export interface OutboxTransport {
  /** True when a send can reach the server as this user: configured, with a session. */
  canSend(): Promise<boolean>;
  send(item: OutboxItem): Promise<SendResult>;
}

/** Network reachability, behind an interface so tests can switch it. */
export interface Connectivity {
  isOnline(): Promise<boolean>;
  /** Called with the new state on every change. Returns an unsubscribe function. */
  subscribe(listener: (online: boolean) => void): () => void;
}

/**
 * What listeners learn about a queued write: ids, kind and the offline flag. Never the item
 * itself, which holds the note body or check-in line; that stays inside outbox.ts.
 */
export interface OutboxEventInfo {
  kind: OutboxOpKind;
  /** The note or check-in id. */
  entityId: string;
  /** The idempotency key of the queued write. */
  key: string;
  createdOffline: boolean;
}

export type OutboxEvent =
  | ({ type: 'enqueued' } & OutboxEventInfo)
  | ({ type: 'synced' } & OutboxEventInfo)
  | ({ type: 'dropped'; error: OutboxError } & OutboxEventInfo);

/** The text-free summary of an item, for events. */
export function eventInfoOf(item: OutboxItem): OutboxEventInfo {
  return { kind: item.op.kind, entityId: entityIdOf(item.op), key: item.key, createdOffline: item.createdOffline };
}
