import { isAuthApiError, isAuthRetryableFetchError, type SupabaseClient } from '@supabase/supabase-js';

import type { RefreshTokenSource, RefreshTokenStore } from '../secure-storage/refresh-token-store';

export type RestoredFrom = 'session' | RefreshTokenSource | 'new';

export type AuthBootstrapResult =
  /** No Supabase project in the environment; the app runs without an account. */
  | { status: 'not_configured' }
  /** A session exists. `restoredFrom` says how it came back (docs/07 §5 edge cases). */
  | { status: 'ready'; userId: string; isAnonymous: boolean; restoredFrom: RestoredFrom }
  /** Nothing could be established this time; safe to retry (network, server). */
  | { status: 'failed'; reason: 'offline' | 'server' };

/** The auth surface the bootstrap needs; the real client satisfies it. */
export type AuthClient = Pick<SupabaseClient, 'auth'>;

/**
 * First-launch and cold-start flow (docs/07 §5, docs/21 §3.1–3.2):
 * 1. a cached session wins;
 * 2. else a stored refresh token (Keychain, Keystore, Block Store) is exchanged for a session;
 * 3. else a new anonymous account is created, with no form.
 * A token refresh that fails for network reasons never creates a new account: that would orphan
 * the user's notes. It returns `failed` so the caller can retry when the app is back online.
 */
export async function ensureSession(
  client: AuthClient | null,
  refreshTokens: RefreshTokenStore,
): Promise<AuthBootstrapResult> {
  if (!client) return { status: 'not_configured' };

  const current = await client.auth.getSession();
  if (current.data.session) {
    const { user } = current.data.session;
    return { status: 'ready', userId: user.id, isAnonymous: user.is_anonymous === true, restoredFrom: 'session' };
  }

  const stored = await refreshTokens.load();
  if (stored) {
    const refreshed = await client.auth.refreshSession({ refresh_token: stored.token });
    if (refreshed.data.session) {
      const { user } = refreshed.data.session;
      return { status: 'ready', userId: user.id, isAnonymous: user.is_anonymous === true, restoredFrom: stored.source };
    }
    if (refreshed.error && isAuthRetryableFetchError(refreshed.error)) {
      return { status: 'failed', reason: 'offline' };
    }
    if (refreshed.error && isAuthApiError(refreshed.error)) {
      // The token is dead (revoked, expired, unknown). Forget it and start a new account.
      await refreshTokens.clear();
    } else {
      return { status: 'failed', reason: 'server' };
    }
  }

  const created = await client.auth.signInAnonymously();
  if (created.error || !created.data.session) {
    return {
      status: 'failed',
      reason: created.error && isAuthRetryableFetchError(created.error) ? 'offline' : 'server',
    };
  }
  const { user } = created.data.session;
  return { status: 'ready', userId: user.id, isAnonymous: true, restoredFrom: 'new' };
}
