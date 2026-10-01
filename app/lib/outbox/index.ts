import * as Crypto from 'expo-crypto';

import { getAppStorage } from '../storage';
import { getSupabase, isSupabaseConfigured } from '../supabase';
import { expoNetworkConnectivity } from './connectivity';
import { createOutbox, type Outbox } from './outbox';
import { createSupabaseTransport, supabaseOutboxDb } from './transport';

export { createOutbox, type Outbox, type OutboxDeps } from './outbox';
export type { NoteFields, NotePatch, OutboxError, OutboxEvent, OutboxItem, OutboxOp } from './types';
export { entityIdOf } from './types';

let outbox: Outbox | undefined;
let stop: (() => void) | undefined;

/** The app-wide outbox on the encrypted app-data MMKV file. */
export function getOutbox(): Outbox {
  outbox ??= createOutbox({
    store: getAppStorage(),
    transport: createSupabaseTransport(() => {
      const client = getSupabase();
      return client ? supabaseOutboxDb(client) : null;
    }),
    connectivity: expoNetworkConnectivity,
    newKey: () => Crypto.randomUUID(),
  });
  return outbox;
}

/** Starts replaying queued writes; called once at app start. A no-op without a Supabase project. */
export function startOutbox(): void {
  if (stop || !isSupabaseConfigured()) return;
  stop = getOutbox().start();
}
