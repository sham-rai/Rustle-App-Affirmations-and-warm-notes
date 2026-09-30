---
id: M2-05
title: The first paywall, welcome week, and door-open state
milestone: M2
state: ready
executor: lead
model: fable
owner_files: [app/features/paywall/**, supabase/functions/rc-webhook/**, supabase/functions/redeem-code/**, supabase/functions/_shared/entitlements/**]
depends_on: [M1-02, M2-03]
pr:
---

## Goal
After the first note and the permission prompt, the trial-first paywall appears with the welcome-week copy and the hardship line; Not now sets welcome_week_ends_at; the planner reads premium / welcome_week / door_open from server state; a beta code redeems to premium.

## Spec
- docs/09 §2–3, §9
- docs/07 §9
- docs/20 §7.8
- docs/21 §13 criteria 1–2, 5–7

## Out of scope
- The day-7 paywall and contextual paywalls (M4, once daily notes exist); the hardship offer's store configuration (PO does it in RevenueCat)

## Risks and notes
- RevenueCat needs the products created in App Store Connect and Play Console first (PO)
- Never shown in an elevated/crisis session: the welcome week then starts silently (`welcome_week_ends_at` set without a tap) and the day-7 paywall is the first one seen (docs/09 §3, D46)
- Scope in M2 (D46): the paywall screen, the RevenueCat products, `welcome_week_ends_at`, the entitlement-state reader as a pure function with unit tests, and code redemption. The planner consumes the state in M4; there is nothing to gate before then

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
