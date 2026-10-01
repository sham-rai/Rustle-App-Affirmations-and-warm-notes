import { createMMKV, type MMKV } from 'react-native-mmkv';

// Two local onboarding flags for this install. Neither holds a date, an age or an answer.
// - The under-18 flag (docs/11 §5, docs/21 §1.2): once the gate has blocked, the gate shows the
//   youth-resources screen again instead of asking for another date, so there is no instant retry.
//   It lasts until the app is reinstalled (confirmed by the PO).
// - The consents-complete flag: set once the third consent's row is written, so a launch whose
//   session was restored from this install's cache knows whether the gate and consents are done.

const BLOCKED_KEY = 'age.blocked';
const CONSENTS_COMPLETE_KEY = 'consents.complete';

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

export function isConsentsComplete(): boolean {
  return store().getBoolean(CONSENTS_COMPLETE_KEY) === true;
}

export function markConsentsComplete(): void {
  store().set(CONSENTS_COMPLETE_KEY, true);
}

export function resetConsentsComplete(): void {
  store().remove(CONSENTS_COMPLETE_KEY);
}
