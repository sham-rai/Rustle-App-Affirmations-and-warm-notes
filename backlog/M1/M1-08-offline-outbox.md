---
id: M1-08
title: Offline outbox for notes and check-ins
milestone: M1
state: ready
executor: subagent
model: opus
owner_files: [app/lib/outbox/**, app/lib/storage.ts, app/features/notes/api.ts]
depends_on: [M1-03]
pr:
---

## Goal
A note or check-in written with no connection appears immediately, is queued, and syncs with retry when the connection returns, including an edit made while offline.

## Spec
- docs/07 §1 (MMKV cache + outbox), §4.2 step 1
- docs/21 §5 criterion 2
- docs/17 §6.2 (plane test)

## Out of scope
- The board UI itself (M3); conflict resolution beyond last-write-wins

## Risks and notes
- Idempotency key per queued write so a retry never duplicates a note
- Log board_note_created.offline = true
- MMKV is encrypted with a random key held in secure storage (docs/07 §8, D46); losing the key on an Android uninstall is fine because the cache is re-fetchable

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary: Notes and check-ins are written through an offline outbox. A write goes into the TanStack Query cache at once (`pending: true`). It is queued in an encrypted MMKV file (`rustle.data`) under an idempotency key, and the client-generated row id is the create's key. A worker sends the queue in order per row: it retries with exponential backoff and jitter (2 s up to 5 min), and when the connection returns it ends every backoff and flushes. Permanent errors drop the write with a typed `OutboxError` (ids, kind, status, code; no text). An offline edit is folded into a queued create or edit; an edit to a synced note is queued as a separate update; last write wins. Deleting a note that never left the device just removes it from the queue. Deleting a note that may be on the server queues a soft delete (`deleted_at`). The queue is persisted after every change, so it survives an app kill, and it is checked with zod on load.
- Files touched: `app/lib/storage.ts`; `app/lib/outbox/{types,queue,worker,transport,connectivity,outbox,index}.ts`; `app/lib/outbox/__tests__/{harness.ts,outbox.test.ts,notes-api.test.ts}`; `app/features/notes/api.ts`; `app/app/_layout.tsx` (an import plus one `startOutbox()` call at module level, a no-op while Supabase is not configured); `app/package.json` + `package-lock.json` (`expo-network ~57.0.2` via `npx expo install`).
- Commands run and results: `npm ci` ok. `npm run typecheck` ok. `npm run lint` ok (eslint plus all check scripts). `npm test`: the outbox suites pass (17 tests in `outbox.test.ts`, 4 in `notes-api.test.ts`). In the first full run, two existing intro suites (`launch-gate`, `intro-screens.fr`) hit Jest's 5 s timeout while the machine's load average was about 300 to 490. Run alone, both passed. The full rerun of `npm test` then passed: app 21 suites, 125 tests; shared 3 suites, 25 tests.
- Criteria met / not verified: docs/21 §5 criterion 2 is met in unit tests: a note written offline shows at once, is queued and syncs on reconnect, including an offline edit. The rest of the brief is also met in unit tests: retry on a transient failure, an idempotent re-send (same key, one row, also for check-ins), a coalesced edit, deleting a queued item, a persisted queue across a simulated restart, a permanent RLS denial dropped with a typed error, and order per note. Logging `board_note_created.offline = true` is not wired. The outbox exposes `onEvent`, and its `synced` event for a `note_create` carries `item.createdOffline` for the analytics ticket to log. The plane test on a real phone (docs/17 §6.2) is not verified. The worker has not been tested against a real Supabase project. It needs a native rebuild for `expo-network`.
- Deviations and why: (1) The outbox does not upsert. A PostgREST upsert needs a unique index on its target, and `notes` is a view with INSTEAD OF triggers. Instead the client inserts, and a 23505 means an earlier attempt landed: the queued fields are then written as an update by id (notes) or counted as done (check-ins). (2) Delete is a soft delete through `deleted_at` (an update column grant), not a hard `DELETE`. (3) `app/lib/storage.ts` reuses `loadSessionCacheKey()`, the existing Keychain/Keystore key, for a second MMKV file. That avoids a second key-management path but means both files share one key. (4) The two test helpers sit in `app/lib/outbox/__tests__`, including the test of `features/notes/api.ts`, because `features/notes/__tests__` is outside owner_files. (5) Lead review fixes: the outbox flushes when the session arrives or refreshes (`SIGNED_IN`, `INITIAL_SESSION` with a session, `TOKEN_REFRESHED`) and when the app returns to the foreground (`lib/outbox/triggers.ts`). An offline-first `QueryClientProvider` wraps the root layout. Note bodies are capped at 2 000 characters and check-in lines at 280; going over throws `NoteTooLongError` / `CheckinLineTooLongError` before anything is queued. After these fixes, `npm test -- --maxWorkers=2` passed: app 22 suites, 130 tests; shared 3 suites, 25 tests.
- Open questions: answered by the lead: soft delete stays (the hard purge is a later server job), the shared MMKV key is fine, and the session and foreground flush is added.
