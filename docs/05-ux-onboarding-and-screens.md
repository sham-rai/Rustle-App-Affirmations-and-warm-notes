# 05 · UX: Onboarding, Screens & Flows

## 1. Information architecture

```
Welcome ─► Onboarding (≈2 min) ─► First note (the "wow") ─► Notification permission ─► Paywall (soft) ─► Home
                                                                                                          │
                ┌──────────────────────────────── Bottom tab bar (3 tabs) ────────────────────────────────┤
                │                                   │                                                     │
             TODAY                              NOTES BOARD                                              YOU
  today's note, earlier notes,            sticky-note grid, + new note,              journey/recap, what Rustle remembers,
  check-in card, share / warm note        replies from Rustle, search, pins          delivery settings, themes, account, help
```

Keep it to **three tabs**. Put "Send a warm note" as a floating action on Today and a button in the You tab, not a separate tab.

---

## 2. Welcome screen

- Slow, soft animation (for example leaves rustling, or paper notes drifting).
- Headline: **"Notes that know what you're going through."**
- Sub: *"Tell me a little. I'll remember, and leave you something kind when you need it."*
- Buttons: **Begin** · small "I already have an account" (sign-in for reinstall/restore).
- Footer: "Not a medical service. If you're in crisis, [get help now]."

---

## 3. Onboarding: ~2 minutes, 9 steps

Goal: collect **enough** for a first note that is **clearly personal**, and set expectations. Aim for about 60% tap answers and 40% optional typing. Show a soft progress bar. Every open question can be skipped.

| # | Screen | Type | Purpose / Stored as |
|---|---|---|---|
| 1 | **"What should I call you?"** | Text (optional) | `profile.display_name` |
| 2 | **"What's going on in your life right now?"** (pick up to 3) — Exams/studies · A breakup · Divorce/separation · Health or illness · Caring for someone · Lost my job / work stress · Grief · Moving / big change · Loneliness · Just a hard time · Something else | Multi-select chips | `memory.life_areas[]` |
| 3 | **"Tell me a bit more, in your own words."** Placeholder changes based on step 2 (for example "My exam is on… and I'm worried about…") | Free text (skippable), 🎤 dictation | First **note** + memory extraction |
| 4 | **"Is there a date coming up that matters?"** (exam, court date, appointment, anniversary) | Date + label, "Add another" | `memory.key_dates[]` (drives timed notes) |
| 5 | **"How are you feeling most days lately?"** | 5-point emoji/colour scale | First `checkin` |
| 6 | **"What kind of words help you most?"** — Gentle & soft · Calm & grounded · Encouraging & strong · Honest & real · A little humour | Single/multi select | `prefs.tone` |
| 7 | **"What do you NOT want to hear?"** — Advice · Religious/spiritual phrases · "Stay positive" talk · Mentions of my ex · Nothing, all fine | Multi-select + text | `prefs.avoid[]` (hard constraints, very important for trust) |
| 8 | **"Something that makes you, you?"** — a strength, a person you love, something you enjoy (optional) | Free text | `memory.anchors[]` (grounding details for notes) |
| 9 | **"When should I leave notes?"** — Morning / Midday / Evening / Before sleep, and 1–5 per day | Time chips + stepper | `prefs.schedule` |

Micro-copy between steps reflects back what the user said ("Thank you for trusting me with that."). **Validate, don't interrogate.**

**Language:** English and French at launch. Detect the device locale (fr-FR, fr-CA, fr-BE, fr-CH → French UI). Notes are written in whatever language the user writes in. French notes default to **"tu"**, the warm, informal register that friends use; a setting lets the user switch to "vous" (some users aged 45+ may prefer it, and it's asked about in onboarding step 6 for French users).

**Age gate (18+):** a date-of-birth picker (or "I'm 18 or older" confirmation) on the consent screen before onboarding. Under 18 → a kind "Rustle is for adults. Here are resources for younger people" screen with localised youth helplines. See the risks doc §5.

### The first note (the "wow" moment)

- A 2–4 second "writing your first note…" animation (paper and pen). The real LLM call happens here, with a pre-generated fallback ready.
- The note is displayed large, in the chosen theme. It **must reference something specific** from steps 2–4 and 8 (for example *"Mia, three weeks until your finals, and you're already here, taking care of yourself. That's the kind of person who makes it through. 🌿"*).
- Below it: ❤️ "This feels right" / ↻ "Not quite" (feedback for tone calibration).
- Then: **"Want me to leave notes like this at 8:00 and 21:00?"** → system notification permission prompt. *Asking after the value moment roughly doubles opt-in rates compared with asking on launch.*

### Paywall (soft)

Shown after the first note and notification permission. See [09-monetization.md](09-monetization.md). It must be dismissable ("Continue with free").

### Account prompt

**Not** in onboarding. See [07-technical-architecture.md §5](07-technical-architecture.md). The user starts anonymously, and we ask them to "Keep your notes safe" after a meaningful moment.

---

## 4. Today (Home)

- **Hero card:** the latest note, big and beautiful, on the user's theme. Actions: ❤️ · Share (Stories/image) · Save (collection) · "Send a warm note to someone".
- **"Earlier today / this week":** a small scroll of previous notes.
- **Check-in card** (2–4×/week, when due): "How's today, 1 to 5?" plus an optional line. Takes 10 seconds.
- **Date-aware banner:** "Tomorrow: your interview. I'll be with you in the morning."
- **Gentle footer:** "Today you showed up for yourself 12 times this month."

## 5. Notes board

- A **grid of sticky notes** (warm paper textures, user-choosable colours), with the newest first. Alternative list view.
- **+ New note**: a sheet with a text field, 🎤 (V2), mood tag (optional), and the 🤫 "Just listen, no reply" toggle.
- **Rustle's reply** appears as a small handwritten-style note *attached* to the user's note (like a note stuck onto another), with a soft push: "Rustle left a note on what you wrote."
- Long-press: Pin · Hide from recaps · Forget this · Edit · Delete.
- Search, and filter by life area / month.
- Empty state: "This is your space. Put anything here: a fear, a win, a random thought. I'll remember."

## 6. You

- **Your journey:** the monthly recap entry point, and "Look how far you've come" (unlocked at day 30, shown as a countdown before that).
- **What Rustle remembers:** a readable list of memory items grouped by People · Dates · Situations · Things that help · Things to avoid. Each can be edited or deleted. Toggle: "Pause memory".
- **Notes delivery:** times, frequency, quiet hours, "adapt to me" (AI adjusts timing), weekend mode.
- **Focus areas:** life areas with weights ("more about my recovery, less about work").
- **Tone:** re-pick tone and avoid-list.
- **Themes & widget:** themes, fonts, widget styles.
- **Account & data:** sign in / link account, export (JSON + PDF), delete account, privacy.
- **Help:** crisis resources (localised), FAQ, contact.

## 7. Notifications

- **Format:** the title is the user's name or nothing; the body is the note itself (≤ 180 characters so it isn't truncated). Example: *"Thursday's the interview. You already did the brave part: you applied. 🌿"*
- **Lock-screen privacy:** option to "Hide note text on lock screen" (shows "A note from Rustle 🌿"). This matters for sensitive topics such as divorce or illness.
- **Actionable notification:** iOS/Android actions ❤️ / "Write a note".
- **Check-in notification:** "How's today? Tap 1–5" with inline actions.
- **Anti-annoyance:** if the last 5 notifications went unopened, reduce frequency automatically and show a gentle in-app message.

## 8. Widgets

- **iOS (WidgetKit):** small (a short line of the latest note), medium (note plus date), large (note plus next key date), lock-screen (short line). Refreshes when a new note arrives (via app-group shared storage plus a timeline reload).
- **Android (Glance):** 2×2 and 4×2 versions.
- Tap → opens Today.
- Widget themes match the app theme (premium).

## 9. Share cards

- 9:16 (Stories) and 1:1 (post) images rendered on-device from the note plus theme.
- **Sensitive-content guard:** before sharing, a warning if the note mentions names, health or other personal details ("This note mentions Anna and your surgery. Share anyway?"), plus a one-tap "make it general" rewrite.
- A small watermark, "rustle.app", as growth attribution.

## 10. "Send a warm note" flow

1. "Who's it for?" (first name or nickname, optional) → 2. "What are they going through?" (chips: exam · breakup · illness · new job · grief · just because · other + one line) → 3. The AI drafts 3 options → 4. Edit → 5. Pick a card style → 6. Share sheet (WhatsApp/iMessage/Telegram/Instagram/copy link).

The recipient's web page shows the note and card, then "Made with Rustle: notes that know what you're going through" → App Store/Play button (deep link with referral attribution).

## 11. Accessibility & older users

- Dynamic Type / font scaling throughout; minimum 16pt body text.
- A high-contrast theme and a "Simple mode" (larger text, fewer elements).
- Full VoiceOver/TalkBack labels; notes read aloud (system TTS) as a V1.x feature.
- Dictation available in every text field.
- No time pressure anywhere in the UI.

## 12. Design direction (options to decide on)

| Direction | Feel | Fits |
|---|---|---|
| **Paper & ink** (sticky notes, handwritten accents, warm off-white) | Human, intimate, "a note from a friend" | Rustle. **Recommended.** |
| **Soft nature** (leaves, dawn gradients, gentle motion) | Calm, hopeful | Zorya, Rustle |
| **Ocean / spiral** (shell, deep blues, growth spiral) | Depth, growth | Nautila |
| **Celestial** (night sky, stars) | Dreamy, comforting at night | Celeste |

Recommended: **Paper & ink as the base, with nature-inspired themes** as the premium theme set. It makes the "note from someone who cares" metaphor concrete and sets Rustle apart from the gradient-plus-quote look of competitors.
