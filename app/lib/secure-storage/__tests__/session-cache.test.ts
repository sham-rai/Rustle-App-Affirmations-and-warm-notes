import { createRefreshTokenStore } from '../refresh-token-store';
import { createSessionStorage, extractRefreshToken, isSessionKey } from '../session-cache';
import { fakeBlockStore, fakeCache, fakeSecureStore } from './fakes';

const session = (refreshToken: string) =>
  JSON.stringify({ access_token: 'jwt', refresh_token: refreshToken, user: { id: 'u1' } });

describe('session storage adapter', () => {
  it('caches the whole session and copies the refresh token to the reinstall-proof store in the same write', async () => {
    const cache = fakeCache();
    const secure = fakeSecureStore();
    const refreshTokens = createRefreshTokenStore({ projectRef: 'testref', platform: 'ios', secureStore: secure.api, blockStore: fakeBlockStore({ available: false }).api });
    const storage = createSessionStorage({ cache, refreshTokens });

    await storage.setItem('sb-ref-auth-token', session('rt-a'));
    expect(cache.map.get('sb-ref-auth-token')).toBe(session('rt-a'));
    await expect(refreshTokens.load()).resolves.toMatchObject({ token: 'rt-a' });

    // Token rotation: the Keychain copy follows.
    await storage.setItem('sb-ref-auth-token', session('rt-b'));
    await expect(refreshTokens.load()).resolves.toMatchObject({ token: 'rt-b' });

    await expect(storage.getItem('sb-ref-auth-token')).resolves.toBe(session('rt-b'));
  });

  it('removeItem clears the cache only: a refresh hiccup must never wipe the reinstall-proof copy', async () => {
    const cache = fakeCache();
    const block = fakeBlockStore();
    const refreshTokens = createRefreshTokenStore({ projectRef: 'testref', platform: 'android', secureStore: fakeSecureStore().api, blockStore: block.api });
    const storage = createSessionStorage({ cache, refreshTokens });
    await storage.setItem('k', session('rt-c'));
    await storage.removeItem('k');
    expect(cache.map.size).toBe(0);
    await expect(storage.getItem('k')).resolves.toBeNull();
    await expect(refreshTokens.load()).resolves.toMatchObject({ token: 'rt-c' });
  });

  it('ignores auth-js housekeeping keys such as the PKCE code verifier', async () => {
    const cache = fakeCache();
    const refreshTokens = createRefreshTokenStore({ projectRef: 'testref', platform: 'ios', secureStore: fakeSecureStore().api, blockStore: fakeBlockStore({ available: false }).api });
    const storage = createSessionStorage({ cache, refreshTokens });
    await storage.setItem('sb-ref-auth-token', session('rt-d'));
    await storage.setItem('sb-ref-auth-token-code-verifier', session('rt-not-a-session'));
    await storage.removeItem('sb-ref-auth-token-code-verifier');
    await expect(refreshTokens.load()).resolves.toMatchObject({ token: 'rt-d' });
    expect(isSessionKey('sb-ref-auth-token')).toBe(true);
    expect(isSessionKey('sb-ref-auth-token-code-verifier')).toBe(false);
  });

  it('ignores values that are not a session', async () => {
    expect(extractRefreshToken('not json')).toBeNull();
    expect(extractRefreshToken('{"foo":1}')).toBeNull();
    expect(extractRefreshToken('{"refresh_token":""}')).toBeNull();
    expect(extractRefreshToken(session('x'))).toBe('x');
  });
});
