---
id: M1-04
title: i18n EN/FR, design tokens, ThemeProvider, tab skeleton
milestone: M1
state: ready
executor: subagent
model: opus
owner_files: [app/i18n/**, app/components/ThemeProvider.tsx, app/components/Text.tsx, app/app/_layout.tsx, app/app/(tabs)/**, app/hooks/useTheme.ts, packages/shared/tokens.ts, scripts/check-contrast.ts, scripts/check-strings.ts, app/.eslintrc.* or app/eslint.config.*, .github/workflows/ci.yml (lint steps only), package.json (scripts and the JS deps named below only)]
depends_on: [M1-01]
pr:
---

## Goal
Switching the phone to French makes every string French, colours come only from tokens, dark mode follows the system, and the three tabs exist as empty screens.

## Spec
- docs/05 §1 (three tabs), §12 (dark mode default)
- docs/20 §3 (tokens), §4 (type scale), §10 (microcopy rules), §13, §15
- docs/21 §14, §17 criteria 1–2

## Out of scope
- Any real content on the tabs; premium themes; the Dawn theme; the settings toggle for "vous" (the preference exists in code, the UI comes with onboarding and settings)

## Decisions already taken (lead, 2026-09-29)
- i18n: `i18next` + `react-i18next` + `expo-localization` (native dep already installed by M1-01). Resources: `app/i18n/en.json` and `app/i18n/fr.json` only. Language follows the device; unsupported locales fall back to English; `fr-CA` and `fr-FR` both load `fr`.
- "tu" / "vous": one `fr.json`. Any French string that changes in the "vous" form has a sibling key with the `_vous` suffix (i18next `context`). A single app-level setting `address: 'tu' | 'vous'` (stored in MMKV, default `tu`) sets the context for every `t()` call through one wrapper hook, `useT()`, which every component uses; nobody imports `t` from i18next directly. A test scans `fr.json`: every value matching tu-forms (`\btu\b`, `\bte\b`, `\bt'`, `\bton\b`, `\bta\b`, `\btes\b`, `\btoi\b`) must have a `_vous` sibling, and no `_vous` value may contain a tu-form. This is the "snapshot test over all strings" of docs/21 §17.2.
- Fonts: Literata (Rustle's words) and Instrument Sans (interface) via `@expo-google-fonts/literata` and `@expo-google-fonts/instrument-sans`, loaded with `expo-font` in the root layout; the splash stays up until they load. A `Text` component exposes the seven type styles of docs/20 §4 by name (`noteHero`, `note`, `noteSmall`, `title`, `body`, `label`, `caption`) and scales with the system font scale.
- Theme: `ThemeProvider` reads `packages/shared/tokens.ts`, resolves light/dark from `useColorScheme()` (system, no manual override yet) and exposes `useTheme()` returning the resolved colours, spacing, radii, shadow and motion tokens. Only the Paper theme (light) and Night (dark) exist in this ticket; the provider's shape must allow named themes later (`theme: 'paper' | 'night'` internally).
- Tabs: `app/app/(tabs)/_layout.tsx` with `today`, `notes`, `you`. Labels come from i18n. Active tint `sage`, inactive `ink2`, bar on `card` with a `line` hairline. Each tab is an empty screen showing its title (`title` style) and one line of empty-state copy (`body` style, `ink2`) on `paper`. The Notes board empty-state text is the one in docs/05 §5; Today and You get one calm sentence each in the docs/20 §10 voice.
- Lint: an ESLint rule (`no-restricted-syntax` on hex colour literals `#[0-9a-fA-F]{3,8}` in `app/**` outside `packages/shared/tokens.ts`); `scripts/check-strings.ts` fails on `!` or the word "affirmation" (case-insensitive) in `en.json` / `fr.json`; `scripts/check-contrast.ts` computes WCAG contrast for the token pairs in docs/20 §3.1–3.2 (`ink` and `ink2` on `paper` and `card`; white on `sage`, `sageDeep`, `warm`, `remove`, `calm` in light; `ink` on every pastel) and fails below 4.5:1 for text pairs. All three run in `npm run lint` and in CI.
- Dependencies allowed in this ticket, nothing else: `i18next`, `react-i18next`, `@expo-google-fonts/literata`, `@expo-google-fonts/instrument-sans`, `tsx` (dev, to run the two scripts).

## Risks and notes
- Design at French length from the start (15–25% longer); no truncation of tab labels at the largest accessibility font scale (use `tabBarLabelStyle` with `allowFontScaling` kept on and let the bar grow).
- The life-area chip strings belong to M2-02, not this ticket; only tab labels, the empty-tab copy and shared UI strings (`common.notNow`, `common.begin`, `common.back`, `common.done`, `common.errorSaved` from docs/20 §10) go into `en.json` / `fr.json` here.
- No exclamation marks, no emoji, sentence case, typographic apostrophes and non-breaking spaces before « ? ! : ; » in French. The word "affirmation" never appears.
- M1-03 (lead) will append a `settings.backup.*` block to both string files after this ticket merges; leave the files formatted with two-space indentation and sorted top-level keys so the merge is clean.
- The doc review of 2026-09-29 found nothing that blocks this ticket.

## Questions for the PO
- none open

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
