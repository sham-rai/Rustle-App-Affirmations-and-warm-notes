---
id: M1-04
title: i18n EN/FR, design tokens, ThemeProvider, tab skeleton
milestone: M1
state: ready
executor: subagent
model: opus
owner_files: [app/i18n/**, app/components/ThemeProvider.tsx, app/app/(tabs)/**, packages/shared/tokens.ts, app/lint/**]
depends_on: [M1-01]
pr:
---

## Goal
Switching the phone to French makes every string French, colours come only from tokens, dark mode follows the system, and the three tabs exist as empty screens.

## Spec
- docs/05 §1 (three tabs), §12 (dark mode default)
- docs/20 §3 (tokens), §4 (type scale), §10 (microcopy rules), §13, §15
- docs/21 §14, §17 criteria 1–2

## Out of scope
- Any real content on the tabs; premium themes

## Risks and notes
- Design at French length from the start (15–25% longer)
- Lint rules: no hex literals in components; no '!' and no 'affirmation' in string files; the CI contrast script on the token file
- The life-area chip strings belong to M2-02, not this ticket; only tab labels, the empty-tab copy and shared UI strings go into en.json/fr.json here.
- The doc review of 2026-09-29 found nothing that blocks this ticket.

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
