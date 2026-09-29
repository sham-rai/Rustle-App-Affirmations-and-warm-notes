---
id: M1-03
title: Anonymous sign-in, Keychain / Block Store persistence, backup status
milestone: M1
state: ready
executor: lead
model: fable
owner_files: [app/lib/supabase.ts, app/lib/secure-storage/**, app/features/settings/backup-status.tsx, app/modules/block-store/**]
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

## Risks and notes
- iOS Keychain persistence is observed behaviour: test on the current iOS major and note the version in the report
- Android Block Store has no Expo module: a small native module or config plugin; prototype on two different Android phones (the PO does this)
- Fallback if Block Store fails: the recovery key path must still work
- Store the refresh token under a Keychain service / access group name that the iOS Notification Service Extension can read later (M4, doc 07 §6): choose the name now and put it in one constant; moving Keychain items later is painful. The entitlement for the shared access group can wait for the extension's own build.
- Anonymous sign-in stays on first launch, as doc 07 §5 specifies, so it happens before the 18+ gate. M1-09 must delete the anonymous account when the gate blocks; expose a `deleteAnonymousAccount()` in `app/lib/supabase.ts` for it.
- This ticket is auth only: no `users` row is written here. The trigger that mirrors `auth.users` into `users` arrives with M1-02, which runs after this ticket in the week plan; the backup-status screen must not depend on that row.
- The doc review of 2026-09-29 found nothing else that blocks this ticket.

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
