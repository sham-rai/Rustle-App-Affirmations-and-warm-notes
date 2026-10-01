---
id: M1-05
title: Sentry, PostHog, first events, cost-logging table
milestone: M1
state: ready
executor: subagent
model: sonnet
owner_files: [app/lib/analytics.ts, app/lib/sentry.ts, supabase/functions/_shared/cost/**]
depends_on: [M1-01, M1-02]
pr:
---

## Goal
A test crash reaches Sentry with bodies scrubbed, `app_opened` reaches PostHog with no content properties, and an `llm_calls` table is ready to receive per-call cost rows.

## Spec
- docs/12 §4 (events, prefixes)
- docs/07 §7 (cost logging), §10 (observability)
- docs/21 §16 criteria 1–2

## Out of scope
- Dashboards; the full event list (added per feature)

## Risks and notes
- A test must assert that no analytics property is free text
- PostHog in the EU cloud with IP anonymisation; Sentry request bodies scrubbed
- The `llm_calls` table is created by M1-02 (the lead writes migrations); this ticket writes the code that logs to it
- No `safety_level_detected` event: safety levels never go to PostHog (docs/12 §4, D46)
- Events carry no life area, mood or safety property (D48): no `life_areas`, `mood` or check-in value, no `crisis_screen_shown` or `resource_tapped`, no safety kind on `note_reported`
- Pre-approved properties (the lead approved these; anything else needs the lead first): screen or step name, locale, platform, app version, entitlement state, slot name, delivery kind, reaction value (heart / not_quite), source (push / widget / deep link)

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
