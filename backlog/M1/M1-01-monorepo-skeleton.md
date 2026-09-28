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

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
