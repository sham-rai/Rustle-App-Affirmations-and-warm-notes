import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createMMKV } from 'react-native-mmkv';

import { KEYCHAIN_ACCESS_GROUP, KEYCHAIN_SERVICE, SESSION_CACHE_ID, SESSION_CACHE_KEY_NAME } from './constants';
import type { KeyValueStore } from './session-cache';

// Kept apart from session-cache.ts: react-native-mmkv needs the native runtime at import time,
// so nothing a unit test imports may pull it in.

const CACHE_KEY_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: KEYCHAIN_SERVICE,
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

/** 16 characters, the MMKV maximum: 8 random bytes as hex. Local cache key only. */
function newCacheKey(): string {
  return Array.from(Crypto.getRandomBytes(8), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Loads (or creates) the MMKV encryption key from the Keychain / Keystore. Synchronous on purpose:
 * the Supabase client is built once at startup and everything else waits on it.
 */
export function loadSessionCacheKey(): string {
  const options: SecureStore.SecureStoreOptions = { ...CACHE_KEY_OPTIONS, accessGroup: KEYCHAIN_ACCESS_GROUP };
  const read = (opts: SecureStore.SecureStoreOptions): string | null => {
    try {
      return SecureStore.getItem(SESSION_CACHE_KEY_NAME, opts);
    } catch {
      return null;
    }
  };
  const existing = read(options) ?? read(CACHE_KEY_OPTIONS);
  if (existing) return existing;
  const key = newCacheKey();
  try {
    SecureStore.setItem(SESSION_CACHE_KEY_NAME, key, options);
  } catch {
    SecureStore.setItem(SESSION_CACHE_KEY_NAME, key, CACHE_KEY_OPTIONS);
  }
  return key;
}

/** The encrypted on-disk cache for the session, built from the real modules. */
export function openSessionCache(): KeyValueStore {
  return createMMKV({ id: SESSION_CACHE_ID, encryptionKey: loadSessionCacheKey() });
}
