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
- Summary:
  - **Writes.** Notes and check-ins are written through an offline outbox. A write goes into the TanStack Query cache at once (`pending: true`). It is validated with zod and queued in an encrypted MMKV file (`rustle.data`) under an idempotency key; the client-generated row id is the create's key.
  - **Sending.** A worker sends the queue in order per row. It checks connectivity on every run, and checks that a session exists before counting an attempt. Transient failures retry with exponential backoff and jitter (2 s up to 5 min). The queue is sent again when the connection returns, when the session arrives or refreshes, and when the app comes to the foreground.
  - **Permanent errors.** These drop the write with a typed `OutboxError` (ids, kind, status, code; no text).
  - **Edits and deletes.** An offline edit is folded into the queued create or edit; an edit to a synced note is a separate update; last write wins. Deleting a note that never left the device removes it from the queue. Otherwise a soft delete (`deleted_at`) is queued.
  - **Persistence.** The queue is saved after every change, so it survives an app kill. Unreadable items are dropped and reported by count only.
  - **Events.** `onEvent` emits `enqueued`, `synced` and `dropped`. Events carry only `{ kind, entityId, key, createdOffline }` (plus the error on `dropped`), never note or check-in text.
  - **Query cache.** The cache follows these events: a note sync or drop refetches the notes, a synced check-in loses `pending`, and a dropped check-in is removed. An offline-first `QueryClientProvider` wraps the root layout.
  - **Length caps.** Note bodies are capped at 2 000 characters and check-in lines at 280, before anything is queued. Rows already on the server are read without the cap.
- Files touched:
  - `app/lib/storage.ts`
  - `app/lib/outbox/{types,queue,worker,transport,connectivity,triggers,outbox,index}.ts`
  - `app/lib/outbox/__tests__/{harness.ts,outbox.test.ts,notes-api.test.ts,triggers.test.ts}`
  - `app/features/notes/api.ts`
  - `app/app/_layout.tsx`: the `startOutbox()` call and the `QueryClientProvider`
  - `app/package.json` and `package-lock.json`: `expo-network ~57.0.2`, via `npx expo install`
  - this report
- Commits:
  - First pass:
    - c807608: expo-network
    - b9d61fd: app-data MMKV store
    - 7a1876f: queue
    - 1fc1c92: worker, transport and connectivity
    - 0388ff4: notes api
    - db68eb4: outbox start in the root layout
    - 7c0395e: tests
    - 143de46 and ea07dda: report
  - Review round 1:
    - 98ac0c0: flush on session and foreground
    - b68de18: `QueryClientProvider`
    - 8f34717: length caps with `NoteTooLongError` / `CheckinLineTooLongError`
  - Review round 2:
    - 043d0f1: lenient server rows, `parseNoteRows`
    - 6b3bd0e: op validation, `InvalidOutboxOpError`, `undefined` stripped from patches
    - c8d9c71: connectivity re-read each run with a race guard; `canSend()` before an attempt
    - 7a84c4d: text-free events; `entityIdOf` in the worker
    - ac1060f: notes refetch on sync; pending cleared on synced check-ins
    - 36b4b73: `onUnreadable` count warning
    - f9f28fb: comment on `NOTE_BODY_MAX_CHARS`
- Commands run and results:
  - `npm ci`: ok.
  - First pass: `npm run typecheck` and `npm run lint` passed. On the first full `npm test`, two existing intro suites (`launch-gate`, `intro-screens.fr`) hit Jest's 5 s timeout while the machine's load average was 300 to 490. Both passed when run alone, and the full rerun passed: app 21 suites / 125 tests, shared 3 / 25.
  - Review round 1: `npm run typecheck`, `npm run lint` and `npm test -- --maxWorkers=2` passed: app 22 suites / 130 tests, shared 3 / 25.
  - Review round 2: `npm run typecheck`, `npm run lint` and `npm test -- --maxWorkers=2 --testTimeout=120000` passed: app 22 suites / 138 tests, shared 3 / 25.
- Criteria met / not verified:
  - Met in unit tests against a mocked Supabase client:
    - docs/21 §5 criterion 2: a note written offline shows at once, is queued and syncs on reconnect, including an offline edit.
    - Retry on a transient failure.
    - An idempotent re-send: same key, one row, for notes and for check-ins.
    - A coalesced edit, and deleting a queued item.
    - A queue persisted across a simulated restart, including an edit with `undefined` fields.
    - A permanent RLS denial dropped with a typed error, and order per note.
    - A write made before the session sends within the same tick once the session arrives.
    - A stale offline reading does not block a foreground retry.
  - Not wired here: `board_note_created.offline` is not logged yet. The `synced` event carries `createdOffline`, and the lead connects it at integration with M1-05.
  - Not verified:
    - The plane test on a real phone (docs/17 §6.2). This also needs a native rebuild for `expo-network`.
    - Any run against a real Supabase project.
- Deviations and why:
  1. No upsert. A PostgREST upsert needs a unique index on its target, and `notes` is a view. Instead the client inserts, and a 23505 means an earlier attempt landed: notes then get an update by id, check-ins count as done.
  2. Delete is a soft delete through `deleted_at`.
  3. `storage.ts` reuses the session cache key, so there is one key path.
  4. The test of `features/notes/api.ts` lives in `app/lib/outbox/__tests__`, because `features/notes/__tests__` is outside owner_files.
  5. A dropped check-in is removed from the checkins cache.
  
  The lead accepted all five.
- Open questions: none. The lead answered all of them: soft delete stays (the hard purge is a later server job), the shared MMKV key is fine, and the session and foreground flush was added.
