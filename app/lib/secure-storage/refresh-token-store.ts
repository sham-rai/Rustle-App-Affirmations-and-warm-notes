import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { BlockStore, type BlockStoreApi } from '../../modules/block-store';
import { KEYCHAIN_ACCESS_GROUP, KEYCHAIN_SERVICE, REFRESH_TOKEN_KEY } from './constants';

/** Where a restored refresh token came from (docs/07 §5 edge cases; reported, never logged with the token). */
export type RefreshTokenSource = 'keychain' | 'keystore' | 'block_store';

export interface StoredRefreshToken {
  token: string;
  source: RefreshTokenSource;
}

export interface RefreshTokenStore {
  save(token: string): Promise<void>;
  load(): Promise<StoredRefreshToken | null>;
  clear(): Promise<void>;
}

type SecureStoreApi = Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'>;

interface Deps {
  platform: 'ios' | 'android' | 'web' | 'windows' | 'macos';
  secureStore: SecureStoreApi;
  blockStore: BlockStoreApi;
  /** Called with a short reason string when a fallback path was taken. Never receives token material. */
  onWarning?: (reason: string) => void;
}

/**
 * Persists the Supabase refresh token so a reinstall restores the same account (docs/07 §5).
 * iOS: Keychain, AFTER_FIRST_UNLOCK, in the shared access group (survives reinstall on the same
 * phone; observed behaviour, tested per iOS major). Android: Keystore-backed SecureStore for the
 * running install plus Block Store for reinstalls, since Keystore keys die with the uninstall.
 */
export function createRefreshTokenStore(deps: Deps): RefreshTokenStore {
  const base: SecureStore.SecureStoreOptions = {
    keychainService: KEYCHAIN_SERVICE,
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  };
  const grouped: SecureStore.SecureStoreOptions =
    deps.platform === 'ios' ? { ...base, accessGroup: KEYCHAIN_ACCESS_GROUP } : base;
  const isAndroid = deps.platform === 'android';

  // If the access-group entitlement is missing from a build, the grouped write fails. Rather than
  // lose the session we fall back to the app's default group once and say so.
  let options = grouped;

  async function writeSecure(token: string): Promise<void> {
    try {
      await deps.secureStore.setItemAsync(REFRESH_TOKEN_KEY, token, options);
    } catch (error) {
      if (options === grouped && deps.platform === 'ios') {
        deps.onWarning?.('keychain_access_group_unavailable');
        options = base;
        await deps.secureStore.setItemAsync(REFRESH_TOKEN_KEY, token, options);
        return;
      }
      throw error;
    }
  }

  async function readSecure(): Promise<string | null> {
    try {
      const value = await deps.secureStore.getItemAsync(REFRESH_TOKEN_KEY, options);
      if (value !== null) return value;
    } catch {
      deps.onWarning?.('secure_store_read_failed');
    }
    if (options !== base) {
      // A build without the entitlement may have written to the default group earlier.
      try {
        return await deps.secureStore.getItemAsync(REFRESH_TOKEN_KEY, base);
      } catch {
        return null;
      }
    }
    return null;
  }

  return {
    async save(token) {
      await writeSecure(token);
      if (isAndroid) {
        try {
          await deps.blockStore.store(REFRESH_TOKEN_KEY, token);
        } catch {
          deps.onWarning?.('block_store_write_failed');
        }
      }
    },

    async load() {
      const secure = await readSecure();
      if (secure) return { token: secure, source: deps.platform === 'ios' ? 'keychain' : 'keystore' };
      if (isAndroid) {
        try {
          const fromBlockStore = await deps.blockStore.retrieve(REFRESH_TOKEN_KEY);
          if (fromBlockStore) return { token: fromBlockStore, source: 'block_store' };
        } catch {
          deps.onWarning?.('block_store_read_failed');
        }
      }
      return null;
    },

    async clear() {
      await Promise.allSettled([
        deps.secureStore.deleteItemAsync(REFRESH_TOKEN_KEY, options),
        deps.secureStore.deleteItemAsync(REFRESH_TOKEN_KEY, base),
        isAndroid ? deps.blockStore.remove(REFRESH_TOKEN_KEY) : Promise.resolve(false),
      ]);
    },
  };
}

let defaultStore: RefreshTokenStore | undefined;

/** The app-wide store, built from the real platform modules. */
export function getRefreshTokenStore(): RefreshTokenStore {
  defaultStore ??= createRefreshTokenStore({
    platform: Platform.OS,
    secureStore: SecureStore,
    blockStore: BlockStore,
  });
  return defaultStore;
}
