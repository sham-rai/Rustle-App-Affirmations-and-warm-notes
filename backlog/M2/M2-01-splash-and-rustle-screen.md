---
id: M2-01
title: Company splash and the Rustle screen with the Skia tree
milestone: M2
state: PR open
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
- Summary: `(onboarding)` route group with `splash.tsx` (DreamTeam Co. on paper, fade out, Rustle screen at 2 s) and `rustle.tsx` (tree, mark and wordmark from the first frame; the stage fades in from the splash; at 1 s headline, sub, Begin, "I already have an account" and the footer fade up together in 400 ms, rising 8 pt, fades only under reduce-motion). `/` now waits for the session: a freshly created anonymous account (or a first launch offline) goes to the splash, a restored session goes to Today, and the root layout keeps the native splash up until that is known (capped at 4 s). An MMKV flag (`rustle.intro` / `intro.seen`) is set on Begin and on any restored-session launch, so the sequence never replays. The tree module lives in `app/features/intro/tree/` (maths, draw, `Tree` with `intensity: 'full' | 'quiet'` for M1-09); all branches and leaves are recorded into one Skia Picture per frame on the UI thread, driven by `useFrameCallback`; under reduce-motion the clock never starts and the tree is drawn once, still.
- Files touched: `app/app/(onboarding)/_layout.tsx`, `splash.tsx`, `rustle.tsx`; `app/app/_layout.tsx` (route group, splash gate); `app/app/index.tsx` (redirect); `app/features/intro/**` (tree/maths.ts, tree/draw.ts, tree/Tree.tsx, FoldedNoteMark.tsx, intro-seen.ts, launch.ts, timing.ts, link-text.ts, useReduceMotion.ts, index.ts, 4 test files); `app/i18n/en.json`, `fr.json` (new `intro` block only).
- Commands run and results: `npm run typecheck` pass · `npm run lint` pass (eslint, check-strings, check-contrast) · `npm test` pass (app 17 suites / 96 tests, shared 2 / 22). The existing root-layout test is unchanged and still passes.
- Criteria met / not verified: §1.0 and §1.1 are met in code and in the unit and screen tests (EN, FR tu, FR vous; timings with fake timers; Begin → Today; launch routing for new, restored, loading, offline, seen). NOT verified: anything on a device. That includes the animation, the frame rate, how the tree feels, the look of the placeholder mark, French line lengths at the largest text size, and the native-splash hand-off. The tree was checked only as static SVG renders of the maths.
- Deviations and why:
  1. The style board's intro example is not in the repository. The tree maths is written from docs/05 §2 and docs/20 §6 and kept in one commented file (`tree/maths.ts`: TREE_SHAPE, WIND, FALL) to align with the board later.
  2. The native splash is NOT on paper yet. `app.json` sets no splash `backgroundColor` (the default is white) and shows the Expo template `splash-icon.png`, so a white flash and an icon change are expected until `app.json` gets paper (`#F6F1E7`, dark `#1C1A17`) and the real image. That file was outside this ticket's files, so it needs a follow-up and a new native build.
  3. The folded-note mark is a placeholder Skia drawing (no artwork exists yet).
  4. No sign-out path exists yet: `resetIntroSeen()` is exported with `TODO(M2 account linking)`. Also TODO(M1-09) on Begin (→ Today for now) and on the crisis link (disabled placeholder with a hint); TODO(M2 account linking) on "I already have an account".
  5. With no Supabase project configured (tests, builds without `.env.local`), `/` goes to Today, because the existing root-layout test requires it; such builds never show the intro.
