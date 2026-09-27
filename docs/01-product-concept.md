# 01 · Product Concept & Analysis

> **Working name:** Rustle (see [03-naming.md](03-naming.md))
> **Thesis:** *Less generation, more relationship.* Any app can call an AI. The product is **what the app knows about you** — and the feeling of being known.

---

## 1. What Rustle is (and is not)

**Rustle is** a mobile companion that writes short, personal support messages from what you tell it, and delivers them quietly: through notifications, a home-screen widget and the main screen. It remembers everything you share and shows that it remembered, softly and later on, the way a good friend does.

**Rustle is not:**
- a therapist, a coach or a medical product (no diagnosis, no treatment, no "you should…"),
- a chatbot you talk to for hours (that's a deliberate choice, explained in §5.1),
- a library of generic quotes grouped by category.

### The one-sentence pitch
> *Rustle is the friend in your pocket who remembers what you're going through and leaves you a small warm note at the right moment.*

### The core loop

```
   SHARE                    REMEMBER                   RETURN
 (onboarding,      →     (memory engine turns    →   (a personal note arrives:
  check-ins,              what you said into          notification / widget /
  notes board)            facts, threads, dates)      main screen)
       ↑                                                     │
       └────────── feeling seen → sharing more ──────────────┘
                              │
                     REFLECT (monthly "Look how far you've come")
```

Each rotation makes the product better **for that user specifically**. That's the moat: after three months a new competitor can't replicate what Rustle knows about you, and you wouldn't want to start over.

---

## 2. The problem

1. **Generic affirmations feel hollow.** "I am worthy of love" doesn't help much when your actual problem is "my thesis defence is Thursday and my supervisor ignores my emails." Category apps (I am, Motivation, ThinkUp) pick from a pre-written pool. People tolerate that because it's cheap and pretty, but it doesn't make them feel *seen*.
2. **AI chat apps ask too much of people.** ChatGPT, Replika, Pi and similar apps expect you to start and keep up a conversation. People who are struggling often don't have the energy for that. They want to *drop* a thought and be cared for, not to talk.
3. **Journaling apps are one-way.** You write, and nothing comes back. Around 70–80% of journaling habits die within weeks because nothing responds.
4. **Therapy is expensive, slow and heavy** for someone who's just having a hard month. There's a large gap between "I'm fine" and "I need a professional."
5. **Hard periods erase your sense of progress.** After a breakup, a layoff or an illness, people forget how much they've already survived. Nobody keeps the record for them.

## 3. The solution: four pillars

| Pillar | What the user experiences | What makes it different |
|---|---|---|
| **Listen** | 2-minute onboarding, 30-second check-ins, a Notes board for any thought at any time | Low effort to share, no blank-page pressure, no conversation to keep up |
| **Remember** | "Rustle knew my exam was today." Nothing is ever lost | A structured memory engine (facts, threads, dates, people, wins), not just chat history |
| **Return** | 1–5 warm, specific notes a day, timed to your life | Personal and timely: it mentions the actual thing, on the actual day |
| **Reflect** | Monthly "Look how far you've come" story | Your own growth told back to you, using your own words |

### Design principles (use these to settle product arguments)

1. **Specific beats pretty.** One sentence that mentions your sister's surgery beats a beautiful gradient with a quote.
2. **Show memory quietly.** Never say "According to my records…". Say "Thursday's the interview. You already did the hardest part by applying."
3. **No advice unless asked.** Validate, reflect and encourage. Don't instruct, diagnose or fix.
4. **Low effort for the user.** Every input should take less than 60 seconds. Every output should take less than 10 seconds to read.
5. **Nothing is deleted by us.** The user owns their history. We never lose it, and they can delete or export it whenever they want.
6. **Human, not machine.** Warm, imperfect and brief. Sometimes it's just "Thinking of you today." Never robotic, never over-enthusiastic.
7. **Safety over engagement.** We never optimise for time-in-app and never create dependency. We point people to real help when it's needed.

---

## 4. Target users & personas

**Age range: 18–60** (18+ only; see [14-audience-and-segments.md](14-audience-and-segments.md) for the full segment analysis). Rustle is for *anyone going through something*, but marketing to "everyone" is marketing to no one. **Launch with 2–3 sharp personas** and let the rest discover it.

| Persona | Situation | What they need from Rustle | Acquisition channel |
|---|---|---|---|
| **Mia, 18–24, student** | Exams, moving out, first heartbreak, comparison anxiety | "Someone gets that this week is brutal." Exam-day notes. | TikTok, Instagram Reels, student ambassadors |
| **Daniel, 28–40, after a breakup or divorce** | Nights are hard, friends are tired of hearing about it | Not being judged, a sense of progress, not feeling alone at 11pm | Reddit (r/BreakUps, r/Divorce), podcasts, SEO |
| **Olena, 30–45, after a layoff / career setback** | Shame, job hunting, rejection emails | Encouragement that names the real thing, small wins tracked | LinkedIn creators, career newsletters |
| **Ruth, 50–60, illness or caregiving** | Treatment, caring for a parent, loneliness | Gentle, simple, large text, reliable morning note | Facebook groups, caregiver communities, "send to a parent" |
| **The sender** (any age) | A friend is going through something | An easy way to send a warm note | Viral loop inside the app |

**Recommended launch focus:** see the segment analysis in [14-audience-and-segments.md](14-audience-and-segments.md). In short: the **product** serves all ages from 18 to 60 equally, but **marketing** leads with *life moments* rather than age groups (heartbreak/divorce, exams/early career, job loss), because a breakup at 22 and a divorce at 48 need the same thing: to feel heard.

### Jobs-to-be-done
- *When I'm going through something hard and don't want to burden my friends, I want to put it somewhere safe **and get something kind back**, so I feel less alone.*
- *When I'm about to face a hard moment (exam, court date, scan results), I want encouragement that knows what I'm facing, so I feel braver.*
- *When I think I'm not making progress, I want proof of how far I've come, so I keep going.*
- *When someone I love is struggling, I want to send them something warm that doesn't feel like a generic meme.*

---

## 5. Feature analysis & recommendations

Every idea from the brief is assessed below. **Verdict key:** ✅ MVP · 🟡 V1.x (soon after launch) · 🔵 V2+ · ❌ don't build.

| Feature | Verdict | Reasoning |
|---|---|---|
| Welcome + 2-min onboarding (open + multiple-choice) | ✅ | This is where the first "wow" happens. The first note must already mention something the user said. |
| Personalised affirmation on main screen | ✅ | Core output. |
| Daily notifications, adjustable time & frequency | ✅ | The core delivery channel. 1–3/day on free, up to 5 on premium. |
| Notes board (share any thought) | ✅ | The core input and the memory fuel. |
| **Reply to notes** | ✅ (as "a note back", not chat) | See §5.1. This is the magic moment. Without it the board is a void. |
| Check-ins (quick mood + one line) | ✅ | Cheap, structured signal. 2–4 per week, prompted inside a notification. |
| Memory ("it quietly remembers") | ✅ | *This is the product.* See [08-ai-and-prompts.md](08-ai-and-prompts.md). |
| iOS & Android widget | ✅ (iOS first, Android shortly after) | Very high retention value. Top apps in this category live on the home screen. |
| "Look how far you've come" monthly recap | 🟡 (first recap at day 30) | Needs 30 days of data, so ship it about 4 weeks after launch. It's also a major sharing moment. |
| "Send a hug" to a friend | ✅ (simple version) | The main viral loop. Rename it; see §5.3. |
| Share to Stories / post | ✅ | Beautiful 9:16 image cards. Cheap to build and a growth driver. |
| Screen design customisation (themes, fonts) | ✅ (3–5 themes) → 🟡 more | Themes are a proven premium lever in I am / Motivation. |
| Categories | ❌ as a picker / ✅ as "focus areas" | Categories are exactly what makes competitors generic. Use **life areas** detected by the AI (exams, love, health, work) that the user can see and adjust ("Focus more on: my recovery"). |
| Journal with instant AI feedback | 🔵 merged into Notes | Don't build a separate journal. The Notes board *is* the journal, with a "write longer" mode. Two input surfaces confuse people and split the memory. |
| Voice (speak a note, hear an affirmation) | 🔵 V2 | Voice-in (speech-to-text) is cheap and helps older users. Voice-out (TTS in a warm voice) is a lovely premium feature. Not needed to prove the core. |
| Meditation | ❌ (maybe a 60-sec "breathing moment" in V2) | Calm and Headspace own meditation with huge content budgets. It dilutes the positioning. A tiny personalised breathing moment ("Before your exam: breathe with me for 60 seconds") fits; a meditation library doesn't. |
| Mood tracking graphs | 🟡 light | Useful for the monthly recap, but don't turn Rustle into Daylio. |
| Streaks | ⚠️ gentle only | Classic streaks create guilt, which is the opposite of our promise. Use "days you showed up for yourself", with no breaking and no shame. |
| Human-like "thinking of you" nudges on important dates | ✅ | Reminders tied to the dates the user mentioned (exam day, anniversary of the loss). This is the memory shown quietly. |
| Web/desktop version | 🔵 | Not needed for this use case. |
| Apple Watch / Wear OS | 🔵 | A nice glanceable surface later. |
| B2B (universities, outplacement, HR) | 🔵 | A real revenue channel later. See roadmap. |

### 5.1 Should Rustle reply to notes? **Yes, but as a "note back", not a chat.**

> **The no-chat principle (a core product rule)**
> Rustle is **not a chatbot**. There's no message thread and no "type here to talk to Rustle" box, and there's no endless back-and-forth.
> - **Chat app (ChatGPT, Replika, Pi):** you write → it answers instantly → you answer → it answers… You have to keep the conversation going, and it can go on for hours.
> - **Rustle:** you leave a note (like a sticky note on a board) → a while later Rustle may leave **one** short note back → that's it. If you want to say more, you write a *new* note. Rustle also comes to you on its own through daily notes, without you having to start anything.
>
> Why: (1) people who are struggling often don't have the energy to keep a conversation going; (2) one thoughtful note feels more precious than a stream of instant replies; (3) it prevents unhealthy dependency on an AI "friend"; (4) new laws in New York, California and the EU target *chat* companions, so a non-chat design carries less legal risk; (5) it's roughly 5–10× cheaper to run; (6) it sets Rustle apart from the hundreds of AI chat apps.

This is the biggest open product question. Recommendation:

- When a user posts a note, Rustle **may** leave **one short reply card** under it: 1–3 sentences that reflect, validate and sometimes gently encourage.
- **The reply doesn't arrive instantly.** It comes after a short human-like delay (a few minutes to about an hour; configurable). Instant replies feel like a machine, and delayed replies feel like someone read it. For heavy notes the reply is quicker.
- **There's no text box to reply back.** The user can react (❤️ "this helped" / "not quite") or write a *new* note. This keeps Rustle a **presence rather than a conversation**, which:
  - protects the positioning ("not another chatbot"),
  - cuts AI cost roughly 5–10× compared with chat,
  - keeps Rustle out of much of the "AI companion chatbot" regulation (California SB 243, New York's companion law) and makes dependency less likely,
  - makes each reply feel more precious.
- **A "Just listen" toggle per note** (🤫). The user can post a note and ask for no reply: "I just wanted to put it down." Rustle still remembers it. This respects people who don't want feedback.
- **Later notes show that it remembered:** "You wrote on Monday that the silence at home is loud. I hope tonight is a little softer."

### 5.2 Journal: merge it into Notes

A separate journal means two input surfaces, two mental models and split memory. Instead:
- Notes support any length, from one line to long entries.
- Optional **gentle prompts** appear when the board is empty ("What's taking up space in your head today?").
- Notes can be **pinned**, tagged by the AI (life area, people, mood) and searched.
- Later: a "Journal view" filter that shows long notes as a timeline.

### 5.3 "Send a hug": naming and mechanics

"Send a hug" is sweet but ambiguous (is it a gif? a vibration?). Options:

| Name | Pros | Cons |
|---|---|---|
| **Send a warm note** | On-brand (it's in the repo name), clear, makes the brand a noun ("send someone a Rustle note") | A bit long |
| **Pass it on** | Pay-it-forward feeling, short | Less clear |
| **Leave a note for someone** | Human, clear | Long |
| Send a hug | Emotional | Unclear, a bit cheesy |

**Recommendation: "Send a warm note."** Mechanics:
1. The user picks a situation ("They have an exam", "Going through a breakup", "Just because") and can add one line about the person. **We don't need or store the friend's contact details.**
2. The AI writes a note in the sender's voice. The user can edit it.
3. Rustle generates a beautiful card plus a link (`rustle.app/n/abc123`) and hands it to the system share sheet (WhatsApp, iMessage, Telegram, Instagram DM…).
4. The recipient opens a **lovely web page** (no install needed) with the note and a gentle CTA: *"Want notes like this for yourself? Rustle writes them from what you're going through."*
5. **This is the #1 growth loop.** Each sent note is a free, personal ad delivered by a friend.

Privacy: the friend never receives the sender's own notes or memory. The link expires or can be revoked, and the page has no tracking beyond basic attribution.

### 5.4 "Look how far you've come"

- **When:** automatically at day 30, then monthly. Also on demand after 30 days.
- **What:** a 6–10 card, Stories-style recap:
  1. "A month ago you told me…" (their own words from onboarding)
  2. Hard things they faced (exam, first weekend alone, rejection email)
  3. Things they did anyway (small wins pulled from notes and check-ins)
  4. Mood trend (soft visual, no clinical charts)
  5. A line they wrote that shows growth
  6. A closing note: what Rustle hopes for them next month
- **Shareable** as an anonymised card ("This month I survived 3 exams and 1 heartbreak 🌿"). Growth moment #2.
- **Sensitive:** the user can hide topics from recaps. Never surface the darkest notes without consent. Recaps must never make someone feel they're "not improving fast enough."

### 5.5 "Everything is remembered, nothing disappears"

Philosophically beautiful, but it needs care:
- **Remember by default** and make it visible: a "What Rustle remembers" screen where the user can read, edit and delete memories. This builds trust and is required by GDPR anyway.
- **Forget on request:** "Forget this" on any note or memory item, and "Pause memory" mode.
- **Hard delete account:** everything is wiped within 30 days (legal requirement). "Nothing disappears" means *we* never lose it, not that the user can't delete it.
- **Fading:** old context naturally weighs less in generation (a breakup from 18 months ago shouldn't appear in every note), but stays available for recaps.

---

## 6. Tone of voice

Rustle sounds like **a calm, kind friend who is a good listener**. Imagine a warm older sibling who writes short notes on the fridge.

| Do | Don't |
|---|---|
| "Thursday's the big day. You've prepared more than you think." | "You've got this!!! 💪🔥 Believe in yourself!" |
| "It makes sense that tonight feels heavy." | "Everything happens for a reason." |
| "You wrote that you went for a walk. That counts." | "Have you tried meditation and exercise?" |
| "Thinking of you today." | "As an AI, I care about your wellbeing." |
| Short. 1–3 sentences. | Paragraphs. Lists. Lectures. |

Emojis are minimal and optional (🌿 at most). There's no toxic positivity: pain gets acknowledged before encouragement. The text matches the user's language and register, and can use the name they gave.

---

## 7. What success looks like

- A user says: **"How did it know?"**, which is our north-star feeling.
- **North-star metric:** *weekly "felt seen" moments.* That's the number of users who react ❤️ to a note, write a new note or open a notification each week (see [12-metrics-and-analytics.md](12-metrics-and-analytics.md)).
- D30 retention above 20% (the category average is roughly 3–8%).
- At least 15% of monthly active users send a warm note to a friend in their first month.

## 8. Honest assessment: does it have a chance?

**Yes, with caveats.**

**Why it can work**
- The market is proven. Affirmation apps make tens of millions of dollars a year with *generic* content, so a personalised version is an obvious step up.
- The timing is right. LLMs are now cheap and good enough to write warm, specific, short text for a few cents per user per month.
- A real moat forms over time: per-user memory builds switching costs that category apps can't match.
- There are built-in viral mechanics (warm notes, recaps, Stories cards).
- There's an emotional word-of-mouth product story ("it remembered my exam").

**What could kill it**
1. **Big players add memory.** ChatGPT, Gemini and Apple Intelligence already have memory. *Mitigation:* they're general-purpose and pull-based (you have to open them). Rustle is push-based, specialised, beautiful and emotionally designed. Speed and brand matter.
2. **Other small AI-affirmation apps.** Several exist, and more will launch. *Mitigation:* depth of memory plus craft of tone plus growth loops. Most of them are thin wrappers.
3. **Retention cliff.** Notification apps get muted. *Mitigation:* quality per notification, adaptive frequency, the widget and date-aware notes.
4. **Safety incident.** A vulnerable user gets a bad response. *Mitigation:* the safety layer in [11-risks-edge-cases-safety.md](11-risks-edge-cases-safety.md). This is non-negotiable.
5. **Unit economics.** AI cost against low willingness to pay. *Mitigation:* the cost model in [09-monetization.md](09-monetization.md) keeps AI cost under 10–15% of revenue.

**Realistic outcomes (indie/small team, 18–24 months):**
- *Conservative:* 20–50k downloads, 1–2k paying users, about $3–8k MRR. A healthy side business.
- *Base:* 150–300k downloads, 6–12k paying, about $25–50k MRR.
- *Breakout (a TikTok hit plus a strong viral loop):* 1M+ downloads, $150k+ MRR. That's rare, but this category has produced it (I am, Finch, How We Feel).

The difference between these outcomes is mostly **distribution and retention**, not technology.
