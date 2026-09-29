import { KEYCHAIN_ACCESS_GROUP, KEYCHAIN_SERVICE, REFRESH_TOKEN_KEY } from '../constants';
import { createRefreshTokenStore } from '../refresh-token-store';
import { fakeBlockStore, fakeSecureStore } from './fakes';

describe('refresh token store', () => {
  it('iOS: writes to the Keychain service in the shared access group and reads it back', async () => {
    const secure = fakeSecureStore();
    const block = fakeBlockStore({ available: false });
    const store = createRefreshTokenStore({ platform: 'ios', secureStore: secure.api, blockStore: block.api });

    await store.save('rt-1');

    expect(secure.items.get(`${KEYCHAIN_SERVICE}|${KEYCHAIN_ACCESS_GROUP}|${REFRESH_TOKEN_KEY}`)).toBe('rt-1');
    expect(block.calls.store).toBe(0);
    await expect(store.load()).resolves.toEqual({ token: 'rt-1', source: 'keychain' });
  });

  it('iOS: falls back to the default group once when the entitlement is missing, and says so', async () => {
    const secure = fakeSecureStore({ failGrouped: true });
    const warnings: string[] = [];
    const store = createRefreshTokenStore({
      platform: 'ios',
      secureStore: secure.api,
      blockStore: fakeBlockStore({ available: false }).api,
      onWarning: (r) => warnings.push(r),
    });

    await store.save('rt-2');

    expect(warnings).toEqual(['keychain_access_group_unavailable']);
    expect(secure.items.get(`${KEYCHAIN_SERVICE}||${REFRESH_TOKEN_KEY}`)).toBe('rt-2');
    await expect(store.load()).resolves.toEqual({ token: 'rt-2', source: 'keychain' });
  });

  it('Android: writes to the Keystore and to Block Store; a fresh install reads from Block Store', async () => {
    const block = fakeBlockStore();
    const first = createRefreshTokenStore({ platform: 'android', secureStore: fakeSecureStore().api, blockStore: block.api });
    await first.save('rt-3');
    expect(block.items.get(REFRESH_TOKEN_KEY)).toBe('rt-3');
    await expect(first.load()).resolves.toEqual({ token: 'rt-3', source: 'keystore' });

    // Reinstall: Keystore is empty, Block Store survived.
    const reinstalled = createRefreshTokenStore({ platform: 'android', secureStore: fakeSecureStore().api, blockStore: block.api });
    await expect(reinstalled.load()).resolves.toEqual({ token: 'rt-3', source: 'block_store' });
  });

  it('Android: a Block Store failure never loses the Keystore copy', async () => {
    const warnings: string[] = [];
    const store = createRefreshTokenStore({
      platform: 'android',
      secureStore: fakeSecureStore().api,
      blockStore: fakeBlockStore({ failing: true }).api,
      onWarning: (r) => warnings.push(r),
    });
    await store.save('rt-4');
    await expect(store.load()).resolves.toEqual({ token: 'rt-4', source: 'keystore' });
    expect(warnings).toEqual(['block_store_write_failed']);
  });

  it('clear removes every copy', async () => {
    const secure = fakeSecureStore();
    const block = fakeBlockStore();
    const store = createRefreshTokenStore({ platform: 'android', secureStore: secure.api, blockStore: block.api });
    await store.save('rt-5');
    await store.clear();
    expect(secure.items.size).toBe(0);
    expect(block.items.size).toBe(0);
    await expect(store.load()).resolves.toBeNull();
  });
});
