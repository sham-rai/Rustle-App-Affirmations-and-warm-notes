---
id: M1-11
title: Migration 1 follow-ups from the D48 review
milestone: M1
state: ready
executor: lead
model: fable
owner_files: [supabase/migrations/**, supabase/tests/**, docs/07-technical-architecture.md]
depends_on: [M1-02]
pr:
---

## Goal
Close the review findings on migration 1 that were not worth holding the merge for, in one small migration with pgTAP, before any ticket writes the rows they touch.

## Spec
- docs/07 §3, §8 (warm_notes.body encrypted, D48)
- docs/21 §0.3–0.4, §11
- The M1-02 report, "Third review round", last sentence

## Scope
- `warm_notes.body` moves to an `enc.warm_notes` base table with a decrypting view, like the other six columns; `warm_note_read()` decrypts server-side. Must land before M5 writes any warm note (the table is empty until then, so this is cheap now).
- Split `warm_note_read()` into a read (no side effect; PostgREST GET RPCs are read-only) and a `warm_note_opened()` counter the page calls once, so bots and link previews do not inflate `opened_count`.
- `users.timezone` validity check (a function that tries `now() at time zone tz`), so one bad value cannot break the planner for a shard.
- A length cap on `notes.body` (the input limit lives in docs/05 §5; cap at the ciphertext length).
- Catalog pgTAP: every table in `public` and `enc` has RLS enabled; every `SECURITY DEFINER` function sets `search_path`; `anon` has no table privileges.
- pgTAP cases that run as `service_role`, not `postgres`, for the server-written tables.
- On note hard-delete, purge the id from `memory_items.source_note_ids`; on account delete, from `entitlement_grants.redeemed_by`.
- Measure the per-row decrypt cost on the board query at 500 notes (the M1-02 report's "known cost").

## Out of scope
- Key rotation (its own ticket when the first rotation is due)

## Questions for the PO
- none

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
