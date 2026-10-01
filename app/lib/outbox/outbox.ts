import type { KeyValueStore } from '../secure-storage/session-cache';
import { createOutboxQueue } from './queue';
import type { Connectivity, OutboxEvent, OutboxItem, OutboxOp, OutboxTransport } from './types';
import { createOutboxWorker } from './worker';

export interface Outbox {
  /** Queues a write (see queue.ts for coalescing) and tries to send it straight away. */
  enqueue(op: OutboxOp): OutboxItem | null;
  /** Pending writes, oldest first. The notes cache overlays these on server data. */
  items(): readonly OutboxItem[];
  flush(): Promise<void>;
  /** Starts the worker (connectivity listener, retry timer). Returns `stop`. */
  start(): () => void;
  /** Notified after every change to the pending writes. */
  subscribe(listener: () => void): () => void;
  /**
   * `enqueued`, `synced` and `dropped` events. The hook for analytics: the caller logs
   * `board_note_created` with `offline = item.createdOffline` on `synced` of a `note_create`,
   * and surfaces `dropped` errors. Events carry the queued item; only ids, kinds and flags may
   * leave the device, never `op.fields.body` or a check-in line.
   */
  onEvent(listener: (event: OutboxEvent) => void): () => void;
}

export interface OutboxDeps {
  store: KeyValueStore;
  transport: OutboxTransport;
  connectivity: Connectivity;
  newKey: () => string;
  now?: () => number;
  random?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export function createOutbox(deps: OutboxDeps): Outbox {
  const now = deps.now ?? Date.now;
  const listeners = new Set<(event: OutboxEvent) => void>();
  const emit = (event: OutboxEvent) => {
    for (const listener of listeners) listener(event);
  };
  const queue = createOutboxQueue({ store: deps.store, newKey: deps.newKey, now });
  const worker = createOutboxWorker({
    queue,
    transport: deps.transport,
    connectivity: deps.connectivity,
    now,
    random: deps.random,
    setTimer: deps.setTimer,
    clearTimer: deps.clearTimer,
    onSynced: (item) => emit({ type: 'synced', item }),
    onDropped: (item, error) => emit({ type: 'dropped', item, error }),
  });

  return {
    enqueue(op) {
      const item = queue.enqueue(op, { createdOffline: worker.isOnline() === false });
      if (item) emit({ type: 'enqueued', item });
      void worker.flush();
      return item;
    },
    items: () => queue.items(),
    flush: () => worker.flush(),
    start: () => worker.start(),
    subscribe: (listener) => queue.subscribe(listener),
    onEvent(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
