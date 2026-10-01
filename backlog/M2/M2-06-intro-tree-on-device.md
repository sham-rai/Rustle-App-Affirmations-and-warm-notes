---
id: M2-06
title: The intro tree on a device: frame allocations, reduce-motion start state, the seen flag before Begin
milestone: M2
state: ready
executor: subagent
model: opus
owner_files: [app/features/intro/**, app/app/(onboarding)/rustle.tsx, app/app/_layout.tsx]
depends_on: [M2-01]
pr:
---

## Goal
The Rustle screen holds 60 fps on the PO's iPhone and a mid-range Android with no visible GC pauses, honours reduce-motion from the first frame, and a user who kills the app on the intro sees it again.

## Spec
- docs/05 §2, docs/20 §6
- docs/21 §1.0–1.1
- The M2-01 report, "Second review round", point 3, and the review notes below

## Scope
- Measure first: frame time and allocations of `drawTree` on both phones (Xcode Instruments / Android Studio profiler), recorded in the report.
- If it matters: compute the gust once per frame instead of per branch and leaf (about 400 times today); reuse the pose buffers and place leaves inline instead of allocating about 240 placement objects per frame; dispose or reuse the SkPicture.
- `useReduceMotion` starts as `false`, so a reduce-motion user gets a few animated frames and the 8 pt rise before the setting resolves. Start as unknown and hold the clock until it is known.
- A user who kills the app on the splash or the Rustle screen comes back as a restored session and is sent to Today with the intro marked seen; once M1-09 puts the age gate and consent behind Begin, that path skips both. Mark the intro seen only when Begin is tapped, and route a restored session that never tapped Begin back to the Rustle screen.
- Returning users wait for auth on every cold start even though the intro flag is already set; treat the intro-seen flag as "route known" so the native splash hides at once.

## Out of scope
- Artwork for the folded-note mark; the company wordmark

## Questions for the PO
- none

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
