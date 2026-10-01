import type { Outbox } from './outbox';

/** The auth events after which queued writes can go out (supabase-js `AuthChangeEvent` names). */
const SESSION_EVENTS = new Set(['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED']);

export interface AuthEvents {
  /** supabase-js `auth.onAuthStateChange`, narrowed to what the outbox reads. */
  onAuthStateChange(callback: (event: string, session: object | null) => void): {
    data: { subscription: { unsubscribe(): void } };
  };
}

export interface AppStateEvents {
  addEventListener(type: 'change', listener: (state: string) => void): { remove(): void };
}

/**
 * Sends the queue as soon as it can succeed: when the session first appears or refreshes (a write
 * queued on a first launch offline would otherwise wait out a backoff of up to five minutes), and
 * when the app comes to the foreground. Returns `stop`, which removes both subscriptions.
 */
export function attachOutboxTriggers(
  outbox: Pick<Outbox, 'retryNow'>,
  sources: { auth?: AuthEvents | null; appState?: AppStateEvents },
): () => void {
  const authSubscription = sources.auth?.onAuthStateChange((event, session) => {
    if (session && SESSION_EVENTS.has(event)) void outbox.retryNow();
  });
  const appStateSubscription = sources.appState?.addEventListener('change', (state) => {
    if (state === 'active') void outbox.retryNow();
  });
  return () => {
    authSubscription?.data.subscription.unsubscribe();
    appStateSubscription?.remove();
  };
}
