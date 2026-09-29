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

const DEAD_REFRESH_TOKEN_CODES = new Set(['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found']);

/** True only for errors that mean this refresh token can never work again. */
export function isDeadRefreshToken(error: unknown): boolean {
  if (!isAuthApiError(error)) return false;
  if (error.code && DEAD_REFRESH_TOKEN_CODES.has(error.code)) return true;
  return error.code === undefined && error.status === 400 && /refresh token/i.test(error.message);
}

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
    if (refreshed.error && isDeadRefreshToken(refreshed.error)) {
      // The token itself is dead (revoked, already rotated, unknown). Forget it and start again.
      await refreshTokens.clear();
    } else {
      // Anything else (429, 5xx, a misconfigured project) keeps the token; a retry may succeed.
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
