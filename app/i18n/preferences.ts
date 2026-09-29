import { createMMKV, type MMKV } from 'react-native-mmkv';

// The one place that reads and writes the "tu" / "vous" preference.
// Kept tiny so tests can mock it; the settings UI arrives with onboarding (M1-04 out of scope).

export type Address = 'tu' | 'vous';

export const DEFAULT_ADDRESS: Address = 'tu';
const ADDRESS_KEY = 'i18n.address';

let storage: MMKV | undefined;
function prefs(): MMKV {
  storage ??= createMMKV({ id: 'rustle.preferences' });
  return storage;
}

function isAddress(value: unknown): value is Address {
  return value === 'tu' || value === 'vous';
}

export function getAddress(): Address {
  const stored = prefs().getString(ADDRESS_KEY);
  return isAddress(stored) ? stored : DEFAULT_ADDRESS;
}

export function setAddress(address: Address): void {
  prefs().set(ADDRESS_KEY, address);
}

/** Calls `onChange` whenever the address changes; returns the unsubscribe function. */
export function subscribeAddress(onChange: () => void): () => void {
  const listener = prefs().addOnValueChangedListener((key) => {
    if (key === ADDRESS_KEY) onChange();
  });
  return () => listener.remove();
}
