import type { SupabaseClient } from '@supabase/supabase-js';

import { fakeCache } from '../../secure-storage/__tests__/fakes';
import { createOutbox, type Outbox } from '../outbox';
import { createSupabaseTransport, supabaseOutboxDb, type WriteResult } from '../transport';
import type { Connectivity, OutboxEvent } from '../types';

type Row = Record<string, unknown>;
type Table = 'notes' | 'checkins';
/** What the next request does instead of succeeding: fail before the server, or apply and lose the response. */
type Fault = { kind: 'fail'; result: WriteResult } | { kind: 'lose_response' };

/** An in-memory PostgREST behind the two tables the outbox writes; ids are primary keys. */
export function fakeSupabase() {
  const tables: Record<Table, Map<string, Row>> = { notes: new Map(), checkins: new Map() };
  const calls: string[] = [];
  const faults: Fault[] = [];
  let reachable = true;

  function respond(label: string, apply: () => WriteResult): Promise<WriteResult> {
    calls.push(label);
    if (!reachable) return Promise.resolve({ error: { code: '' }, status: 0 });
    const fault = faults.shift();
    if (fault?.kind === 'fail') return Promise.resolve(fault.result);
    const result = apply();
    if (fault?.kind === 'lose_response') return Promise.resolve({ error: { code: '' }, status: 0 });
    return Promise.resolve(result);
  }

  const client = {
    auth: { getSession: async () => ({ data: { session: { access_token: 'jwt' } } }) },
    from(table: Table) {
      return {
        insert(row: Row) {
          return respond(`insert:${table}`, () => {
            const id = String(row['id']);
            if (tables[table].has(id)) return { error: { code: '23505' }, status: 409 };
            tables[table].set(id, { ...row });
            return { error: null, status: 201 };
          });
        },
        update(values: Row) {
          return {
            eq(_column: 'id', id: string) {
              return respond(`update:${table}`, () => {
                const existing = tables[table].get(id);
                if (existing) tables[table].set(id, { ...existing, ...values });
                return { error: null, status: 204 };
              });
            },
          };
        },
      };
    },
  };

  return {
    client: client as unknown as SupabaseClient,
    tables,
    calls,
    faults,
    setReachable(value: boolean) {
      reachable = value;
    },
  };
}

export function fakeConnectivity(initial: boolean) {
  let online = initial;
  const listeners = new Set<(online: boolean) => void>();
  const connectivity: Connectivity = {
    isOnline: async () => online,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    connectivity,
    set(value: boolean) {
      online = value;
      for (const listener of listeners) listener(value);
    },
  };
}

/** A manual clock with timers, so backoff runs without waiting. */
export function fakeClock(start = 1_000_000) {
  let now = start;
  let nextHandle = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    now: () => now,
    setTimer: (fn: () => void, ms: number) => {
      const handle = nextHandle++;
      timers.set(handle, { at: now + ms, fn });
      return handle;
    },
    clearTimer: (handle: unknown) => {
      timers.delete(handle as number);
    },
    pending: () => [...timers.values()].map((timer) => timer.at - now),
    advance(ms: number) {
      now += ms;
      for (const [handle, timer] of [...timers]) {
        if (timer.at <= now) {
          timers.delete(handle);
          timer.fn();
        }
      }
    },
  };
}

let counter = 0;
/** Deterministic uuids, valid for the zod schema. */
export function testUuid(): string {
  counter += 1;
  return `00000000-0000-4000-8000-${counter.toString().padStart(12, '0')}`;
}

export function setup(opts: { online: boolean; store?: ReturnType<typeof fakeCache>; server?: ReturnType<typeof fakeSupabase> }) {
  const store = opts.store ?? fakeCache();
  const server = opts.server ?? fakeSupabase();
  const net = fakeConnectivity(opts.online);
  const clock = fakeClock();
  const events: OutboxEvent[] = [];
  const outbox: Outbox = createOutbox({
    store,
    transport: createSupabaseTransport(() => supabaseOutboxDb(server.client)),
    connectivity: net.connectivity,
    newKey: testUuid,
    now: clock.now,
    random: () => 1,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });
  outbox.onEvent((event) => events.push(event));
  return { outbox, store, server, net, clock, events };
}

/** Lets every queued flush, including one re-triggered while running, finish. */
export async function idle(outbox: Outbox): Promise<void> {
  for (let i = 0; i < 3; i += 1) await outbox.flush();
}
