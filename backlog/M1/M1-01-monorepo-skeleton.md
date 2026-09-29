---
id: M1-01
title: Monorepo skeleton, CI, packages/shared
milestone: M1
state: ready
executor: subagent
model: opus
owner_files: [package.json, app/**, packages/shared/**, .github/workflows/**, supabase/config.toml, evals/**]
depends_on: []
pr:
---

## Goal
Create the repo layout from docs/07 §11 so every later ticket has a place to land and CI blocks red merges.

## Spec
- docs/07 §11 (layout), §10 (CI)
- docs/15 §2, §4 session 1
- docs/21 §0 criteria 1, 2, 6
- docs/20 §13 (tokens file location)

## Out of scope
- Any real screen; Supabase migrations (M1-02); analytics (M1-05)

## Risks and notes
- expo-apple-targets and native folders should be scaffolded but empty; don't fight Xcode here
- packages/shared must be pure ESM with no Node built-ins so Deno can import it
- Install the native dependencies the early tickets need in this one build, so week one needs a single development build: @shopify/react-native-skia and expo-splash-screen (M2-01), expo-secure-store (M1-03), react-native-mmkv (M1-08). RevenueCat and the widget targets come later with their own build.
- packages/shared exports the glossary constants and the design tokens only. Do not define the `life_areas` or delivery-intent enums here: the docs still disagree on their values (doc 05 §3 vs doc 08 §5.4; doc 00 vs doc 07 §3 vs doc 08 §3.3) and they land with M1-02 once reconciled. Leave a typed placeholder with a TODO pointing at M1-02.
- CI runs typecheck and tests on every PR; `npm run eval` runs only when files under `supabase/functions/_shared/prompts/**` or `evals/**` change (it calls the Claude API and needs a secret). Doc 21 §0.1 says every PR; the lead reconciles doc 21 to this.
- Pin Edge Functions to the project region (Canada Central) in `supabase/config.toml` so no note text is processed outside Canada (doc 07 §8, Law 25). Record the setting in the report.

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
