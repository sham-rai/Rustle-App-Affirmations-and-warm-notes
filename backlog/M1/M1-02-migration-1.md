---
id: M1-02
title: Migration 1: schema, RLS, pgcrypto + Vault + views, pgTAP
milestone: M1
state: in progress
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
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
