import type { Address } from '../preferences';

// In-memory stand-in for the MMKV-backed preference (MMKV needs the native Nitro module).
// Use with `jest.mock('<path>/i18n/preferences')`.

export type { Address } from '../preferences';
export const DEFAULT_ADDRESS: Address = 'tu';

let address: Address = DEFAULT_ADDRESS;
const listeners = new Set<() => void>();

export function getAddress(): Address {
  return address;
}

export function setAddress(next: Address): void {
  address = next;
  listeners.forEach((listener) => listener());
}

export function subscribeAddress(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
