---
id: M2-04
title: Today with the first Rustle as hero, and the Notes board with a first note
milestone: M2
state: ready
executor: subagent
model: opus
owner_files: [app/app/(tabs)/today.tsx, app/app/(tabs)/notes.tsx, app/features/today/**, app/features/notes/ui/**, app/components/NoteCard.tsx, app/components/StickyNote.tsx]
depends_on: [M1-04, M1-08, M2-03]
pr:
---

## Goal
After the first note, Today shows it as the hero card with ❤️ and share, earlier Rustles below, the check-in card when due; the Notes board shows the onboarding text as the first sticky note and lets the user add, edit, pin and delete notes through the outbox.

## Spec
- docs/05 §4 (Today), §5 (board)
- docs/20 §7.1–7.3 (note card, sticky note, note back)
- docs/21 §4 criteria 1–4, §5 criteria 1–2, 9

## Out of scope
- Notes back and the reply pipeline (M3); memory screen (M3); share cards (M5)

## Risks and notes
- Seeded rotation per note id; two-column grid, one column in Simple mode and at large text
- No paywall or upsell anywhere on a note card

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
