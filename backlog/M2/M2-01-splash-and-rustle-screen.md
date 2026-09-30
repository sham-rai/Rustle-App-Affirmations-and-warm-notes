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
- Summary: `(onboarding)` route group with `splash.tsx` (DreamTeam Co. on paper, fade out, Rustle screen at 2 s) and `rustle.tsx` (tree, mark and wordmark from the first frame; the stage fades in from the splash; at 1 s headline, sub, Begin and the footer ("Not a medical service." plus the AI disclosure) fade up together in 400 ms, rising 8 pt, fades only under reduce-motion). `/` waits for the session with the native splash up (capped at 4 s); behind it and after the cap it shows the same paper and company name as the splash, never a blank screen. A freshly created anonymous account, or a first launch offline with no stored refresh token, goes to the splash; a restored session, or a failed refresh of a stored token (reinstall offline), goes to Today. An MMKV flag (`rustle.intro` / `intro.seen`) is set on Begin and on any restored-session launch. The tree module is `app/features/intro/tree/` (maths, draw, `Tree` with `intensity: 'full' | 'quiet'` for M1-09 and a required `reduceMotion` prop from the screen's live hook). Branches and leaves go into one Skia Picture per frame on the UI thread. Paints and the leaf path are made once per theme, and the frame callback is memoised.
- Files touched (owner files): `app/app/(onboarding)/_layout.tsx`, `splash.tsx`, `rustle.tsx`; `app/features/intro/**` (tree/maths.ts, tree/draw.ts, tree/Tree.tsx, FoldedNoteMark.tsx, CompanySplashView.tsx, intro-seen.ts, launch.ts, timing.ts, link-text.ts, useReduceMotion.ts, index.ts, 6 test files); `app/i18n/en.json`, `fr.json` (new `intro` block only).
- Files touched outside the owner files, and why:
  - `app/app.json` (lead, d8ad131): native splash on paper in light and dark.
  - `app/app/_layout.tsx`: registers the route group and holds the native splash until the launch route is known.
  - `app/app/index.tsx`: the launch redirect.
  - `app/lib/auth/bootstrap.ts`, `useAuthBootstrap.ts`, `__tests__/bootstrap.test.ts`: `hasStoredToken` on the failed state, so a reinstall opened offline never replays the intro.
  - `scripts/check-app-config.ts` and `package.json`: `check:app-config` in `lint` keeps the app.json splash colours equal to `color.paper`.
- Commands run and results: `npm run typecheck` pass · `npm run lint` pass (eslint, check-strings, check-contrast, check-app-config) · `npm test` pass (app 19 suites / 102 tests, shared 2 / 22). The existing root-layout test is unchanged and passes.
- Criteria met / not verified: §1.0 and §1.1 are met in code and in the tests (EN, FR tu, FR vous; fake-timer timings; Begin → Today; the rendered launch gate: native splash held while loading, new account → splash, restored → Today, 4 s cap; launch routing incl. a stored token that failed to refresh). The crisis link and "I already have an account" are deliberately absent (see deviations), so §1.1 is complete only once M1-09 and account linking add them. NOT verified: anything on a device. That includes the animation, the frame rate, how the tree feels, the Skia objects shared with the UI thread, the placeholder mark, French at the largest text size, and the native-splash hand-off. The native splash is now on paper in light and dark via `app.json`, but it needs the first native build, and its image is still the Expo template `splash-icon.png` in both modes.
- Deviations and why:
  1. The style board's intro example is not in the repository. The tree maths is written from docs/05 §2 and docs/20 §6 and kept in one commented file (`tree/maths.ts`: TREE_SHAPE, WIND, FALL) to align with the board later.
  2. The folded-note mark is a placeholder Skia drawing (no artwork exists yet).
  3. No dead controls. The "get help now" link waits for the crisis resources (TODO(M1-09); `intro.crisis` is kept, and `link-text.ts` splits it). "I already have an account" waits for account linking (TODO(M2 account linking); `intro.haveAccount` is kept). Begin opens Today until the age gate exists (TODO(M1-09)).
  4. With no Supabase project configured (tests, builds without `.env.local`), `/` goes to Today, as the existing root-layout test requires; such builds never show the intro.
- Edge cases:
  - No sign-out path exists yet: `resetIntroSeen()` is exported with TODO(M2 account linking) for the sign-out to call.
  - After an account is deleted (the blocked minor in M1-09, delete account later), the caller of `deleteAnonymousAccount()` must call `resetIntroSeen()`. Otherwise the flag stays set and a fresh account lands on Today without the intro.
  - A reinstall opened offline or during a server error keeps its Keychain / Block Store token, so it goes to Today (`hasStoredToken`) and runs in its cached or empty state until the refresh succeeds.
