import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import { createRefreshTokenStore } from '../../secure-storage/refresh-token-store';
import { fakeBlockStore, fakeSecureStore } from '../../secure-storage/__tests__/fakes';
import { ensureSession, type AuthClient } from '../bootstrap';

const user = (id: string, anonymous = true) => ({ id, is_anonymous: anonymous });
const sessionOf = (id: string) => ({ session: { user: user(id), refresh_token: `rt-${id}`, access_token: 'jwt' } });

function fakeClient(behaviour: {
  session?: string | null;
  refresh?: (token: string) => { session: string } | { error: Error };
  anonymous?: { session: string } | { error: Error };
}) {
  const calls = { getSession: 0, refreshSession: [] as string[], signInAnonymously: 0 };
  const client = {
    auth: {
      async getSession() {
        calls.getSession += 1;
        return { data: behaviour.session ? sessionOf(behaviour.session) : { session: null }, error: null };
      },
      async refreshSession({ refresh_token }: { refresh_token: string }) {
        calls.refreshSession.push(refresh_token);
        const result = behaviour.refresh?.(refresh_token) ?? { error: new Error('unexpected') };
        return 'session' in result
          ? { data: sessionOf(result.session), error: null }
          : { data: { session: null, user: null }, error: result.error };
      },
      async signInAnonymously() {
        calls.signInAnonymously += 1;
        const result = behaviour.anonymous ?? { error: new Error('unexpected') };
        return 'session' in result
          ? { data: sessionOf(result.session), error: null }
          : { data: { session: null, user: null }, error: result.error };
      },
    },
  } as unknown as AuthClient;
  return { client, calls };
}

function tokenStore(platform: 'ios' | 'android' = 'ios') {
  return createRefreshTokenStore({ platform, secureStore: fakeSecureStore().api, blockStore: fakeBlockStore().api });
}

describe('ensureSession', () => {
  it('reports not_configured without a client and never touches storage', async () => {
    await expect(ensureSession(null, tokenStore())).resolves.toEqual({ status: 'not_configured' });
  });

  it('keeps a cached session', async () => {
    const { client, calls } = fakeClient({ session: 'u1' });
    await expect(ensureSession(client, tokenStore())).resolves.toEqual({
      status: 'ready', userId: 'u1', isAnonymous: true, restoredFrom: 'session',
    });
    expect(calls.signInAnonymously).toBe(0);
  });

  it('reinstall: exchanges the Keychain refresh token for the same account', async () => {
    const store = tokenStore();
    await store.save('rt-old');
    const { client, calls } = fakeClient({ session: null, refresh: () => ({ session: 'same-user' }) });
    await expect(ensureSession(client, store)).resolves.toEqual({
      status: 'ready', userId: 'same-user', isAnonymous: true, restoredFrom: 'keychain',
    });
    expect(calls.refreshSession).toEqual(['rt-old']);
    expect(calls.signInAnonymously).toBe(0);
  });

  it('first launch: creates an anonymous account with no form', async () => {
    const { client, calls } = fakeClient({ session: null, anonymous: { session: 'fresh' } });
    await expect(ensureSession(client, tokenStore())).resolves.toEqual({
      status: 'ready', userId: 'fresh', isAnonymous: true, restoredFrom: 'new',
    });
    expect(calls.refreshSession).toEqual([]);
    expect(calls.signInAnonymously).toBe(1);
  });

  it('a dead token is forgotten and a new account is created', async () => {
    const store = tokenStore();
    await store.save('rt-dead');
    const { client } = fakeClient({
      session: null,
      refresh: () => ({ error: new AuthApiError('Invalid Refresh Token', 400, 'refresh_token_not_found') }),
      anonymous: { session: 'fresh' },
    });
    await expect(ensureSession(client, store)).resolves.toMatchObject({ status: 'ready', restoredFrom: 'new' });
    await expect(store.load()).resolves.toBeNull();
  });

  it('offline after a reinstall: keeps the token and never creates a second account', async () => {
    const store = tokenStore('android');
    await store.save('rt-keep');
    const { client, calls } = fakeClient({
      session: null,
      refresh: () => ({ error: new AuthRetryableFetchError('Network request failed', 0) }),
    });
    await expect(ensureSession(client, store)).resolves.toEqual({ status: 'failed', reason: 'offline' });
    expect(calls.signInAnonymously).toBe(0);
    await expect(store.load()).resolves.toMatchObject({ token: 'rt-keep' });
  });

  it('offline on a true first launch reports failed so the caller can retry', async () => {
    const { client } = fakeClient({
      session: null,
      anonymous: { error: new AuthRetryableFetchError('Network request failed', 0) },
    });
    await expect(ensureSession(client, tokenStore())).resolves.toEqual({ status: 'failed', reason: 'offline' });
  });
});
