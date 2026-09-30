---
id: M2-01
title: Company splash and the Rustle screen with the Skia tree
milestone: M2
state: in progress
executor: subagent
model: opus
owner_files: [app/app/(onboarding)/splash.tsx, app/app/(onboarding)/rustle.tsx, app/features/intro/**, app/assets/fonts/**]
depends_on: [M1-01, M1-04]
pr:
---

## Goal
The first launch, and a launch after sign-out, shows the company splash for two seconds, fades into the Rustle screen with the tree moving softly behind the wordmark, and after one second the headline, Begin and footer appear. A launch with an existing session shows only the native splash and lands on Today, or on the Rustle a push or deep link names; the sequence never replays (D46).

## Spec
- docs/05 §2 (the sequence, D42)
- docs/20 §2 (wordmark, mark), §6 (motion), §3 (tokens)
- docs/21 §1 criteria 0–1
- The style board's intro example is the source of truth for the tree maths (canvas → Skia port)

## Out of scope
- Age gate and consent (M1-09); onboarding (M2-02); the company wordmark (type only until the legal name exists)

## Risks and notes
- @shopify/react-native-skia and expo-splash-screen are installed by M1-01, so this ticket needs no new native build
- Draw all leaves in one Skia Picture per frame, not one component per leaf
- Reduce-motion: tree still, fades only
- Company name is a placeholder string in en.json/fr.json: DreamTeam Co.

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
