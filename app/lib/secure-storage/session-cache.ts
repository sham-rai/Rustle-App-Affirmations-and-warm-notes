import type { SupportedStorage } from '@supabase/supabase-js';
import type { RefreshTokenStore } from './refresh-token-store';

/** The subset of MMKV the session cache uses; lets tests pass an in-memory map. */
export interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): boolean;
}

interface Deps {
  cache: KeyValueStore;
  refreshTokens: RefreshTokenStore;
}

/** Pulls the refresh token out of the JSON supabase-js hands to storage; null for anything else. */
export function extractRefreshToken(value: string): string | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const token = (parsed as Record<string, unknown>)['refresh_token'];
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

/** auth-js keeps housekeeping entries (PKCE code verifier) next to the session; they are not sessions. */
export function isSessionKey(key: string): boolean {
  return !key.endsWith('-code-verifier');
}

/**
 * Storage adapter for supabase-js. The whole session (access token, user) lives in an encrypted
 * MMKV file that dies with the install; the refresh token is copied to the reinstall-proof stores in
 * the same write, so the two can never drift apart across a token rotation.
 *
 * `removeItem` clears the cache only. auth-js removes the session on any non-retryable refresh
 * error (a 429, a flaky 400), and wiping the Keychain / Block Store copy there would orphan the
 * account. The reinstall-proof copy is cleared in exactly two places: an explicit sign-out or
 * account deletion (`deleteAnonymousAccount`), and a refresh that proves the token dead (`ensureSession`).
 */
export function createSessionStorage(deps: Deps): SupportedStorage {
  return {
    async getItem(key) {
      return deps.cache.getString(key) ?? null;
    },
    async setItem(key, value) {
      deps.cache.set(key, value);
      if (!isSessionKey(key)) return;
      const token = extractRefreshToken(value);
      if (token) await deps.refreshTokens.save(token);
    },
    async removeItem(key) {
      deps.cache.remove(key);
    },
  };
}
