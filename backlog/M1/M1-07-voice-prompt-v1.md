---
id: M1-07
title: Rustle voice prompt v1 and a test screen that shows a real note
milestone: M1
state: ready
executor: lead drafts · subagent wires
model: opus
owner_files: [supabase/functions/_shared/prompts/rustle_voice/v1.md, supabase/functions/_shared/prompts/note_composer/v1.md, supabase/functions/dev-compose/**, app/app/dev/compose.tsx]
depends_on: [M1-06]
pr:
---

## Goal
A developer screen sends a hand-written context pack through LLMClient and shows a real Rustle on the phone, with the prompt loaded from a versioned file.

## Spec
- docs/08 §5.1 (system prompt), §5.2 (daily composer), §4 (principles)
- docs/17 §4 (prompt lab)
- docs/21 §2 criterion 5 as the eventual eval

## Out of scope
- The eval harness (M2/M3); safety gate; any production route

## Risks and notes
- The lead writes the prompt files; the subagent wires the screen and the dev function only
- The dev route is behind a build flag and never ships in a store build

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
