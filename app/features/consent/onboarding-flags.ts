import { createMMKV, type MMKV } from 'react-native-mmkv';

// The consent feature's local flags for this install, on the same MMKV instance as the intro-seen
// flag (features/intro/intro-seen.ts). Neither holds a date, an age or an answer.
// - The under-18 flag (docs/11 §5, docs/21 §1.2): once the gate has blocked, the gate shows the
//   youth-resources screen again instead of asking for another date, so there is no instant retry.
//   It lasts until the app is reinstalled (confirmed by the PO).
// - The consents-complete flag: a local cache of what the server says (features/consent/
//   onboarding-state.ts). Set only once the server shows age confirmed and all three consents;
//   while it is unset, a launch asks the server where onboarding stands.

const BLOCKED_KEY = 'age.blocked';
const CONSENTS_COMPLETE_KEY = 'consents.complete';

let storage: MMKV | undefined;
function store(): MMKV {
  storage ??= createMMKV({ id: 'rustle.intro' });
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

export function isConsentsComplete(): boolean {
  return store().getBoolean(CONSENTS_COMPLETE_KEY) === true;
}

export function markConsentsComplete(): void {
  store().set(CONSENTS_COMPLETE_KEY, true);
}

export function resetConsentsComplete(): void {
  store().remove(CONSENTS_COMPLETE_KEY);
}
