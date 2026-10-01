import { createMMKV, type MMKV } from 'react-native-mmkv';

// The local under-18 flag (docs/11 §5, docs/21 §1.2): once the gate has blocked on this install,
// the gate shows the youth-resources screen again instead of asking for another date, so there is
// no instant retry. It holds no date and no age, only that the gate blocked. A reinstall clears it.

const BLOCKED_KEY = 'age.blocked';

let storage: MMKV | undefined;
function store(): MMKV {
  storage ??= createMMKV({ id: 'rustle.consent' });
  return storage;
}

export function isAgeBlocked(): boolean {
  return store().getBoolean(BLOCKED_KEY) === true;
}

export function markAgeBlocked(): void {
  store().set(BLOCKED_KEY, true);
}

/** Tests only: the flag is never cleared in the app. */
export function clearAgeBlockedForTests(): void {
  store().remove(BLOCKED_KEY);
}
