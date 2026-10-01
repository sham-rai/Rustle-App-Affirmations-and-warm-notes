---
id: M1-11
title: Migration 1 follow-ups from the D48 review
milestone: M1
state: PR open (PO)
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
- Summary: migration 2 (`20261001120000_migration_1_follow_ups.sql`) closes the eight follow-ups. (1) `warm_notes` moved to `enc.warm_notes` with `body_enc bytea` (the table was empty) and a `security_invoker` view `public.warm_notes` with INSTEAD OF triggers, the 220-character cap in the trigger and a 2 048-byte ciphertext cap on the base table; the sender's grants are unchanged (read, revoke, delete). (2) `warm_note_read()` is now STABLE and never writes, so PostgREST serves it on GET and link previews cannot inflate the counter; the page reports an open once through the new `warm_note_opened(slug)` (POST); `warm_note_thank()` unchanged in behaviour. (3) `users.timezone` is checked against `pg_timezone_names` by `is_valid_timezone()`: the strict list rather than a try of `at time zone`, because Postgres also accepts POSIX strings like `FOO5` there and the planner would not. (4) `notes.body` is capped at 2 000 characters in the view triggers and the ciphertext at 9 216 bytes on `enc.notes`, so a service-role writer cannot bypass the plaintext cap. (5) Catalog pgTAP: every table in `public` and `enc` has RLS; every SECURITY DEFINER function pins `search_path`; `anon` holds no privilege on any table or view; the policy-less tables are exactly the four deny-all ones; the seven `enc` tables each have a view and no plaintext column. (6) pgTAP cases that run as `service_role`: reads every user's notes in plaintext, writes deliveries, replies, the memory summary, the safety level, safety events, LLM calls, jobs, grants and warm notes through the views. (7) A hard-deleted note is removed from `memory_items.source_note_ids` (trigger as the caller, under RLS); a deleted account from `entitlement_grants.redeemed_by` (SECURITY DEFINER trigger, since the cascade may run as `supabase_auth_admin`). (8) The board query at 500 notes is timed in `070_catalog_and_follow_ups.sql` and printed as a `diag` line in the CI `db` job, with a 1.5 s guard.
- Files touched: `supabase/migrations/20261001120000_migration_1_follow_ups.sql` (new), `supabase/tests/070_catalog_and_follow_ups.sql` (new), `supabase/tests/050_warm_notes_rpcs.sql` (read no longer counts; opened counts once; ciphertext at rest; 221-character body rejected), `docs/07-technical-architecture.md` (§3 schema comment, §8 encryption list and the three RPCs), `docs/21-requirements.md` (§0.4 wording), this ticket.
- Commands run and results: every migration and test file parses with the Postgres 17 parser (libpg-query 17, 43 statements in migration 2, 70 in test 070); `npm run check:enums`, `check:api-schemas`, `check:strings` 0. `supabase test db` could not run (no Docker on this Mac); pgTAP runs in the CI `db` job on the PR and must be green before merge.
- Criteria met / not verified: docs/21 §0.4 (`warm_notes.body` encrypted, readable and writable through the view) met in SQL, proven by pgTAP once CI runs; §0.3 catalog invariants proven the same way; §11.3 (page-view counter only) now cannot be inflated by previews. Not verified: anything on a real project (`supabase db push` to rustle-dev is the PO's step); the 500-note timing figure is read from the CI log.
- Deviations and why: (1) The 2 000-character note limit is not in docs/05 §5, which has no input limit; 2 000 is my choice (about four paragraphs; check-ins are 280). The PO decides; the trigger constant is the only place to change. (2) `warm_note_opened` returns a boolean (true when a live note was counted) rather than void, so the page can tell a dead link from a counted open without a second call. (3) `is_valid_timezone` costs one scan of `pg_timezone_names` (about 1 200 rows) on every `users` update, including `last_opened_at` once per app open; a few milliseconds, accepted.
- Open questions: the note input limit above; whether the web page should call `warm_note_opened` from the client after render (the current plan) or from the server route after a successful render (simpler, but counts crawlers that render the page).
