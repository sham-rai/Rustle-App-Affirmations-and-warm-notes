import type * as SecureStore from 'expo-secure-store';

import type { BlockStoreApi } from '../../../modules/block-store';
import type { KeyValueStore } from '../session-cache';

type SecureStoreApi = Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'>;

/** In-memory Keychain/Keystore keyed by service + access group + key, as the real one is. */
export function fakeSecureStore(opts: { failGrouped?: boolean } = {}) {
  const items = new Map<string, string>();
  const id = (key: string, o?: SecureStore.SecureStoreOptions) =>
    `${o?.keychainService ?? ''}|${o?.accessGroup ?? ''}|${key}`;
  const api: SecureStoreApi = {
    async getItemAsync(key, o) {
      return items.get(id(key, o)) ?? null;
    },
    async setItemAsync(key, value, o) {
      if (opts.failGrouped && o?.accessGroup) throw new Error('errSecMissingEntitlement');
      items.set(id(key, o), value);
    },
    async deleteItemAsync(key, o) {
      items.delete(id(key, o));
    },
  };
  return { api, items };
}

export function fakeBlockStore(opts: { available?: boolean; failing?: boolean } = {}) {
  const items = new Map<string, string>();
  const calls = { store: 0, retrieve: 0, remove: 0 };
  const available = opts.available ?? true;
  const api: BlockStoreApi = {
    isAvailable: () => available,
    async store(key, value) {
      calls.store += 1;
      if (opts.failing) throw new Error('no play services');
      if (!available) return false;
      items.set(key, value);
      return true;
    },
    async retrieve(key) {
      calls.retrieve += 1;
      if (opts.failing) throw new Error('no play services');
      return items.get(key) ?? null;
    },
    async remove(key) {
      calls.remove += 1;
      return items.delete(key);
    },
    async isEndToEndEncryptionAvailable() {
      return available;
    },
  };
  return { api, items, calls };
}

export function fakeCache(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getString: (k) => map.get(k),
    set: (k, v) => {
      map.set(k, v);
    },
    remove: (k) => map.delete(k),
  };
}
