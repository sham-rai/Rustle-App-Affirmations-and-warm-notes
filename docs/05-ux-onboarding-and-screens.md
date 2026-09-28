# 05 · UX: Onboarding, Screens & Flows

## 1. Information architecture

```
Welcome ─► Onboarding (≈2 min) ─► First note (the "wow") ─► Notification permission ─► Paywall (trial, or "Not now" → welcome week) ─► Home
                                                                                                          │
                ┌──────────────────────────────── Bottom tab bar (3 tabs) ────────────────────────────────┤
                │                                   │                                                     │
             TODAY                              NOTES BOARD                                              YOU
  today's note, earlier notes,            sticky-note grid, + new note,              journey/recap, what Rustle remembers,
  check-in card, share / warm note        replies from Rustle, search, pins          delivery settings, themes, account, help
```

Keep it to **three tabs**. Put "Send a warm note" as a floating action on Today and a button in the You tab, not a separate tab.

---

## 2. Intro and welcome

**Intro screen (every cold start, decided 2026-09-28):** the wordmark *rustle* and the folded-note mark on paper, with **a tree at the edge of the screen** behind them: trunk and branches in soft ink, a canopy of small leaves in sage, all at low opacity so the text stays the hero. The leaves **sway in slow, overlapping gusts and flutter on their own**, the branches move a little more toward the tips, and now and then a single leaf lets go and drifts down. Nothing is sharp or fast; it should feel like a still afternoon. The wordmark fades up over 1.6 s. It lasts about two seconds, then moves to Welcome (first launch) or Today (returning users); a tap skips it. No sound (the optional paper-rustle notification sound stays separate), no bounce, no logo animation. With reduce-motion on, the tree holds still and the wordmark fades only. On a warm start (app already in memory) it is skipped. The live reference is on the style board (doc 20 §6).

**Welcome screen (first launch, after the intro):**
- The leaves keep drifting, slower and fewer, behind the content.
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
| 4 | **"Is there a date coming up that matters?"** (exam, court date, appointment, anniversary). For anniversary and medical kinds, a second line asks: *"Want me to be with you on that day, or leave it quiet?"* (opt-in, `key_dates.remind`) | Date + label, "Add another" | `key_dates[]` (drives timed notes) |
| 5 | **"How are you feeling most days lately?"** | Five abstract marks with labels (heavy · low · okay · lighter · good; doc 20 §7.4), not faces | First `checkin` |
| 6 | **"What kind of words help you most?"** — Gentle & soft · Calm & grounded · Encouraging & strong · Honest & real · A little humour | Single/multi select | `prefs.tone` |
| 7 | **"What do you NOT want to hear?"** — Advice · Religious/spiritual phrases · "Stay positive" talk · Mentions of my ex · Nothing, all fine | Multi-select + text | `prefs.avoid[]` (hard constraints, very important for trust) |
| 8 | **"Something that makes you, you?"** — a strength, a person you love, something you enjoy (optional) | Free text | `memory.anchors[]` (grounding details for notes) |
| 9 | **"When should I leave notes?"** — Morning / Midday / Evening / Before sleep (pick one or more). Frequency isn't asked here: it defaults to two a day and lives in delivery settings as a premium control, so door-open users are never asked a question they can't act on | Time chips | `delivery_prefs.slots` |

Micro-copy between steps reflects back what the user said ("Thank you for trusting me with that."). **Validate, don't interrogate.**

**Variant to test** (doc 12 §6): steps 1–4 → first note → "does this feel right?" → steps 6–9 framed as "make it yours" → notification permission. The first note is then written in the neutral gentle register and tone/avoid shape the second note onward. Fewer steps before the wow may lift completion; the test decides.

**Language:** English and French at launch, with **Canadian French (fr-CA) as the primary French variant** (D25); France-French wording is reviewed before the European launch. Detect the device locale (fr-FR, fr-CA, fr-BE, fr-CH → French UI). Notes are written in whatever language the user writes in. French notes default to **"tu"**, the warm, informal register that friends use; a setting lets the user switch to "vous" (some users aged 45+ may prefer it, and it's asked about in onboarding step 6 for French users).

**Age gate (18+):** a date-of-birth picker (or "I'm 18 or older" confirmation) on the consent screen before onboarding. Under 18 → a kind "Rustle is for adults. Here are resources for younger people" screen with localised youth helplines. See the risks doc §5.

### The first note (the "wow" moment)

- A 2–4 second "writing your first note…" animation (paper and pen). The real LLM call happens here, with a pre-generated fallback ready.
- The note is displayed large, in the chosen theme. It **must reference something specific** from steps 2–4 and 8 (for example *"Mia, three weeks until your finals, and you're already here, taking care of yourself. That's the kind of person who makes it through. 🌿"*).
- Below it: ❤️ "This feels right" / ↻ "Not quite" (feedback for tone calibration).
- Then: **"Want me to leave notes like this at 8:00 and 21:00?"** → system notification permission prompt. *Asking after the value moment roughly doubles opt-in rates compared with asking on launch.*

### Paywall

Shown after the first note and notification permission, never in a session where onboarding text was `elevated` or `crisis`. Headline *"Let me be there every day."*, the 7-day trial on both plans, and a **"Not now"** button in the secondary style that leads to the **welcome week** (seven days of the full experience, no card). The paywall body says so plainly: *"Either way, you keep your notes and this week's Rustles."* Full spec in [09-monetization.md §3](09-monetization.md).

### Account prompt

**Not** in onboarding. See [07-technical-architecture.md §5](07-technical-architecture.md). The user starts anonymously, and we ask them to "Keep your notes safe" after a meaningful moment.

---

## 4. Today (Home)

- **Hero card:** the latest note, big and beautiful, on the user's theme. Actions: ❤️ · Share (Stories/image) · Save (collection) · "Send a warm note to someone".
- **"Earlier today / this week":** a small scroll of previous notes.
- **Check-in card** (2–4×/week, when due): "How's today?" with the five abstract marks (doc 20 §7.4) plus an optional line. Takes 10 seconds.
- **Date-aware banner:** "Tomorrow: your interview. I'll be with you in the morning."
- **Gentle footer:** "Today you showed up for yourself 12 times this month."

## 5. Notes board

- A **grid of sticky notes** (warm paper textures, user-choosable colours), with the newest first. Alternative list view.
- **+ New note**: a sheet with a text field, 🎤 (V2), mood tag (optional), and the 🤫 "Just listen, no reply" toggle.
- **Rustle's reply** appears as a small handwritten-style note *attached* to the user's note (like a note stuck onto another), with a soft push: "Rustle left a note on what you wrote."
- **The first note back is a small event:** the reply slides in and *sticks* onto the note (doc 20 §6), and a one-time line appears under it: *"I'll sometimes leave a note back. Turn on 'Just listen' if you'd rather I didn't."* Door-open users see, on their second note of the week, a quiet card in the same place: *"I read this. Want a note back on everything you write?"* (doc 09 §3).
- Long-press: Pin · Hide from recaps · Forget this · Edit · Delete.
- Search, and filter by life area / month.
- Empty state: "This is your space. Put anything here: a fear, a win, a random thought. I'll remember."

## 6. You

Order matters: the first two rows carry visual weight; account and help sit at the bottom.

- **What Rustle remembers:** a readable list of memory items grouped by People · Dates · Situations · Things that help · Things to avoid. Each can be edited or deleted. Toggle: "Pause memory".
- **Your journey:** the monthly recap entry point, and "Look how far you've come" (unlocked at day 30, shown as a countdown before that).
- **Notes delivery:** times, frequency (premium; shown disabled with one line in door-open), quiet hours, "adapt to me" (AI adjusts timing), weekend mode, quiet season on/off.
- **Focus areas:** life areas with weights ("more about my recovery, less about work").
- **Tone:** re-pick tone and avoid-list.
- **Themes & widget:** themes, fonts, widget styles.
- **Account & data:** sign in / link account, backup status, export (JSON + PDF), delete account, privacy, consents, subscription (with a clear « Résilier mon abonnement » entry that deep-links to the store), redeem a code.
- **Help:** crisis resources (localised), FAQ, contact.
- **About:** "Made in Ontario, Canada 🍁 · Your notes are stored in Canada", the AI disclosure ("Rustle is AI, not a therapist or a crisis service"), version, licences.

## 7. Notifications

- **Format:** two states. Privacy off: the title is the user's name or nothing, the body is the note itself (≤ 180 characters so it isn't truncated), e.g. *"Thursday's the interview. You already did the brave part: you applied. 🌿"*. Privacy on: the title is "A note from Rustle" and the body "🌿 A note is waiting for you." The push itself carries no text (doc 07 §6); the iOS extension and the Android app fill it in on-device.
- **Lock-screen privacy:** "Hide note text on lock screen". **Defaults to on** when the life areas include divorce or separation, abuse, illness or grief, with one line explaining why and a switch to reveal; off otherwise. This matters most for the people least likely to find a setting.
- **Actionable notification:** iOS/Android actions ❤️ / "Write a note".
- **Check-in notification:** "How's today? Tap 1–5" with inline actions.
- **Anti-annoyance:** if the last 5 notifications went unopened, halve the frequency (floor: one every two days) and show a gentle in-app message; any ❤️, note or check-in restores the user's setting.

## 8. Widgets

- **iOS (WidgetKit):** small (a short line of the latest note), medium (note plus date), large (note plus next key date), lock-screen (short line). Refreshes when a new note arrives (via app-group shared storage plus a timeline reload).
- **Android (Glance):** 2×2 and 4×2 versions.
- Tap → opens Today.
- Widget themes match the app theme (premium).

## 9. Share cards

- 9:16 (Stories) and 1:1 (post) images rendered on-device from the note plus theme.
- **Sensitive-content guard:** before sharing, a warning if the note mentions names, health or other personal details ("This note mentions Maya and your surgery. Share anyway?"), plus a one-tap "make it general" rewrite.
- A small watermark, "rustle.app", as growth attribution.

## 10. "Send a warm note" flow

1. "Who's it for?" (first name or nickname, optional) → 2. "What are they going through?" (chips: exam · breakup · illness · new job · grief · just because · other + one line) → 3. The AI drafts 3 options → 4. Edit → 5. Pick a card style → 6. Share sheet (WhatsApp/iMessage/Telegram/Instagram/copy link).

The recipient's web page shows the note and card, then "Made with Rustle: notes that know what you're going through" → App Store/Play button (deep link with referral attribution).

## 11. Accessibility & older users

- Dynamic Type / font scaling throughout; minimum 16pt body text.
- A high-contrast theme and a **Simple mode**: body 20 pt and note text 24 pt, one column everywhere, one action per card (❤️ only; share and themes move under "More"), no captions, no board colours, the check-in as five large labelled marks, and the tab bar labels enlarged. It's a switch in the You tab and is suggested once when the system text size is at an accessibility level.
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

**Dark mode follows the system by default** and is not a theme: many hard moments are at 11 p.m. "Night" is the textured dark theme on top of it. Paper, Dawn and Night are free for everyone; Garden, Linen, Tide and seasonal themes are premium (doc 20 §3.3, doc 09 §2).

---

## 13. Week one: the experience from day 1 to day 7

Onboarding is designed in detail; D7 retention depends on what follows it. Two paths, one rhythm. Every item below is a delivery intent the planner already knows (doc 08 §3.3).

| Day | Trial / premium | Welcome week (tapped "Not now") |
|---|---|---|
| **1** | First note (the wow). Evening seed Rustle references something from onboarding. | Same. |
| **2** | Morning Rustle. A one-line nudge on Today: *"The board is yours. Put anything there."* First check-in card. | Same. |
| **3** | Rustle at the chosen slots. If the user wrote a note, the **first note back** (the small event, §5). If not, the evening Rustle ends with an open door, never a question: *"If anything's on your mind, the board's there."* | Same. |
| **4** | Normal rhythm. Date-eve note if a key date is near. | Same. |
| **5** | **"Keep your notes safe"** prompt after the morning Rustle (doc 07 §5). Trial users: day-5 trial reminder notification. | "Keep your notes safe" prompt. Evening Rustle mentions, softly, that the week is nearly up: *"Two more days of this, then you decide. No rush."* |
| **6** | Normal rhythm. First **win celebration** if the extractor found one. | Same. |
| **7** | A small **"one week"** Rustle: one thing they said on day 1, one thing that happened since. Trial ends; premium continues. | The "one week" Rustle, then the **day-7 paywall** (doc 09 §3). "Not now" again → door open: seed nothing, one presence Rustle a week, key dates, one note back a week. |

Rules for the week: no more than one prompt of any kind (backup, paywall, permission) per day; nothing in a session that opened from a heavy note; the check-in card appears at most twice; and the door-open transition on day 7 is stated in one calm sentence, never as a loss.
