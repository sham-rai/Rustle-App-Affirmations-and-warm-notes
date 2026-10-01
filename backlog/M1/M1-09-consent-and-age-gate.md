---
id: M1-09
title: Consent screens, 18+ gate, consents rows
milestone: M1
state: ready
executor: subagent
model: opus
owner_files: [app/app/(onboarding)/age.tsx, app/app/(onboarding)/consent/**, app/features/consent/**, app/i18n/en.json, app/i18n/fr.json]
depends_on: [M1-02, M1-04]
pr:
---

## Goal
A neutral date-of-birth gate that blocks under-18s kindly with youth resources, and three separate consent screens that each write a versioned `consents` row, in EN and FR. The screen before the gate is the Rustle screen (M2-01, D42); there is no separate welcome screen.

## Spec
- docs/05 §3 (age gate)
- docs/11 §4.2 (consents), §4.4 (Apple AI consent), §5 (minors)
- docs/20 §7.5 (buttons), §10 (microcopy)
- docs/21 §1 criteria 1–4

## Out of scope
- The company splash, the Rustle screen and onboarding screens 1–5 (M2); the youth helpline numbers are copied from docs/11 §5 and marked 'verify at build'

## Risks and notes
- Consent copy is separate from ToS acceptance; declining AI processing ends onboarding kindly
- Under-18 block stores a local flag so there's no instant retry
- This ticket owns en.json and fr.json while it runs
- Store only `users.age_confirmed_at`; the picked date is discarded (D46)
- Under 18, and a declined AI-processing consent, call `deleteAnonymousAccount()` from M1-03 before the block or goodbye screen (its server side is the `delete_own_account()` RPC from migration 1, D47; no Edge Function is needed)
- The consent rows are written here, client-side through PostgREST under RLS; `/onboarding/complete` (M2-03) verifies they exist (docs/21 §1.3, §2.3)
- From the M2-01 review: the Rustle screen's footer shows only "Not a medical service." plus the AI line; this ticket adds the "get help now" link (`intro.crisis`, split with `app/features/intro/link-text.ts`) pointing at the crisis resources it builds, and routes Begin to the age gate (both spots carry a `TODO(M1-09)`)
- After `deleteAnonymousAccount()` (under 18, declined AI consent) call `resetIntroSeen()` from `app/features/intro/intro-seen.ts`, otherwise the next account created on this install skips the intro

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary: Begin on the Rustle screen now opens a neutral date-of-birth gate (`/age`: day, month, year number fields, no hint of the threshold). 18+ updates only `users.age_confirmed_at` (filtered to the session user, `.select('id')` checks one row changed) and opens three separate consent steps (`/consent/terms`, `/consent/ai`, `/consent/special-category`). Each step writes one `consents` row (`kind`, `version` from `CONSENT_VERSIONS`, `locale` = copy locale `en` / `fr-CA`; `user_id` and `granted_at` come from column defaults) and shows the AI disclosure. Then Today. Under 18: the local MMKV flag is set, `deleteAnonymousAccount()` and then `resetIntroSeen()` run, and the block screen lists youth lines (docs/11 §5, "VERIFY AT BUILD" comment in `resources.ts`), the device's country first, plus findahelpline.com and the emergency numbers. A blocked install that comes back sees the block screen with no inputs, and the anonymous account made at that launch is deleted too. Declining any consent ("Not now", same size as "I agree") deletes the account, resets the intro and shows a goodbye screen with no buttons. The Rustle screen footer is now `intro.crisis` (split with `link-text.ts`), and "get help now" opens `/help` with the docs/11 §5b crisis lines. The date of birth lives only in component state and is cleared after the check. Nothing is logged or sent to analytics.
- Files touched: app/app/(onboarding)/age.tsx, help.tsx, consent/{terms,ai,special-category,goodbye}.tsx, app/app/(onboarding)/rustle.tsx (the two TODOs plus one import), app/features/consent/{age,block-flag,records,leave,resources}.ts, {AgeGate,BlockedView,Button,ConsentStep,GoodbyeView,HelpLineList,HelpLinesFooter,HelpView,LinkedSentence,OnboardingPage}.tsx, app/features/consent/__tests__/{age,records,resources}.test.ts, {flow,flow.fr}.test.tsx, fake-supabase.ts, app/i18n/en.json, app/i18n/fr.json, app/features/intro/__tests__/intro-screens{,.fr}.test.tsx (see deviations).
- Commands run and results: `npm ci` ok. `npm run typecheck` ok. `npm run lint` ok (eslint, check:strings, contrast, enums, api-schemas, app-config). `npm test` with the default worker count: 5 tests timed out at Jest's 5 s default in features/intro (including launch-gate.test.tsx, which this ticket does not change) while the machine's load average was around 600. `npm test -- --maxWorkers=2`: 24 suites, 144 tests passed, plus evals 25 passed. Run alone with `-i`, the intro and consent suites pass. The two consent flow suites set `jest.setTimeout(30000)`.
- Criteria met / not verified: §1.2 met in Jest (gate before onboarding, under 18 deletes then blocks, local flag, only age_confirmed_at written). §1.3 met in Jest (three separate screens, one row each with kind/version/locale, timestamp by column default; declining AI ends kindly and deletes). §1.4 met on the consent screens; About does not exist yet. Not verified: anything on a phone (keyboard, layout at French length, tel: links, VoiceOver), and the real writes and RPC against the dev Supabase project under RLS.
- Deviations and why: (1) Declining terms or special-category data ends onboarding the same way as declining AI. The ticket only names AI, but Rustle can't run without the other two, and a consent with no way to decline isn't freely given. (2) The two intro tests were updated because their assertions pinned the old TODO behaviour (Begin opening Today, no crisis link). (3) rustle.tsx also gets one import line for LinkedSentence. (4) The consent locale is the copy locale (`en`, `fr-CA`), not the device tag, because it records which text was agreed to.
- Open questions: (a) Killing the app between Begin and the last consent: the intro flag is already set, so the next launch goes to Today without age or consents. The launch gate (launch.ts, not owned here) or M2-03 should check `age_confirmed_at` and the consents. (b) A blocked install creates a new anonymous account on each launch before the gate deletes it again. Should index/launch check the block flag before creating an account? (c) The terms screen has no links to the Terms and Privacy pages because none exist yet (docs/21 §18). (d) The block is permanent for the install (cleared on reinstall). Confirm, or set a time limit. (e) The SOS Amitié URL and every number need checking at build. (f) The French copy needs native review, especially the legal consent text.
