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
- Summary: Sentry init with scrubbing (`app/lib/sentry.ts`), PostHog client with a closed property allowlist and typed `track` (`app/lib/analytics.ts`), `app_opened` fired once per cold start and Sentry initialised at module scope in `_layout.tsx`, and the Deno `llm_calls` logger plus `costMicros` price table (`supabase/functions/_shared/cost/log.ts`). Both SDKs are off when their key is empty.
- Files touched: app/lib/analytics.ts, app/lib/sentry.ts, app/lib/__tests__/analytics.test.ts, app/lib/__tests__/sentry.test.ts, app/app/_layout.tsx, app/app.json (Sentry plugin), app/.env.example, app/package.json, package-lock.json, supabase/functions/_shared/cost/log.ts, supabase/functions/_shared/cost/log.test.ts.
- Packages added (via `npx expo install`): @sentry/react-native ~7.11.0, posthog-react-native ^4.78.3, expo-application, expo-device, expo-file-system, expo-localization (PostHog peers; expo-localization was already present).
- Commands run and results: `npm run typecheck && npm run lint && npm test` from the root: typecheck and lint pass. Full app jest on this machine hit the 5 s default timeouts (cold transforms, 5 suites); re-run with `--testTimeout=120000`: 21 suites, 110 tests, all pass. `deno check _shared/cost/log.ts _shared/cost/log.test.ts` and `deno test _shared/cost/` (2 tests) pass.
- Criteria met / not verified: docs/21 §16.1 (property allowlist test, no free text) met for the events defined so far; §16.2 code path only (logger and prices; dashboard and spend limits are not this ticket). Not verified: a real crash reaching Sentry, `app_opened` reaching PostHog EU, the Sentry plugin in a native build (needs DSN, key and a device). CI's deno job checks only `shared-smoke.ts`: the lead should add `_shared/cost/log.ts` and run `deno test _shared/cost/`.
- Deviations and why: (1) `app_version` is a strict-semver string rather than an enum (it cannot be enumerated). (2) `delivery_kind` reuses the `DELIVERY_INTENTS` values; screen, step and slot value lists are my closed lists, so the lead should confirm them. (3) `app_opened` source is `icon` for now; push, widget and deep-link sources are for later tickets. (4) Event list is a starter subset of docs/12 §4, not the full list. (5) Price table follows docs/08 §1; cache read 0.1x, cache write 1.25x and batch 0.5x are my assumptions to verify at M1-06. (6) The log test is a Deno test file, not run by `npm test`.
- Open questions: none.
- Not verified (PO steps): the PostHog project needs "Discard client IP data" enabled (the SDK flag only stops geolocation); the Sentry plugin needs an organisation, project and `SENTRY_AUTH_TOKEN` in EAS for source maps.
- Lead review fixes: delivery_kind now uses `DELIVERY_INTENTS`; `extra` deleted in scrubEvent; model price lookup by longest prefix; CI deno job extended.
