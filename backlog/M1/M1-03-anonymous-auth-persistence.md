---
id: M1-03
title: Anonymous sign-in, Keychain / Block Store persistence, backup status
milestone: M1
state: in progress
executor: lead
model: fable
owner_files: [app/lib/supabase.ts, app/lib/secure-storage/**, app/lib/auth/**, app/features/settings/**, app/modules/block-store/**, app/.env.example, app/app.json (plugins and ios.entitlements only), app/package.json (expo-crypto only), app/app/_layout.tsx (auth bootstrap wiring only, after M1-04), app/app/(tabs)/you.tsx (backup status row only, after M1-04)]
depends_on: [M1-01]
pr:
---

## Goal
A first launch creates an anonymous account with no form, and a delete-and-reinstall on the same phone restores the same account on iOS and on Android.

## Spec
- docs/07 §5 (accounts, edge cases)
- docs/21 §3 criteria 1, 2, 4
- docs/17 §5 day 3, §6.2

## Out of scope
- Sign in with Apple / Google linking UI and merge (M2); the recovery key UI beyond generation

## Decisions already taken (PO and lead, 2026-09-29)
- Bundle identifier `app.rustle`. Keychain service name `app.rustle.session`. The shared keychain access group is the App Group `group.app.rustle` (an App Group name works as a keychain access group with no team-ID prefix, and the widget needs the same App Group for its storage), in one constant (`app/lib/secure-storage/constants.ts`). The App Group entitlement is declared in `app.json` from this ticket, so no Keychain migration is ever needed; EAS syncs the capability.
- No Supabase dev project exists yet: the client reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `app/.env.local`; with either missing the app shows the backup-status screen in a "not connected" state instead of crashing. Unit tests mock the Supabase client. The reinstall test on a device is the PO's, once the project exists.
- `expo-crypto` is added in this ticket (native, so it rides the same first development build): random bytes for the MMKV cache key and the recovery key, SHA-256 for the recovery-key hash.
- The cached session lives in an MMKV file encrypted with a key held in the Keychain / Keystore; only the refresh token goes to the reinstall-proof stores (Keychain access group on iOS, Block Store on Android), written in the same call that caches the session so the copies never drift across a token rotation.
- Android Auto Backup of an encrypted token (docs/07 §5) is deferred: without a key that survives the uninstall it adds nothing over Block Store. Logged in docs/13 §D.
- The backup-status screen ships its strings as a `settings.backup.*` block appended to `en.json` / `fr.json` after M1-04 merges; the screen is written last in this ticket for that reason.

## Risks and notes
- iOS Keychain persistence is observed behaviour: test on the current iOS major and note the version in the report
- Android Block Store has no Expo module: a small native module or config plugin; prototype on two different Android phones (the PO does this)
- Fallback if Block Store fails: the recovery key path must still work
- Store the refresh token under a Keychain service / access group name that the iOS Notification Service Extension can read later (M4, doc 07 §6): choose the name now and put it in one constant; moving Keychain items later is painful. The entitlement for the shared access group can wait for the extension's own build.
- Anonymous sign-in stays on first launch, as doc 07 §5 specifies, so it happens before the 18+ gate. M1-09 must delete the anonymous account when the gate blocks; expose a `deleteAnonymousAccount()` in `app/lib/supabase.ts` for it.
- This ticket is auth only: no `users` row is written here. The trigger that mirrors `auth.users` into `users` arrives with M1-02, which runs after this ticket in the week plan; the backup-status screen must not depend on that row.
- The doc review of 2026-09-29 found nothing else that blocks this ticket.

## Questions for the PO
- none open

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
