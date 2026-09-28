# 20 · Style Guide: How Rustle Should Look, Move and Speak

> **Purpose:** the visual and verbal style for the app, widgets, notifications, share cards, warm-note pages and marketing, derived from who Rustle is for and what it promises. It's written to brief a designer and to give Claude Code concrete tokens to build from.
> **Inputs:** doc 01 (principles, tone), doc 05 §12 (paper & ink direction), doc 14 (ages 18–60, EN + FR), doc 19 (review).
> **Status:** proposal. The designer refines the palette, type and logo; the principles, accessibility rules and anti-patterns are firm.

---

## 1. Who we're designing for, and what that implies

| Fact about the audience | Design consequence |
|---|---|
| People in a hard period: tired, raw, often reading at 11 p.m. or 7 a.m. | Calm, low-contrast *surfaces* with high-contrast *text*. Nothing that flashes, counts down, or asks for energy. Dark mode is a need, not a theme. |
| Ages 18–60. A 22-year-old shares to Stories; a 55-year-old wants large, clear text. | One system with generous defaults (17 pt body minimum, Dynamic Type to accessibility sizes) and a **Simple mode**. Aesthetics come from restraint and texture, not from small type. |
| English and French. French is 15–25% longer and has accents and ligatures. | Every component is designed at French length; fonts must cover Latin Extended; never all-caps in French (accents get lost, and it shouts). |
| They came from generic affirmation apps with gradients, quotes and sparkles. | Rustle must look *different within two seconds*: paper, not gradient; a note, not a poster; a voice, not a quote. |
| Trust is fragile. Privacy is a headline for French users. | Visual honesty: no dark patterns, clear system prompts, a visible "backed up / not backed up" state, and a crisis screen that is calm and obviously human-written. |
| The brand promise: *a handwritten note on the fridge from someone who remembers.* | Every surface is a piece of paper someone left for you. Warm off-white, ink, a little texture, slight imperfection. |

**Design principles** (use them to settle arguments)

1. **Quiet.** The interface never competes with the note. One idea per screen. If in doubt, remove.
2. **Warm, not cute.** Paper, ink, leaves. No mascots, no sparkles, no cartoon faces.
3. **Specific beats pretty.** The note text is the hero; decoration is the frame, never the picture.
4. **Unhurried.** Motion is slow and settles. Nothing bounces, pulses or nags.
5. **Readable by anyone.** AA contrast minimum everywhere, AAA for note text. Large touch targets. No colour-only meaning.
6. **Honest.** Buttons say what they do. Prices are visible. "Not now" is as easy to tap as "Yes".
7. **Same on a bad day.** The design must still feel kind at 3 a.m. with the brightness down and the hands shaking.

---

## 2. Brand identity

### 2.1 Name and wordmark
- **Rustle**, always capitalised in prose, lowercase `rustle` acceptable in the wordmark and domain.
- Wordmark: a humanist serif or a soft-terminal sans (see §4), tracked slightly wide, ink on paper. No gradient, no shadow.
- The house mark: a **folded note** whose open corner reads as a leaf. It must work at 16 px (tab icon), as an app icon, and as a lock-screen notification glyph in one colour.
- House emoji: 🌿 (used sparingly in notes, never in UI chrome).

### 2.2 App icon
Paper-coloured square with the folded-note mark in sage ink. Warm, matte, no glossy highlight. In the dark-icon variant (iOS), the same mark in pale sage on warm charcoal. Test at the smallest home-screen size against a busy wallpaper.

### 2.3 Sound
An optional notification sound: a soft paper rustle, under one second, with a low-frequency floor so it isn't sharp on a phone speaker. Off by default; offered once in delivery settings, never in onboarding. (Custom notification sounds are supported on both platforms; keep the file under 30 seconds and provide it in the app bundle.)

### 2.4 Mascot: no
A character makes Rustle a *someone* in a way that invites the chatbot comparison and the Finch comparison. The recurring motif is the folded note and the leaf; the *voice* is the character.

---

## 3. Colour

The palette is built around three ideas: **paper** (surfaces), **ink** (text), **sage** (Rustle's presence). One warm accent (terracotta) for the rare moment that needs it, and five sticky-note pastels for the board. Every pair below was checked for WCAG contrast; ratios are given so nobody has to re-check.

### 3.1 Paper theme (default, light)

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `paper` | `#F6F1E7` | App background | — |
| `card` | `#FFFBF3` | Note cards, sheets | — |
| `ink` | `#2A2622` | Primary text | 13.3 : 1 on paper |
| `ink-2` | `#6B6259` | Secondary text, captions | 5.3 : 1 on paper |
| `line` | `#E4DCCF` | Hairlines, dividers | decorative |
| `sage` | `#4F6F52` | Rustle's presence: reply notes, primary buttons, active tab, links | 5.0 : 1 on paper as text; white on it 5.6 : 1 |
| `sage-deep` | `#3F5C42` | Pressed buttons, small text on paper | 6.6 : 1 on paper; white on it 7.4 : 1 |
| `sage-wash` | `#E3EAE0` | Sage tint for selected chips, reply-note paper | decorative |
| `warm` | `#9E5238` | Accent for one thing per screen at most: ❤️ pressed, "today" marker | 5.0 : 1 on paper; white on it 5.7 : 1 |
| `warm-soft` | `#B5654A` | Large text (≥ 24 pt) and icons only, never body text | 3.8 : 1 (fails AA for small text) |
| `remove` | `#A24B3C` | Destructive actions (delete, forget) | 5.2 : 1 on paper |
| `calm` | `#2F5D62` | Crisis and safety surfaces: deep, steady teal, never red | white on it 7.3 : 1; as text on paper 6.5 : 1 |

**Sticky-note pastels** (board only; ink on each ≥ 10.6 : 1):

| Token | Hex | Name in UI |
|---|---|---|
| `note-butter` | `#F3E3A5` | Butter |
| `note-blush` | `#F1D3C9` | Blush |
| `note-sage` | `#D8E3D0` | Sage |
| `note-sky` | `#D5E1EA` | Sky |
| `note-lilac` | `#E1D9EA` | Lilac |

### 3.2 Night (dark mode, follows the system by default)

Warm charcoal, never pure black; text is warm off-white, never pure white. Ratios checked.

| Token | Hex | Contrast |
|---|---|---|
| `paper` | `#1C1A17` | — |
| `card` | `#262320` | — |
| `ink` | `#EFE8DC` | 14.3 : 1 on paper, 12.8 : 1 on card |
| `ink-2` | `#A89F93` | 6.7 : 1 on paper, 6.0 : 1 on card |
| `line` | `#3A3630` | decorative |
| `sage` | `#9DBB9A` | 8.3 : 1 on paper; charcoal on it 8.3 : 1 |
| `sage-wash` | `#2C3A2D` | decorative |
| `warm` | `#D99A80` | 7.4 : 1 on paper |
| `remove` | `#D9846F` | large/icon use; verify per component |
| `calm` | `#8FBFC4` | crisis surface accent; charcoal text on it |
| pastels | desaturate and darken each by ~35% (e.g. butter → `#C9B77A`, ink on it 8.7 : 1) | — |

### 3.3 Themes on top (premium)
Themes change *paper, card, pastels and one accent*; they never change `ink` contrast rules or the crisis palette.

| Theme | Paper | Accent | Feel | Notes |
|---|---|---|---|---|
| **Paper** (default) | `#F6F1E7` | sage | A note on the fridge | Free |
| **Dawn** (Zorya) | `#F8E7DA` → soft peach at the top | dusty rose `#8F4F52` (5.1 : 1 on dawn paper) | Morning, hope after a night | Free at launch as the second theme |
| **Night** | `#1C1A17` | pale sage | Late, quiet | Free (it's dark mode with texture) |
| **Garden** | `#EEF1E6` | moss | Growth | Premium |
| **Linen** | `#F3EFE9` | ink only, no accent | Plain, calm, for people who find colour tiring | Premium; also the base of Simple mode |
| **Tide** (Nautila) | `#E9EEF0` | slate blue | Depth; the spiral for recaps | Premium |
| Seasonal | small variations on Paper | — | Never red/green Christmas, never Valentine pink; hard seasons for many | Premium, optional |

### 3.4 Colour rules
- **One accent per screen.** If the ❤️ is warm, the button is sage; never two warm elements competing.
- **Never red as a state.** Errors and destructive actions use `remove` (a muted brick), presented calmly with a sentence, not an icon shout.
- **Crisis screens use `calm`**, high contrast, large buttons, no sage (Rustle's presence steps back; this is a human-written screen).
- **No gradients on text, no glassmorphism, no neon.** A single very soft paper texture (2–3% noise) is enough to make surfaces feel physical.
- **Colour never carries meaning alone.** Mood, state and selection always have a shape or label too.

---

## 4. Typography

Two families: a **warm serif for anything Rustle writes** (notes, replies, recap cards, warm notes) and a **humanist sans for the interface**. A third, handwritten face is used *only* as a signature accent on replies and must be tested for legibility in French.

| Role | Recommendation | Fallback / alternative | Why |
|---|---|---|---|
| Rustle's words | **Literata** or **Source Serif 4** (variable) | Newsreader, Fraunces (softer, more character; test at small sizes) | A book serif makes text read as *written*, not generated. Full Latin Extended, good at 22–28 pt, free licences. |
| Interface | **Instrument Sans** or **DM Sans** | Inter (safe but colder), Plus Jakarta Sans | Humanist, slightly warm terminals, excellent at UI sizes, French diacritics correct. |
| Signature accent | A restrained handwriting face, used for "— Rustle" on replies only, never for body text | If it fails legibility at small sizes, use the serif in italics instead | Signals "someone left this", without making anything hard to read. |
| Numerals | Tabular in settings and steppers; proportional elsewhere | — | Times align in delivery settings. |

**Type scale** (base 17 pt; scales with Dynamic Type / font scale up to the accessibility sizes; layouts must reflow, not truncate):

| Style | Size / line height | Family | Use |
|---|---|---|---|
| `note-hero` | 26 / 34 | serif | Today hero note, first note |
| `note` | 20 / 28 | serif | Notes on the board, replies, recap text |
| `note-small` | 17 / 24 | serif | Earlier notes list, widget medium |
| `title` | 22 / 28, medium | sans | Screen titles |
| `body` | 17 / 24 | sans | Everything else |
| `label` | 15 / 20 | sans | Chips, secondary buttons |
| `caption` | 13 / 18 | sans | Timestamps, footers (never for anything important) |

**Rules**
- Body text never below 17 pt at the default scale; captions never carry required information.
- Note text has a max measure of about 34 characters per line on the hero card (short lines read as a note, long lines read as a paragraph).
- No all-caps labels. Sentence case everywhere, in both languages.
- Line height 1.4 minimum; French needs the same or slightly more.
- **Simple mode**: body 20 pt, note 24 pt, captions removed, one action per card.

---

## 5. Layout, surfaces and spacing

- **8-pt grid.** Screen gutters 20 pt. Cards have 20 pt inner padding.
- **Corner radius**: 18 pt for cards and sheets, 12 pt for chips, 24 pt for the hero card. Sticky notes on the board have a smaller 6 pt radius and a **slight rotation (−2° to +2°, seeded by note id)** so the board looks placed, not generated.
- **Shadows**: one soft, warm shadow (`rgba(60,45,30,0.10)`, y 6, blur 18) on cards on paper; in Night, shadows are replaced by a 1-px `line` border.
- **Paper texture**: a single subtle noise layer on `paper` and on sticky notes; nothing on text.
- **Density**: Today shows *one* hero note above the fold, then the rest. The board is a two-column grid at phone width, one column in Simple mode and at large text sizes.
- **Tab bar**: three tabs, icons with labels, sage for active. The "Send a warm note" action is a floating pill on Today, sage, with a label (icon-only floating buttons are not accessible enough for this audience).
- **Safe areas**: notes are never clipped by the notch or the home indicator; share cards keep text inside a 10% safe margin.

---

## 6. Motion and feedback

| Moment | Motion | Duration |
|---|---|---|
| Intro (cold start) | Wordmark and mark fade up in front of a tree at the edge of the screen: soft ink branches, sage leaves swaying in slow gusts, one letting go now and then; ~2 s, tap to skip; reduce-motion → tree still (doc 05 §2) | 1.6 s fade, 2 s total |
| App open (warm) | Paper settles; hero note fades up 8 pt | 400 ms, ease-out |
| First note being written | A pen line draws across a card, then the note appears line by line | 2–4 s (covers the real generation), can be skipped |
| A reply arrives | The reply note slides in and *sticks* onto the user's note with a small settle | 500 ms |
| ❤️ on a note | The heart fills; a single leaf drifts up and fades | 600 ms, no confetti |
| Check-in | Selected mark grows 10% and settles | 200 ms |
| Recap | Story cards with a slow crossfade; swipe to advance; no auto-advance | user-paced |
| Errors | Text appears in place; no shake, no red flash | 200 ms |

**Rules**
- Respect the system "reduce motion" setting: all transitions become fades.
- No bouncing, no spring overshoot above 5%, no pulsing badges, no confetti, no fire.
- Haptics: light, once, on ❤️ and on posting a note. Never on notifications from the app itself beyond the system default.
- Loading states are paper, not spinners: a faint card outline with "writing…" in `ink-2`.

---

## 7. Components

### 7.1 Note card (hero and board)
Paper `card` with the serif note text, a 13 pt caption line ("This morning · 08:00"), and up to three quiet actions: ❤️, share, more. The ❤️ and "Not quite" pair sits under the *first* note and under any note in a *review* state; elsewhere only ❤️ shows, with "Not quite" one tap deeper. Never show a paywall or upsell on a note card.

### 7.2 Sticky note (user's note on the board)
Pastel paper, small radius, slight rotation, the user's text in the serif, an optional mood mark in the corner, a pin glyph if pinned, and the 🤫 "just listen" glyph when set. Long text truncates at 6 lines with "more"; tapping opens the full note.

### 7.3 Note back (Rustle's reply)
A smaller `sage-wash` note attached to the bottom edge of the user's note, overlapping by 8 pt, serif text, signed "— Rustle" in the accent face or serif italics. Reactions ❤️ / "not quite" under it. It never has an input field under it. That absence is a design feature.

### 7.4 Check-in
Five marks in a row, abstract, not faces: a heavy cloud, a light cloud, a plain sky, a soft sun, a bright sun (or five ink dots of increasing warmth; the designer decides). Each has a label ("heavy", "low", "okay", "lighter", "good") in both languages, and VoiceOver reads the label. Below: one optional line, placeholder "one line, if you like".

### 7.5 Buttons
- **Primary**: sage fill, white text, 52 pt tall, full width on phones, sentence case ("Begin", "Keep going", "Leave a note").
- **Secondary**: ink text on paper with a `line` border.
- **Quiet**: text only in `ink-2` for "Not now" and "Skip". **Always the same size and weight as the secondary style**, never smaller than 15 pt, never grey-on-grey.
- **Destructive**: `remove` text, confirmation sheet with a sentence, never a red button.

### 7.6 Chips (onboarding, focus areas)
Pill, 12 pt radius, 44 pt tall minimum, `line` border, selected = `sage-wash` fill with a small check glyph *and* a colour change. Wrap to as many rows as needed. Designed at French length ("Perte d'emploi / stress au travail").

### 7.7 Progress (onboarding)
A thin `sage` line across the top, not numbered steps. It fills; it never shows "3 of 9" (counting feels like a form).

### 7.8 Paywall
Paper sheet, one headline in the serif ("Let me be there every day."; on day 7: "This week I was there every day. Want me to stay?"), three benefits with small glyphs, a plan selector with the annual plan preselected and the *monthly price per year shown honestly*, a trial timeline (today / day 5 reminder / day 7), one plain sentence stating what "Not now" gives ("Either way, you keep your notes and this week's Rustles."), a quiet "Things are tight right now?" line for the hardship offer, the legal links and "redeem a code", and a **"Not now"** button in the **secondary** style, not the quiet style. A one-line "Rustle is AI, not a person" caption at the bottom. No countdown, no "most people choose", no crossed-out fake prices. Copy source of truth: doc 09 §3.

### 7.9 Crisis card and screen
`calm` background band, white text at 20 pt, a human sentence first ("It sounds like tonight is very heavy. You don't have to carry this alone."), then large buttons: call, text, "other countries". No Rustle signature, no serif, no leaf. The screen must be readable with shaking hands and blurred vision: 56 pt buttons, one column.

### 7.10 "What Rustle remembers"
Plain list on paper, grouped, each item in the sans with an edit and a delete glyph. The design is deliberately ordinary: this is the control panel of trust, and it should look like a settings list, not a feature.

### 7.11 Empty states
A single line of copy in the serif, a small folded-note mark, nothing else. ("This is your space. Put anything here. I'll remember.")

---

## 8. Notifications and widgets

### 8.1 Notification
- **Title**: the user's name if they gave one and the lock-screen privacy setting is off; otherwise "A note from Rustle".
- **Body**: the note, under 180 characters, ending with 🌿 only if the tone preference allows.
- **Privacy on**: body is "🌿 A note is waiting for you." The text is shown only in the app. (The push itself never carries text in either state; the extension fills it in on-device, doc 07 §6. If the fetch fails, this generic line is what shows.)
- **Actions**: ❤️ and "Write a note". No "reply" field (see the no-chat principle).
- **Check-in notification**: "How's today?" with the five marks as actions where the platform allows, otherwise opens the app.
- Never a badge count on the app icon.

### 8.2 Widgets
- **Small**: paper, the latest note in `note-small`, no chrome. If privacy is on: the folded-note mark and "A note is waiting".
- **Medium**: note plus a caption ("this morning") and, if there's a key date in 7 days, a single soft line ("Thursday: the interview").
- **Large**: note, next key date, and "days you showed up for yourself" as a row of leaf marks, no numbers.
- **Lock screen** (iOS): one line, ink on the system material.
- Widget themes match the app theme; the free widget is Paper.

---

## 9. Share cards and warm-note pages

### 9.1 Share cards (9:16 and 1:1)
- Theme paper as background, the note in the serif at 32–40 pt, the folded-note mark small in a corner, "rustle.app" as a 12 pt watermark on free.
- Optional: the user's first name, off by default.
- The sensitive-content guard runs first (doc 05 §9); the "make it general" rewrite is one tap.
- Cards never show dates, mood values or memory items, only the note.
- Templates: Plain (paper), Leaf (a single leaf illustration in the corner), Night (dark). Premium adds the other themes.

### 9.2 Warm-note web page
A single centred paper card on a `paper` background, the note in the serif at 24 pt, "From Daria" (sender's first name only, optional), and below the card a quiet line: "Made with Rustle · notes that know what you're going through" with the store buttons. A small "Need support now?" link in the footer to international resources. `noindex`. Loads in under a second on 3G; OG image is the card itself.

---

## 10. Voice in the interface (microcopy)

Rustle's *notes* follow doc 08 §5.1. The *interface* has its own voice: plain, brief, kind, never chirpy.

| Do | Don't |
|---|---|
| "Begin" | "Let's go! 🚀" |
| "Not now" | "Skip" (feels like failing a step) / "No thanks, I don't want to feel better" |
| "Something went wrong. Your note is saved; I'll try again in a moment." | "Oops! 😅 Error 500" |
| "Keep your notes safe" | "Create an account" |
| "Delete this note? It will also be forgotten." | "Are you sure?!" |
| "Rustle is AI, and not a therapist or a crisis service." | "I'm just an AI 🤖" |
| "Not now", with the sentence above it saying what you keep | "Maybe later" on its own (hides that a path without paying exists) |

**Rules**
- No exclamation marks anywhere in the UI. (Notes may use one, rarely.)
- No guilt, no urgency, no "don't miss out", no "you haven't written in 5 days".
- No emoji in UI chrome; 🌿 only inside notes and in the privacy-on notification.
- The word **"affirmation" never appears in the product.** "Note", "a Rustle", "note back", "warm note", "check-in".
- Buttons name the outcome, not the mechanism ("Leave a note", not "Submit").
- **French**: "tu" by default, "vous" when chosen, consistently across *every* string, including errors and legal screens (a "vous" user must never be "tu"-ed by an error message). Sentence case; typographic apostrophes; non-breaking spaces before « ? ! : ; » ; Quebec vocabulary where the user's own words show it.
- Every string lives in `en.json` / `fr.json`; the French is written natively, then reviewed, never translated word for word.

---

## 11. Accessibility (non-negotiable)

- **Contrast**: text AA (4.5 : 1) everywhere; note text AAA (7 : 1) in Paper and Night (the tokens above achieve 13 : 1+).
- **Dynamic Type / font scale** to the largest accessibility sizes: cards grow, grids collapse to one column, nothing truncates silently.
- **Touch targets** 44 × 44 pt minimum; primary buttons 52 pt.
- **VoiceOver / TalkBack**: every note card reads "Note from Rustle, this morning: …"; sticky notes read the user's text then the reply; the check-in marks read their labels; decorative texture and leaves are hidden from the accessibility tree.
- **Reduce motion**: honoured (all transitions become fades; the writing animation becomes a static card).
- **Reduce transparency / increase contrast**: honoured (borders replace shadows; `ink-2` darkens).
- **Simple mode**: larger type, one column, no share or theme actions on cards, secondary features moved under "More".
- **Dictation** available in every text field; **read aloud** (system TTS) on every note in V1.1.
- **No time-limited UI.** Nothing auto-dismisses; recaps are swiped, not played.
- **Colour blindness**: mood marks differ in shape; selection has a check glyph; ❤️ filled vs outline, not colour alone.

---

## 12. Anti-patterns (things that would break the brand)

Streak fire and streak counters · confetti · red badges · countdown timers on paywalls · "Are you sure you want to give up on yourself?" · quotes over stock landscapes · neon or pastel-rainbow gradients · glassmorphism · a cartoon mascot · faces as mood scales · exclamation marks in UI · a text box under a reply · "Skip" in grey 11 pt · pure black or pure white surfaces · all-caps labels · asking for notifications or an account before the first note · any upsell on a crisis, elevated or heavy-note screen.

---

## 13. Design tokens (starter file for the app)

Give this to the designer as the starting point and to Claude Code as `packages/shared/tokens.ts`. Values are the ones checked in §3.

```json
{
  "color": {
    "paper":   { "light": "#F6F1E7", "dark": "#1C1A17" },
    "card":    { "light": "#FFFBF3", "dark": "#262320" },
    "ink":     { "light": "#2A2622", "dark": "#EFE8DC" },
    "ink2":    { "light": "#6B6259", "dark": "#A89F93" },
    "line":    { "light": "#E4DCCF", "dark": "#3A3630" },
    "sage":    { "light": "#4F6F52", "dark": "#9DBB9A" },
    "sageDeep":{ "light": "#3F5C42", "dark": "#B7CDB4" },
    "sageWash":{ "light": "#E3EAE0", "dark": "#2C3A2D" },
    "warm":    { "light": "#9E5238", "dark": "#D99A80" },
    "remove":  { "light": "#A24B3C", "dark": "#D9846F" },
    "calm":    { "light": "#2F5D62", "dark": "#8FBFC4" },
    "noteButter": { "light": "#F3E3A5", "dark": "#C9B77A" },
    "noteBlush":  { "light": "#F1D3C9", "dark": "#C7A79C" },
    "noteSage":   { "light": "#D8E3D0", "dark": "#A9B8A0" },
    "noteSky":    { "light": "#D5E1EA", "dark": "#A3B2BF" },
    "noteLilac":  { "light": "#E1D9EA", "dark": "#B3A9C0" }
  },
  "type": {
    "serif": "Literata",
    "sans": "Instrument Sans",
    "scale": {
      "noteHero": [26, 34], "note": [20, 28], "noteSmall": [17, 24],
      "title": [22, 28], "body": [17, 24], "label": [15, 20], "caption": [13, 18]
    }
  },
  "space": [4, 8, 12, 16, 20, 24, 32, 40],
  "radius": { "chip": 12, "sticky": 6, "card": 18, "hero": 24 },
  "shadow": { "card": { "color": "rgba(60,45,30,0.10)", "y": 6, "blur": 18 } },
  "motion": { "fast": 200, "base": 400, "slow": 600, "ease": "cubic-bezier(0.2, 0, 0, 1)" }
}
```

Dark values for `sageDeep` and the dark pastels are proposals; the designer should verify each against `ink` (dark) at ≥ 4.5 : 1 before use as text backgrounds.

---

## 14. Designer brief (what to ask for, in order)

1. **Wordmark and folded-note mark**, in one colour, tested at 16 px and as an app icon on light and dark wallpapers. Plus the **intro screen**: the leaf shapes and their motion (doc 05 §2); a live reference exists on the style board.
2. **Paper and Night themes** as full token sets, with the texture asset.
3. **Eight key screens** at phone width, in English *and* French, at default and at one accessibility text size: Welcome · onboarding step 2 (chips) · first note · Today · Notes board with a reply · New note sheet · What Rustle remembers · Paywall (soft). Plus the **crisis screen**.
4. **Notification and small/medium widget** mockups on a real lock screen and home screen.
5. **Share card** templates (9:16, 1:1) and the **warm-note web card**.
6. **Motion notes** for the first-note animation and the reply "stick".
7. Dawn theme once the base is approved.

Budget guidance from doc 06 (about €2–5k) is realistic for items 1–5; 6–7 may be a second small engagement.

---

## 15. How this connects to the build

- Tokens in `packages/shared/tokens.ts`; the app's `ThemeProvider` maps them to light/dark and to themes.
- Every component in `app/components` takes its colours from tokens, never hex literals (a lint rule can enforce it).
- Strings in `en.json` / `fr.json` follow §10; a lint rule can flag "!" and "affirmation".
- Contrast is checked in CI with a tiny script on the token file (the same calculation used to verify §3), so a theme can't ship below AA.
