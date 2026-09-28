---
id: M1-02
title: Migration 1: schema, RLS, pgcrypto + Vault + views, pgTAP
milestone: M1
state: ready
executor: lead
model: fable
owner_files: [supabase/migrations/**, supabase/tests/**, packages/shared/schema/**]
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

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
