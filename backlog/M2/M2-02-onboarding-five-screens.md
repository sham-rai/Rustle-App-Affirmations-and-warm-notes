---
id: M2-02
title: Onboarding: five screens, answers held locally
milestone: M2
state: ready
executor: subagent
model: opus
owner_files: [app/app/(onboarding)/steps/**, app/features/onboarding/**, app/i18n/en.json, app/i18n/fr.json]
depends_on: [M1-04, M1-09]
pr:
---

## Goal
The five onboarding screens from docs/05 §3, with chips at French length, the five mood marks, the tu/vous choice for French users, every open field skippable, answers kept in local state until completion.

## Spec
- docs/05 §3 (screens, storage), doc 20 §7.4 (marks), §7.6 (chips), §7.7 (progress line), §10 (microcopy)
- docs/21 §2 criteria 1–2

## Out of scope
- Calling /onboarding/complete (M2-03); the first note; memory extraction

## Risks and notes
- Own en.json/fr.json while running; French copy written natively, reviewed later
- No step numbers; a thin progress line
- Dictation via the system keyboard only

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
