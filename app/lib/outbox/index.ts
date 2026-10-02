import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';

import { getAppStorage } from '../storage';
import { getSupabase, isSupabaseConfigured } from '../supabase';
import { expoNetworkConnectivity } from './connectivity';
import { createOutbox, type Outbox } from './outbox';
import { createSupabaseTransport, supabaseOutboxDb } from './transport';
import { attachOutboxTriggers } from './triggers';

export { createOutbox, type Outbox, type OutboxDeps } from './outbox';
export type { NoteFields, NotePatch, OutboxError, OutboxEvent, OutboxEventInfo, OutboxItem, OutboxOp } from './types';
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
    // The count only: the unreadable items hold note text.
    onUnreadable: (count) => console.warn(`outbox_unreadable_items:${count}`),
  });
  return outbox;
}

/**
 * Starts replaying queued writes; called once at app start. A no-op without a Supabase project.
 * Besides connectivity and the retry timer, the queue is sent when the session appears or
 * refreshes and when the app comes to the foreground. Returns `stop`.
 */
export function startOutbox(): () => void {
  if (stop) return stop;
  if (!isSupabaseConfigured()) return () => undefined;
  const box = getOutbox();
  const stopWorker = box.start();
  const detach = attachOutboxTriggers(box, { auth: getSupabase()?.auth, appState: AppState });
  stop = () => {
    detach();
    stopWorker();
    stop = undefined;
  };
  return stop;
}
