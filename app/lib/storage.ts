import { createMMKV } from 'react-native-mmkv';

import type { KeyValueStore } from './secure-storage';
import { loadSessionCacheKey } from './secure-storage/session-cache-store';

/** MMKV instance id for app data (the offline outbox now; cached server data later). */
export const APP_DATA_CACHE_ID = 'rustle.data';

let appStorage: KeyValueStore | undefined;

/**
 * The encrypted on-disk store for app data, a separate MMKV file from the session cache
 * (`rustle.session`). It is encrypted with the same random key held in the Keychain / Keystore
 * (docs/07 §8, D46), loaded by the session cache helper, so there is one key-management path.
 * Losing that key on an Android uninstall is fine: the file dies with the install too, and the
 * cached data is re-fetchable.
 */
export function getAppStorage(): KeyValueStore {
  appStorage ??= createMMKV({ id: APP_DATA_CACHE_ID, encryptionKey: loadSessionCacheKey() });
  return appStorage;
}
