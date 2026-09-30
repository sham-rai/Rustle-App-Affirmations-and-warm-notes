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
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
