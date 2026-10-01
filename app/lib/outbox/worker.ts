import type { OutboxQueue } from './queue';
import type { Connectivity, OutboxError, OutboxItem, OutboxTransport, SendResult } from './types';

export const BACKOFF_BASE_MS = 2_000;
export const BACKOFF_MAX_MS = 5 * 60_000;

/** Exponential backoff with jitter: 2 s, 4 s, 8 s … capped at 5 min, each scaled into [50 %, 100 %]. */
export function backoffMs(attempts: number, random: () => number = Math.random): number {
  const exponent = Math.max(0, attempts - 1);
  const ceiling = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** exponent);
  return Math.round(ceiling * (0.5 + random() / 2));
}

export interface OutboxWorker {
  /** Starts listening for connectivity and sends what is queued. Returns `stop`. */
  start(): () => void;
  /** Sends every ready item now. Concurrent calls share one run. */
  flush(): Promise<void>;
  /** Last known connectivity; undefined until the first check. */
  isOnline(): boolean | undefined;
}

interface Deps {
  queue: OutboxQueue;
  transport: OutboxTransport;
  connectivity: Connectivity;
  now: () => number;
  random?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  onSynced?: (item: OutboxItem) => void;
  onDropped?: (item: OutboxItem, error: OutboxError) => void;
}

/**
 * Replays the outbox against the server, one write at a time, in order per row. Transient failures
 * (network, 408, 429, 5xx, an expiring session) back off and retry; permanent ones (any other 4xx,
 * including an RLS denial) drop the write and the later writes to the same row, and report a typed
 * error. Short and resumable: every step is persisted in the queue, so a kill mid-run loses nothing
 * and a re-send is idempotent (transport.ts).
 */
export function createOutboxWorker(deps: Deps): OutboxWorker {
  const setTimer = deps.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  let online: boolean | undefined;
  /** Bumped by every connectivity event, so an older `isOnline()` read never overwrites it. */
  let connectivityVersion = 0;
  let running: Promise<void> | null = null;
  let rerun = false;
  let timer: unknown = null;
  let stopped = true;

  function armTimer(): void {
    if (timer !== null) clearTimer(timer);
    timer = null;
    // Offline, the connectivity listener restarts the run; no timer, or it would spin.
    if (stopped || !online) return;
    const now = deps.now();
    const earliest = deps.queue.earliestRetryAt(now);
    if (earliest === undefined) return;
    timer = setTimer(() => {
      timer = null;
      void flush();
    }, earliest - now);
  }

  async function send(item: OutboxItem): Promise<SendResult> {
    try {
      return await deps.transport.send(item);
    } catch {
      return { outcome: 'transient', status: 0, code: 'exception' };
    }
  }

  /**
   * Re-reads connectivity at the start of every run: a stale `false` (Android's reachability probe
   * lagging, a change missed while suspended) must not block a foreground or session retry. A
   * change event that arrives during the await is newer than the value read, so it wins.
   */
  async function refreshOnline(): Promise<void> {
    const version = connectivityVersion;
    let value: boolean;
    try {
      value = await deps.connectivity.isOnline();
    } catch {
      value = true; // let the request decide
    }
    if (version === connectivityVersion) online = value;
  }

  async function canSend(): Promise<boolean> {
    try {
      return await deps.transport.canSend();
    } catch {
      return false;
    }
  }

  async function drain(): Promise<void> {
    await refreshOnline();
    while (online) {
      if (!deps.queue.nextReady(deps.now())) break;
      // No session yet (first launch offline) or not configured: stop without counting an attempt,
      // so `attempts > 0` keeps meaning "the server may have it". The session trigger restarts us.
      if (!(await canSend())) break;
      const next = deps.queue.nextReady(deps.now());
      if (!next) break;
      const sent = deps.queue.markAttempt(next.key);
      if (!sent) continue;
      const result = await send(sent);
      if (result.outcome === 'ok') {
        deps.queue.complete(sent.key, sent.rev);
        deps.onSynced?.(sent);
      } else if (result.outcome === 'transient') {
        deps.queue.scheduleRetry(sent.key, deps.now() + backoffMs(sent.attempts, deps.random));
        // A network failure will fail the next item too; wait for the timer or the connection.
        if (result.status === 0) break;
      } else {
        const error: OutboxError = {
          kind: sent.op.kind,
          entityId: sent.op.kind === 'checkin_create' ? sent.op.checkinId : sent.op.noteId,
          key: sent.key,
          status: result.status,
          code: result.code,
        };
        for (const removed of deps.queue.dropWithDependents(sent.key)) {
          deps.onDropped?.(removed, removed.key === sent.key ? error : { ...error, key: removed.key, kind: removed.op.kind });
        }
      }
    }
    armTimer();
  }

  function flush(): Promise<void> {
    if (running) {
      rerun = true;
      return running;
    }
    running = drain().finally(() => {
      running = null;
      if (rerun) {
        rerun = false;
        void flush();
      }
    });
    return running;
  }

  return {
    start() {
      stopped = false;
      const unsubscribe = deps.connectivity.subscribe((next) => {
        const cameBack = next && online !== true;
        connectivityVersion += 1;
        online = next;
        if (cameBack) {
          deps.queue.retryAllNow();
          void flush();
        }
      });
      void flush();
      return () => {
        stopped = true;
        unsubscribe();
        if (timer !== null) clearTimer(timer);
        timer = null;
      };
    },
    flush,
    isOnline: () => online,
  };
}
