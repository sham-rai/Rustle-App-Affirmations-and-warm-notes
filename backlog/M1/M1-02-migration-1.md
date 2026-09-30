---
id: M1-02
title: Migration 1: schema, RLS, pgcrypto + Vault + views, pgTAP
milestone: M1
state: PR open
executor: lead
model: fable
owner_files: [supabase/migrations/**, supabase/tests/**, packages/shared/schema/**, packages/shared/enums.ts, supabase/config.toml]
depends_on: [M1-01]
pr:
---

## Goal
Every table in docs/07 §3 exists with RLS in the same migration, encrypted columns are readable only through decrypting views, and pgTAP proves isolation between users.

## Spec
- docs/07 §3 (schema), §8 (encryption, D29)
- docs/21 §0 criteria 3, 4
- docs/11 §4.2 (consents)

## Out of scope
- Seed personas beyond three test users; any Edge Function

## Risks and notes
- Column encryption must be in migration 1; retrofitting is the migration nobody wants
- Vault key rotation is a later ticket; document the procedure in the migration header
- PO go/no-go before merge (docs/22 §9)
- Fill `packages/shared/enums.ts`: `LIFE_AREAS` and `DELIVERY_INTENTS` exactly as doc 00 lists them (D46); the `notes.life_areas` and `deliveries.kind` check constraints use the same values
- Decrypting views per docs/07 §8 (D46): `security_invoker = true`, a `SECURITY DEFINER` decrypt function owned by postgres that never returns the key, `INSTEAD OF INSERT/UPDATE` triggers on the views for writes; pgTAP proves `authenticated` cannot read `vault.decrypted_secrets` and can read and write only its own rows through the views
- The two RLS exceptions (docs/07 §8): `entitlement_grants` deny-all for users; `warm_notes` sender-only plus the two `SECURITY DEFINER` RPCs by slug (read, thank); the RPCs are written here and tested with pgTAP
- `delivery_prefs` has no `per_day`: slots carry `{slot, time}` and frequency is one per slot (D46)
- The `llm_calls` cost-logging table is created in this migration (moved from M1-05, which keeps the code that writes to it)
- The trigger that mirrors `auth.users` into `users` lives here; M1-03 was coded without it
- Close the TODO in `supabase/config.toml`: create the dev project in ca-central-1 and note the `x-region` header for invocations

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary: one migration creates every table of docs/07 §3 with RLS enabled in the same file. The six encrypted columns (`notes.body`, `memory_items.content`, `memory_summary.summary`, `deliveries.body`, `replies.body`, `recaps.cards`) are `bytea` in base tables under a schema `enc` that PostgREST does not expose; `security_invoker` views with the glossary names in `public` decrypt on read and `INSTEAD OF INSERT/UPDATE/DELETE` triggers encrypt on write, so the app and the Edge Functions use one name per table. The key is a Vault secret read only by `enc.column_key()`, which only the two `SECURITY DEFINER` cipher functions (owned by postgres, `EXECUTE` for `authenticated` and `service_role` only) can call; the header documents rotation. `entitlement_grants`, `jobs`, `safety_events` and `llm_calls` are deny-all for users; `subscriptions` is read-only for the user; `users` and `consents` have column-level update grants; `anon` has no table privileges at all. `auth.users` is mirrored into `users` by trigger (insert, and the `is_anonymous` flip on linking). RPCs: `delete_own_account()` (cascade from `auth.users`), `warm_note_read(slug)` (page fields only, counts the view, honours revoked / expired / held) and `warm_note_thank(slug)` (once, queues the sender's push job). `packages/shared/enums.ts` holds `LIFE_AREAS` and `DELIVERY_INTENTS`; `scripts/check-enums.ts` (in `npm run lint`) fails if the SQL check constraints drift from them. Five pgTAP files cover the mirror and cascade, isolation between two users on every table (read, update, delete, forged insert), encryption (raw bytes, round-trips, key unreachable, `anon` locked out), deny-all and column grants, the enum constraints and the warm-note RPCs. A CI job (`db`) starts Postgres, applies the migration and runs the tests on every PR.
- Files touched: `supabase/migrations/20260930120000_migration_1.sql`, `supabase/tests/{010_users_mirror_and_delete,020_rls_isolation,030_encryption,040_deny_all_and_column_grants,050_warm_notes_rpcs}.sql`, `supabase/config.toml` (region note replaces the TODO), `packages/shared/enums.ts`, `packages/shared/__tests__/enums.test.ts`, `scripts/check-enums.ts`, `package.json` (`test:db`, `check:enums` in lint), `.github/workflows/ci.yml` (`db` job), `app/lib/supabase.ts` (`deleteAnonymousAccount` calls the RPC), `docs/07` §3 and §8, `docs/13` (D47), `backlog/M1/M1-09` (note), this ticket, the board.
- Commands run and results: `npm run typecheck` 0 · `npm run lint` 0 (ESLint, check-strings, check-contrast, check-enums) · `npm test` 0 (app 71, shared 25) · every SQL file parses with the Postgres 17 parser (libpg-query) · **`supabase test db` not run: Docker is not installed on the PO's Mac.** The CI `db` job on the PR is the first real run of the migration and the pgTAP suite; the lead fixes whatever it reports before asking for the go/no-go.
- Criteria met / not verified: docs/21 §0.3 written and tested in SQL (isolation on every table), unverified until CI runs; §0.4 written and tested (raw column is ciphertext, views read and write, `authenticated` and `anon` cannot read Vault), unverified until CI runs; the `x-region` note is in `config.toml`; **the dev project in ca-central-1 is not created (PO step)**, so `supabase db push` and the go/no-go on a real project are still open.
- Deviations and why: (1) Base tables live in an `enc` schema instead of `public.*_enc` so the glossary names stay the only names (D47). (2) `delete_own_account()` RPC replaces the `account-delete` Edge Function M1-03 expected: no deploy step, covered by pgTAP; `app/lib/supabase.ts` switched to `rpc()` (outside the owner files; one line, no other ticket touches it). (3) `users.last_opened_at` added for the 24-month rule; docs/07 §3 updated. (4) `llm_calls.user_id` is `on delete set null` so spend history survives account deletion with no personal data attached. (5) The enum-vs-SQL check is a lint script, not a shared test: `packages/shared` stays free of Node built-ins. (6) `.github/workflows/ci.yml`, `package.json` and `scripts/` edited outside the owner files for the CI job and the lint step. (7) `packages/shared/schema/**` (zod row schemas) left for the tickets that first write rows (M1-09, M2-02); nothing needs them yet. (8) `warm_note_thank()` queues a `warm_note_thanked` job for the sender's push; the dispatcher that sends it is M4.
