import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

interface NativeBlockStore {
  store(key: string, value: string): Promise<boolean>;
  retrieve(key: string): Promise<string | null>;
  remove(key: string): Promise<boolean>;
  isEndToEndEncryptionAvailable(): Promise<boolean>;
}

/** What the app sees. Every method is safe to call on any platform. */
export interface BlockStoreApi {
  /** True only on Android with Google Play services and the native module linked. */
  isAvailable(): boolean;
  /** Resolves false when Block Store is unavailable; rejects when the platform call fails. */
  store(key: string, value: string): Promise<boolean>;
  /** Resolves null when unavailable or when nothing is stored under the key. */
  retrieve(key: string): Promise<string | null>;
  remove(key: string): Promise<boolean>;
  isEndToEndEncryptionAvailable(): Promise<boolean>;
}

const native: NativeBlockStore | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<NativeBlockStore>('RustleBlockStore') : null;

export const BlockStore: BlockStoreApi = {
  isAvailable: () => native !== null,
  store: (key, value) => (native ? native.store(key, value) : Promise.resolve(false)),
  retrieve: (key) => (native ? native.retrieve(key) : Promise.resolve(null)),
  remove: (key) => (native ? native.remove(key) : Promise.resolve(false)),
  isEndToEndEncryptionAvailable: () =>
    native ? native.isEndToEndEncryptionAvailable() : Promise.resolve(false),
};
