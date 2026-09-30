---
id: M2-03
title: Onboarding complete, the first note screen, seed notes, notification permission
milestone: M2
state: ready
executor: lead
model: fable
owner_files: [supabase/functions/onboarding-complete/**, supabase/functions/_shared/ai/**, app/app/(onboarding)/first-note.tsx, app/features/first-note/**]
depends_on: [M1-02, M1-06, M1-07, M2-02]
pr:
---

## Goal
Tapping done on screen 5 calls /onboarding/complete behind App Attest, runs the safety gate and extraction, streams the first Rustle within 5 s with the 8 s template fallback, writes 48 h of seed notes, shows the note large with ❤️ / Not quite, then asks for notification permission.

## Spec
- docs/07 §4.1 (flow), §8 (App Attest)
- docs/08 §5.4, §5.7, §5.10 (extractor, safety, first note)
- docs/05 §3 (the first note), docs/21 §2 criteria 3–9

## Out of scope
- The paywall and welcome week (M2-05); daily generation (M4)

## Risks and notes
- Crisis text in onboarding → crisis screen first, no first-note generation
- The three-state client machine: streaming → shown, or streaming → fallback → replaced; never two notes
- Until M1-06 lands, a dev stub returns a canned note so M2-02 can be walked end to end
- The first note is composed from the raw answers while the extractor runs in parallel; it never waits on extraction (docs/07 §4.1, D46). Stream with `expo/fetch` on the client
- Seed notes are a `seed_notes` job enqueued at the end of the request, one per chosen slot for 48 h; the app polls until they exist
- The endpoint verifies the three required `consents` rows exist (written by M1-09) and rejects otherwise
- The permission pre-prompt names the chosen slots' times

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
