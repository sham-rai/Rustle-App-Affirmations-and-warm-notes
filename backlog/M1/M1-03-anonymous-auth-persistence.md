---
id: M1-03
title: Anonymous sign-in, Keychain / Block Store persistence, backup status
milestone: M1
state: PR open (PO)
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
- Summary: first launch creates an anonymous account with no form (`ensureSession`: cached session → stored refresh token → `signInAnonymously`). The whole session is cached in an MMKV file encrypted with a key held in the Keychain / Keystore; the refresh token alone is copied to the reinstall-proof stores in the same write (Keychain service `app.rustle.session` in the App Group `group.app.rustle` on iOS; Keystore plus Google Block Store on Android through a small Expo local module in Kotlin). A refresh that fails for network reasons never creates a second account. `AuthProvider` runs the flow once from the root layout; the You tab shows the backup-status row (backed up with provider / not backed up / not connected) plus the short account id so a reinstall can be checked by eye. `deleteAnonymousAccount()` for M1-09, `generateRecoveryKey()` / `normalizeRecoveryKey()` / `hashRecoveryKey()` for the recovery-key path, `FUNCTION_REGION` so every Edge Function call is pinned to Canada Central.
- Files touched: `app/lib/supabase.ts`, `app/lib/secure-storage/{constants,refresh-token-store,session-cache,session-cache-store,index}.ts`, `app/lib/auth/{bootstrap,useAuthBootstrap,AuthProvider,recovery-key,index}.ts(x)`, `app/modules/block-store/**` (Kotlin module, TS wrapper, gradle, manifest, `expo-module.config.json`), `app/features/settings/backup-status.tsx`, `app/app/_layout.tsx` (AuthProvider), `app/app/(tabs)/you.tsx` (row), `app/components/EmptyTab.tsx` (optional children), `app/i18n/{en,fr}.json` (`settings.backup.*`), `app/app.json` (App Group entitlement), `app/package.json` (expo-crypto), `app/__mocks__/react-native-mmkv.ts`, tests under `app/lib/**/__tests__` and `app/features/settings/__tests__`, this ticket, `docs/13` §D.
- Commands run and results: `npm run typecheck` 0 · `npm run lint` 0 (ESLint, check-strings, check-contrast) · `npm test` 0 (app 13 suites / 72 tests, shared 22) · `deno check` n/a (no Edge Function code in this ticket) · `/code-review` and `/security-review` run; findings applied (below).
- Review round (lead + automated): the storage adapter no longer clears the reinstall-proof token on `removeItem` (auth-js removes the session on any non-retryable refresh error, which would have orphaned the account); only an explicit sign-out / deletion or a provably dead token (`refresh_token_not_found`, `refresh_token_already_used`, `session_not_found`) clears it, and a 429 or unknown 4xx keeps the token and reports `failed`. Block Store requests the cloud copy only when it confirms end-to-end encryption (screen lock present). The token key is namespaced by Supabase project ref so dev, staging and prod builds under the same App Group never share one. The bootstrap hook survives a remount and a thrown error (never stuck on loading); the backup row reads identities from the cached session (no network) and shows an "unavailable" line when the bootstrap failed. MMKV cache key: 96 bits. docs/07 §1 and §5 updated (no Auto Backup, no iCloud Keychain sync in the MVP).
- Criteria met / not verified: §3.1 met in code (anonymous user on first launch, no form; "all data syncs server-side" applies once M1-02 adds tables). §3.2 met in code for iOS (Keychain, access group) and Android (Block Store); **not verified on a device**: needs the dev Supabase project in `app/.env.local` and the first development build; the delete-and-reinstall test on the iPhone and on two Android phones is the PO's (docs/17 §6.2), and the iOS major must be recorded. §3.4 partly: the status row is in the You tab with "Backed up (provider)" / the warning; the "Protect them" button appears only once account linking exists (M2); recovery key generation and hashing exist, the server exchange (table + Edge Function) comes with M1-02 / account linking. The Kotlin module compiles only in the EAS Android build (no local Gradle run here): unverified until the first Android build.
- Deviations and why: (1) keychain access group is the App Group `group.app.rustle`, declared now in `app.json`, instead of a team-prefixed group later: no Keychain migration ever, and the widget needs the App Group anyway. (2) `expo-crypto` added (random bytes, SHA-256); native, rides the first build. (3) Android Auto Backup of the token deferred (docs/13 §D). (4) `EmptyTab` gained an optional `children` slot and `app/__mocks__/react-native-mmkv.ts` was added (the real package cannot load under Jest; the mock also lets M1-04's preferences module be tested for real later). (5) `deleteAnonymousAccount()` calls the `account-delete` Edge Function that M1-02 must provide; until then it wipes locally and reports `serverDeleted: false`. (6) iCloud Keychain sync is not enabled (expo-secure-store has no option for it); a new phone restores through account linking or the recovery key, as docs/07 §5 already says for that case.
- Edge cases (docs/07 §5 table): reinstall same iPhone → handled (Keychain); new phone with iCloud Keychain → n/a in the MVP (not synced, see 6); new phone without sync / Android without Block Store → deferred to linking + recovery key (M2); linking an existing account → M2; subscribe then reinstall → M2-05; inactive 24 months → server policy, M1-02; Hide My Email → M2.
