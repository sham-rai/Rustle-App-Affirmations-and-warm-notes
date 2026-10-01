import { createMMKV, type MMKV } from 'react-native-mmkv';

// The local "intro seen" flag (docs/05 §2, D46): once the Rustle screen has been passed, the
// company splash and the Rustle screen never replay on this install.

const INTRO_SEEN_KEY = 'intro.seen';

let storage: MMKV | undefined;
function store(): MMKV {
  storage ??= createMMKV({ id: 'rustle.intro' });
  return storage;
}

export function isIntroSeen(): boolean {
  return store().getBoolean(INTRO_SEEN_KEY) === true;
}

export function markIntroSeen(): void {
  store().set(INTRO_SEEN_KEY, true);
}

/**
 * A launch after sign-out shows the sequence again (docs/21 §1.0).
 * TODO(M2 account linking): call resetIntroSeen() from the sign-out path; there is none yet.
 */
export function resetIntroSeen(): void {
  store().remove(INTRO_SEEN_KEY);
}
