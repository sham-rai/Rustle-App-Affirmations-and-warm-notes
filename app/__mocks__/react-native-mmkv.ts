// Jest manual mock for react-native-mmkv: the real package needs the native Nitro runtime at
// import time. Picked up automatically for every test (Jest's node-module mock convention).
type Listener = { remove(): void };

class MemoryMMKV {
  readonly id: string;
  private readonly map = new Map<string, string | number | boolean>();
  private readonly listeners = new Set<(key: string) => void>();

  constructor(id: string) {
    this.id = id;
  }
  set(key: string, value: string | number | boolean): void {
    this.map.set(key, value);
    for (const listener of this.listeners) listener(key);
  }
  getString(key: string): string | undefined {
    const value = this.map.get(key);
    return typeof value === 'string' ? value : undefined;
  }
  getNumber(key: string): number | undefined {
    const value = this.map.get(key);
    return typeof value === 'number' ? value : undefined;
  }
  getBoolean(key: string): boolean | undefined {
    const value = this.map.get(key);
    return typeof value === 'boolean' ? value : undefined;
  }
  contains(key: string): boolean {
    return this.map.has(key);
  }
  remove(key: string): boolean {
    const existed = this.map.delete(key);
    for (const listener of this.listeners) listener(key);
    return existed;
  }
  getAllKeys(): string[] {
    return [...this.map.keys()];
  }
  clearAll(): void {
    this.map.clear();
  }
  addOnValueChangedListener(listener: (key: string) => void): Listener {
    this.listeners.add(listener);
    return { remove: () => this.listeners.delete(listener) };
  }
}

const instances = new Map<string, MemoryMMKV>();

export function createMMKV(configuration?: { id?: string }): MemoryMMKV {
  const id = configuration?.id ?? 'mmkv.default';
  let instance = instances.get(id);
  if (!instance) {
    instance = new MemoryMMKV(id);
    instances.set(id, instance);
  }
  return instance;
}

export type MMKV = MemoryMMKV;
