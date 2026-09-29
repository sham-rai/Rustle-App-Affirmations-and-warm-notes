---
id: M1-09
title: Consent screens, 18+ gate, consents rows
milestone: M1
state: ready
executor: subagent
model: opus
owner_files: [app/app/(onboarding)/welcome.tsx, app/app/(onboarding)/age.tsx, app/app/(onboarding)/consent/**, app/features/consent/**, app/i18n/en.json, app/i18n/fr.json]
depends_on: [M1-02, M1-04]
pr:
---

## Goal
The welcome screen, a neutral date-of-birth gate that blocks under-18s kindly with youth resources, and three separate consent screens that each write a versioned `consents` row, in EN and FR.

## Spec
- docs/05 §2 (welcome), §3 (age gate)
- docs/11 §4.2 (consents), §4.4 (Apple AI consent), §5 (minors)
- docs/20 §7.5 (buttons), §10 (microcopy)
- docs/21 §1 criteria 1–4

## Out of scope
- The company splash, the Rustle screen and onboarding screens 1–5 (M2); the youth helpline numbers are copied from docs/11 §5 and marked 'verify at build'

## Risks and notes
- Consent copy is separate from ToS acceptance; declining AI processing ends onboarding kindly
- Under-18 block stores a local flag so there's no instant retry
- This ticket owns en.json and fr.json while it runs

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
