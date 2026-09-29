---
id: M1-04
title: i18n EN/FR, design tokens, ThemeProvider, tab skeleton
milestone: M1
state: in progress
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
- Summary: i18next + react-i18next with `en.json` / `fr.json`, language from the device (`fr-CA`/`fr-FR` → `fr`, anything else → `en`), and one `useT()` hook that applies the `tu`/`vous` context from an MMKV preference (default `tu`). `ThemeProvider` + `useTheme()` resolve Paper/Night from `packages/shared/tokens.ts` via `useColorScheme()` (internal `ThemeName = 'paper' | 'night'`). `Text` exposes the seven type styles (Literata for the three note styles, Instrument Sans for the rest, `title` in Instrument Sans Medium), font scaling always on. The root layout loads the three font files behind the splash and hosts a `Stack` with `(tabs)`: Today, Notes, You (exactly three; `/` redirects to `/today` from the root Stack), labels only, rendered with our `Text` over up to two lines and a bar sized for two lines at the current font scale; each tab is an `EmptyTab` (title and one empty-state line). Lint: hex literals and hard-coded JSX text fail in `app/**`, direct i18next imports fail outside `app/i18n`; `scripts/check-strings.ts` and `scripts/check-contrast.ts` run inside the root `npm run lint` (which CI runs), and `scripts/` is typechecked by the root `npm run typecheck`.
- Files touched: `app/i18n/{en.json,fr.json,index.ts,useT.ts,preferences.ts,i18next.d.ts}`, `app/i18n/__mocks__/preferences.ts`, `app/i18n/__tests__/{strings.test.ts,useT.test.tsx}`, `app/components/{ThemeProvider.tsx,Text.tsx,EmptyTab.tsx}`, `app/hooks/useTheme.ts`, `app/app/_layout.tsx`, `app/app/index.tsx` (the `/` redirect), `app/app/(tabs)/{_layout,today,notes,you}.tsx`, `app/eslint.config.js`, `app/package.json` (4 deps), `package.json` (`typecheck` also runs `tsc -p scripts`; `lint` + `check:strings` + `check:contrast`; dev deps `tsx`, `@types/node@^24`), `package-lock.json`, `scripts/{check-strings,check-contrast}.ts`, `scripts/tsconfig.json`, `app/__tests__/{root-layout.test.tsx (rewritten),text-and-theme.test.tsx,tabs-font-scale.test.tsx,checks.test.ts}`. `.github/workflows/ci.yml` ends up unchanged (the checks run through `npm run lint`). `packages/shared/tokens.ts` unchanged.
- Commands run and results: `npm ci` (0) · `npm run typecheck` (0; app, shared and `tsc -p scripts`) · `npm run lint` (0; ESLint 0 problems in app, shared, evals; check-strings clean; all 27 contrast pairs ≥ 4.5) · `npm test` (0; app 7 suites / 42 tests, shared 2 suites / 22 tests; the tu/vous test reports 5 French keys with a tu-form, all with a `_vous` sibling). After the lead review: same three commands, same exit codes. · `CI=1 npx expo export --platform ios` (0; bundle resolves, only the 3 needed .ttf files are included).
- Criteria met: §14.1 dark mode follows the system (Paper/Night only; Dawn and the premium themes are out of scope). §14.2 components read colours from tokens, ESLint fails on hex literals in `app/**`, CI contrast script fails below AA. §17.1 strings only in `en.json`/`fr.json`; lint flags hard-coded JSX text, "!" and "affirmation". §17.2 French defaults to "tu", `_vous` siblings, the fr.json scan test (every tu-form has a `_vous` sibling; no `_vous` value has a tu-form). §17.4 for the tab bar in tests: at font scale 3 the French labels render with `numberOfLines={2}` and the bar is 144 pt (two 20 pt lines × 3 + padding). Not verified (PO, device): real iPhone/Android in EN and FR, dark mode switch, fonts rendering, the tab bar and screens at the largest accessibility size on a real device, splash hand-off.
- Deviations and why: (1) Tests for routes, `Text`, the theme and the scripts live in `app/__tests__/` (outside `owner_files`): Jest only matches `__tests__/`, and a test inside `app/app/` would become a route. The existing `app/__tests__/root-layout.test.tsx` had to be rewritten because it asserted the M1-01 placeholder. (2) `app/app/index.tsx` (outside `owner_files`, asked for by the lead) redirects `/` to `/today` from the root Stack; without it the app opens on "Unmatched route". `app/components/EmptyTab.tsx` (also outside `owner_files`, asked for by the lead) holds the shared empty screen. (3) Extra lint beyond the ticket: hard-coded JSX text (§17.1 asks for it) and `no-restricted-imports` on `i18next` / `useTranslation` outside `app/i18n`. (4) No tab icons: `@expo/vector-icons` is not in the tree; icon slot hidden. The bar is always sized for two label lines at the current font scale (64 pt at 1×), which leaves some air under one-line labels at the default size. (5) `@types/node` added as a root dev dependency (lead-approved), pinned to `^24` to match `engines.node`. (6) `app/i18n/__mocks__/preferences.ts` stands in for MMKV in tests (MMKV needs the native Nitro module under Jest), so the real `preferences.ts` is only typechecked, not unit-tested. All five allowlisted deps were needed.
- Lead answers (2026-09-29): (a) OQLF spacing goes to the PO in the PR; strings unchanged. (b) the lead corrects docs/20. (c) noted. (d) curly apostrophes stay in English. The MMKV mock stays.
- Open questions for the lead (original): (a) French punctuation: docs/20 §10 says a non-breaking space before « ; : ? ! »; OQLF (Quebec) usage puts no space before « ; ? ! » and one only before « : ». I followed the doc (U+00A0) since we are fr-CA first; worth a PO call. (b) docs/20 §3.2 says charcoal ink on dark butter is 8.7 : 1; computed from the tokens it is 7.53 : 1 (still passes). (c) The tu-form regex cannot see tu-imperatives without a pronoun (e.g. "Mets-y"); French copy still needs a human read for those. (d) English strings use the typographic apostrophe too, for consistency with French; fine to switch back if you prefer straight quotes in `en.json`.
- Strings added (EN / FR, `_vous` where it differs):
  - `common.back`: Back / Retour
  - `common.begin`: Begin / Commencer
  - `common.done`: Done / Terminé
  - `common.errorSaved`: Something went wrong. Your note is saved; I’ll try again in a moment. / Quelque chose n’a pas fonctionné. Ta note est enregistrée ; je réessaie dans un instant. · `_vous`: … Votre note est enregistrée ; je réessaie dans un instant.
  - `common.notNow`: Not now / Pas maintenant
  - `tabs.today.title`: Today / Aujourd’hui
  - `tabs.today.empty`: When Rustle leaves you a note, you’ll find it here. / Quand Rustle te laissera une note, tu la trouveras ici. · `_vous`: Quand Rustle vous laissera une note, vous la trouverez ici.
  - `tabs.notes.title`: Notes / Notes
  - `tabs.notes.empty` (docs/05 §5): This is your space. Put anything here: a fear, a win, a random thought. I’ll remember. / C’est ton espace. Mets-y n’importe quoi : une peur, une victoire, une pensée en passant. Je m’en souviendrai. · `_vous`: C’est votre espace. Mettez-y n’importe quoi : une peur, une victoire, une pensée en passant. Je m’en souviendrai.
  - `tabs.you.title`: You / Toi · `_vous`: Vous
  - `tabs.you.empty`: Here you’ll see what Rustle remembers and choose how notes reach you. / Ici, tu verras ce dont Rustle se souvient et tu choisiras comment les notes te parviennent. · `_vous`: Ici, vous verrez ce dont Rustle se souvient et vous choisirez comment les notes vous parviennent.
