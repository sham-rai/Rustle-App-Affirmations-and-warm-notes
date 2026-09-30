---
id: M1-09
title: Consent screens, 18+ gate, consents rows
milestone: M1
state: ready
executor: subagent
model: opus
owner_files: [app/app/(onboarding)/age.tsx, app/app/(onboarding)/consent/**, app/features/consent/**, app/i18n/en.json, app/i18n/fr.json]
depends_on: [M1-02, M1-04]
pr:
---

## Goal
A neutral date-of-birth gate that blocks under-18s kindly with youth resources, and three separate consent screens that each write a versioned `consents` row, in EN and FR. The screen before the gate is the Rustle screen (M2-01, D42); there is no separate welcome screen.

## Spec
- docs/05 §3 (age gate)
- docs/11 §4.2 (consents), §4.4 (Apple AI consent), §5 (minors)
- docs/20 §7.5 (buttons), §10 (microcopy)
- docs/21 §1 criteria 1–4

## Out of scope
- The company splash, the Rustle screen and onboarding screens 1–5 (M2); the youth helpline numbers are copied from docs/11 §5 and marked 'verify at build'

## Risks and notes
- Consent copy is separate from ToS acceptance; declining AI processing ends onboarding kindly
- Under-18 block stores a local flag so there's no instant retry
- This ticket owns en.json and fr.json while it runs
- Store only `users.age_confirmed_at`; the picked date is discarded (D46)
- Under 18, and a declined AI-processing consent, call `deleteAnonymousAccount()` from M1-03 before the block or goodbye screen (its server side is the `delete_own_account()` RPC from migration 1, D47; no Edge Function is needed)
- The consent rows are written here, client-side through PostgREST under RLS; `/onboarding/complete` (M2-03) verifies they exist (docs/21 §1.3, §2.3)
- From the M2-01 review: the Rustle screen's footer shows only "Not a medical service." plus the AI line; this ticket adds the "get help now" link (`intro.crisis`, split with `app/features/intro/link-text.ts`) pointing at the crisis resources it builds, and routes Begin to the age gate (both spots carry a `TODO(M1-09)`)
- After `deleteAnonymousAccount()` (under 18, declined AI consent) call `resetIntroSeen()` from `app/features/intro/intro-seen.ts`, otherwise the next account created on this install skips the intro

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
