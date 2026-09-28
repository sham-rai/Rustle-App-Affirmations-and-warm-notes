# 19 · Pre-build Review: Rustle from Every Seat

> **Purpose:** a structured review of docs 01–18 *before any code is written*, done from the seats a real team would fill: the person the app is for, product owner, product manager, business analyst, engineering, security/legal, UX, marketing and finance. Each section ends with **changes** (what to alter in the docs or plan) and **questions** (what only the founder can answer).
> **Companion:** [20-style-guide.md](20-style-guide.md) covers visual and verbal style.
> **How to use it:** read §0, decide on the questions in §12, then apply the change list in §11 to the docs *before* the first Claude Code session. Docs are Claude's memory; contradictions in them become contradictions in the code.

---

## 0. Verdict in one page

**The concept is sound and unusually well thought through.** The core insight ("push-based *and* personal, with no conversation required") is real white space, the no-chat principle is the right ethical and legal call, and the safety design is more serious than most funded competitors'. The docs are ready for a designer, a lawyer and a clinical advisor.

**Five things would hurt the product if built as written:**

| # | Problem | Where | Fix (short) |
|---|---|---|---|
| 1 | *(Declined 2026-09-28, D27: the full MVP ships, both languages.)* **The MVP is too big for one founder + Claude.** 18 "must-have" items including two languages, a viral web loop, native widgets, a paywall A/B test and envelope encryption. That's a 6-month plan with no slack, and the slice that proves the thesis (feel seen → come back) is buried under growth and monetisation features. | 06 §2 | Split into **MVP-core** (prove the feeling) and **MVP-launch** (prove the business). See §2. |
| 2 | *(Resolved by D9.)* **Free-tier limits fight the two things the product needs most: memory and virality.** 3 replies/month makes the board "a void" (doc 01's own words) for free users; 3 warm notes/month throttles the #1 growth loop. | 09 §2 vs 01 §5.1, 10 §2 | Make replies free but *slower and shorter* on free; warm notes unlimited on free. See §3. |
| 3 | *(Applied 2026-09-28, D22.)* **The product's success is its own churn.** Hard periods end. The docs never say what Rustle does when the exam is passed or the divorce is a year old. That's both the biggest retention risk and the biggest ethical question. | absent | Design "seasons": Rustle steps back gracefully, and there's a cheaper "keep in touch" mode. See §1 and §3. |
| 4 | *(Applied 2026-09-28, D30, D31.)* **Intimate note text leaves your servers in more places than the privacy story admits.** Expo's push service relays payloads; APNs/FCM see full note text; warm-note pages sit on Vercel; the embedding provider is never named. | 07 §1, §6, 08 | Opaque push payloads with on-device fetch, name every sub-processor, drop embeddings from the MVP. See §5–§6. |
| 5 | *(Applied 2026-09-28, D24.)* **Four different things are called "notes".** User notes, Rustle's daily notes, "a note back", and warm notes. In the UI *and* in the schema (`notes` vs `affirmations`). This will confuse users, copy, analytics and Claude. | 01, 05, 07 | A glossary with one name per thing, applied to UI, schema and docs. See §4. |

**Also worth fixing now, cheaply:** the numeric contradictions between docs (free notes/day, summary length, card counts), the missing consents table, the missing "day 2 to day 7" experience, the "bac" campaign that targets 17-year-olds under an 18+ policy, and the model list (Opus 5.5 now exists at a lower price than Opus 5).

**Top questions only you can answer** (full list in §12): where you're based and which market you know; your coding experience and weekly hours; whether Rustle speaks as "I"; whether to launch in one language first; how Rustle should behave when someone gets better.

---

## 1. As an idea to support people

*Lens: the person going through something, and a clinical advisor looking over your shoulder.*

### What's right
- **Validation before encouragement, no advice, no toxic positivity.** This is the single most important design rule and it's consistently applied across product principles, prompts and marketing.
- **Low effort.** People in a hard month don't have energy for journaling or chat. "Drop a thought and be cared for" is a genuinely humane framing.
- **Push, not pull.** A note arriving on a hard morning is a fundamentally different experience from having to open an app and ask for help.
- **Crisis handling without AI, localised, never paywalled.** Correct, and rare.
- **User-visible, editable memory and a "Just listen" toggle.** Consent and control are built in, not bolted on.
- **The avoid-list as a hard constraint.** "Don't mention my ex" respected 100% of the time is worth more than any clever note.

### What's missing or risky

1. **No design for getting better.** A support product's best outcome is that the person needs it less. Right now the plan has 1–5 notes/day forever, which after the hard period ends becomes either noise (muted → churn) or a subtle pressure to stay in the story of the hard time. Add a **"seasons" model**: Rustle notices calmer check-ins and resolved situations, asks *once* ("Things sound lighter lately. Want me to write less often for a while?"), and drops to a quieter rhythm (2–3 notes a week, mostly presence and anchors). The monthly recap becomes the main touchpoint. This is also the answer to the doc 13 question about archiving a "life chapter": a chapter closes when its season ends, stays in recaps, and stops driving daily notes.
2. **Unrequested reminders of hard dates.** Anniversary-of-loss notes are opt-out in the docs. For grief and for medical dates, make them **opt-in** at the moment the date is captured ("Want me to be with you on that day, or leave it quiet?"). A surprise reminder of a death anniversary is the kind of moment that produces a one-star review from someone in pain.
3. **Rustle's "I".** The prompts let Rustle say "I" sparingly, which is fine, but there's no rule about what Rustle may *feel*. "Thinking of you" is acceptable; "I miss you", "I'm proud of you", "I need you to..." are not: they claim an inner life and invite attachment. Add a prompt rule: *Rustle can express attention and care, never its own emotions, needs or pride.*
4. **Lock-screen exposure is opt-in, but the risk is highest for the people least likely to find the setting.** For life areas *divorce, abuse, illness, grief*, default the lock-screen text to hidden and tell the user why. They can reveal it. (Doc 05 §7 "strongly suggest" is not enough.)
5. **The bond can be one-way in a way that's fine, but never "you only need me".** Doc 08 has this. Extend it: warm notes are also a bridge to real people. Once in a while ("Anna sounds like someone worth telling"), suggest a real person, never a feature.
6. **Beta quality review needs consent.** Doc 17 has you reading 30 real notes a week. Real users' notes are special-category data. Beta testers must **explicitly opt in** to having their notes and generated notes reviewed for quality, separately from the standard consent, and you should read them through a review tool that logs access, not the database.
7. **Efficacy claims are correctly absent, but you'll want *some* signal that it helps.** Add a single non-clinical question to the monthly recap: "Did Rustle help this month? (a little / a lot / not really)". Not a scale, not a screening tool. It's product feedback, and it doesn't drift the app toward a medical device.
8. **French "tu" default is right for warmth, but confirm it at the first note, not in a settings screen.** A 55-year-old in Lyon addressed as "tu" by an app in the first minute may feel patronised. Onboarding step 6 for French users should carry the tu/vous choice with a one-line example of each.

**Changes:** add the seasons model (01 §5, 06 roadmap V1.x, 08 §3.3 planner); make hard-date reminders opt-in for grief and medical dates (05 §3 step 4, 11 §2); add the "no own emotions" rule to the system prompt (08 §5.1); default lock-screen privacy on for sensitive life areas (05 §7, 07 §6); add beta review consent (17 §6.4, 11 §4.2); add the recap feedback question (01 §5.4).

**Questions:** Q1, Q2, Q6, Q7 in §12.

---

## 2. As a product owner

*Lens: scope, sequencing, definition of done, and what the backlog looks like on Monday.*

### The MVP problem *(declined 2026-09-28, D27: the founder, a full-time software engineer, keeps the full doc 06 scope in both languages; the sequencing notes below still apply to the build order)*
Doc 06 lists 18 must-haves. Each one is reasonable; together they are not an MVP. The MVP goal in doc 06 §1 is precise: *"people feel seen by notes generated from what they shared, and they keep coming back."* Only about half the list serves that goal. The rest serves growth or revenue, which matter, but not until the first thing is true.

**Recommended split**

| Tier | Contains | Proves |
|---|---|---|
| **MVP-core** (closed beta, ~50–100 people, one language) | Welcome, 18+ gate, consent · onboarding · first note · anonymous account with persistence · Today · Notes board with delayed replies and "just listen" · memory engine + "What Rustle remembers" · daily notes (batch + push + local backup) · delivery settings · safety gate + crisis flow · settings with export and delete · analytics and crash reporting · 1 theme (paper) with dark mode | Feel seen; come back for a week; notes don't misfire on safety |
| **MVP-launch** (soft launch, Canada) | Second language · iOS widget · share cards · warm notes + web page · paywall (**one** variant) · 3 themes · landing page and legal pages | The business: opt-in, trial, virality |
| **V1.1** (first 12 weeks after launch) | Recap · Android widget · paywall variant test · seasons/quiet mode · tone and timing learning · date follow-ups | Retention and revenue |

This removes about six weeks from the path to the first real feedback without removing anything from the launch.

### Specific scope changes
- **Launch the beta in one language.** Build the app bilingual-ready from day one (i18n, prompts that take a `language` variable, a French persona in the eval set), but run the closed beta in the language of the market you know best. Two languages double copy, evals, legal review, crisis tables and store listings during the phase where you should be iterating prompts weekly. Add the second language for the soft launch. This is the single biggest scope saving available.
- **Ship one paywall, test later.** The hard-vs-soft A/B needs roughly 1,000+ installs per arm to say anything (doc 09 says so itself). A soft launch won't have that. Launch with the soft paywall (it matches the brand and feeds the memory moat), keep the RevenueCat flag ready, and run the test once volume exists.
- **Cut envelope encryption from the first migration; design for it.** See §5 for the trade-off. Adding it before beta is fine; blocking day 2 of coding on a per-user key design isn't.
- **Drop pgvector and embeddings from the MVP.** See §5. Per-user memory is small; salience × recency × life-area matching is enough for the first year.
- **Bedrock/Vertex failover is a V1.x task**, not MVP. It needs AWS or GCP accounts, EU model availability checks and separate DPAs. MVP failover is retry → template note.
- **The recap is the "Reflect" pillar and it isn't in the MVP.** That's correct given the 30-day data need, but the first cohort's day 30 is a hard deadline. Put it at the top of V1.1 with a date, not "weeks 24–30".

### What the backlog is missing
- **Acceptance criteria.** Every feature in doc 06 is a noun ("Notes board"). Claude Code builds better from "done means…" sentences (doc 15 says this; the docs don't do it). Write 3–6 acceptance criteria per MVP-core item before the first session. Example for replies: *reply appears between 5 and 60 minutes after posting; never for crisis-level notes; never when "just listen" is on; visible in the board and via a push; reacting ❤️ or "not quite" is recorded with a reason.*
- **The week-one experience.** Onboarding is designed in detail; days 2–7 aren't. D7 retention of 30% depends on them. Sketch it: day 1 evening note references onboarding; day 2 morning note plus a gentle "the board is yours" nudge; first check-in on day 2 or 3; first reply within the first 3 notes; day 5 "keep your notes safe"; day 7 a small "one week" note. This is a product spec, not marketing.
- **Seed notes for the first 48 hours.** The nightly batch runs at 02:00 local. A user who onboards at 15:00 has no notes until the next morning unless the onboarding call also generates the next 24–48 hours of notes in real time. Doc 07 §4.1 only generates the first note. Add "seed notes" to the onboarding-complete flow.
- **Offline writes.** Doc 07 makes MMKV "cache only"; doc 17 tests "write a note on a plane and it syncs later". Those conflict. You need a small outbox for notes and check-ins.

**Changes:** re-tier doc 06 §2; move the paywall test, second language, widget, share, warm notes to MVP-launch; add acceptance criteria per feature (new doc or a section in 06); add week-one spec (05); add seed notes (07 §4.1); add outbox (07 §1, §4.2).

**Questions:** Q3, Q4, Q5.

---

## 3. As a product manager

*Lens: positioning, the user's lifecycle, metrics, and the shape of the free tier.*

### Positioning: strong, with one word out of place
"Notes that know what you're going through" is excellent. The tension is the word **affirmations**: the brand argues that affirmations are hollow, then the App Store title is "Rustle: Personal Affirmations". Using it as an ASO keyword is fine (it's the category people search), but it should not appear in the product itself, in onboarding, or in the French materials (where the docs already note it reads as "guimauve"). Rule: *"affirmations" lives in store keywords and paid search, nowhere else.*

### The lifecycle nobody planned: acquisition at onset, churn at recovery
- **People arrive at the onset of a hard moment** and they search for the moment, not the category: "how to get through a breakup", "exam anxiety", "laid off what now". Doc 10 covers TikTok well and SEO in one line. A small set of life-moment landing pages (EN and FR) with an honest, useful article and a "get a note for this" CTA is cheap, durable and fits the brand better than paid ads.
- **People leave when they feel better**, which the product should be glad about. See §1 item 1. Commercially: offer a **"keep in touch" plan** or a pause (a few notes a week at a lower price, or a free quiet mode that keeps memory alive) instead of letting the subscription lapse to nothing. A user who paused with their memory intact comes back at the next hard moment; a user who churned starts over with a competitor.

### The free tier fights the product *(resolved 2026-09-28 by D9: trial-first with the door open, doc 09)*
| Limit in doc 09 | Why it hurts | Better |
|---|---|---|
| 3 replies/month on free | Doc 01: "without [replies] the board is a void." Free users write into a void after week one, so memory stops growing and the moat never forms. | Replies free for everyone but **slower** (hours, not minutes) and **shorter** (one sentence) on free; premium gets faster, fuller replies and a reply to every note. Cost is small (Haiku-tier reply ≈ a fraction of a cent). |
| 3 warm notes/month on free | Throttles the #1 growth loop at exactly the users most likely to share (18–24, low willingness to pay). | Unlimited on free, with a rate limit for abuse. Premium gets card styles and no watermark. |
| 1 note/day free (doc 09) vs 1–3/day (doc 01) | Contradiction; also 1/day may be too thin to form the habit that the widget and notifications depend on. | Decide 1 vs 2 with the experiment already in doc 12 §6, and fix doc 01 to match. |
| Recap preview: 2 cards | Fine, but make the *share line* free: it's a growth loop. | Preview + share line free; full story premium. |

Premium then sells: **more notes, faster and fuller replies, custom times, themes, widgets, the full recap, voice (later)**. That's a clean "more of Rustle" story with no cruelty in it.

### Metrics
- **WFSU counts "opened a notification" as feeling seen.** It isn't; it's attention. Keep the north star to ❤️ reactions and notes written *after* a note arrived, and track notification opens as an engagement input. Otherwise the metric flatters delivery volume.
- **Add a "not quite" *rate* target** (< 15%) next to the ❤️ target. Silence is not consent; the negative signal is the one that finds bad prompts.
- **Track "situation resolved" events.** It's the best leading indicator you'll have for both the seasons feature and for churn, and the data model already captures it (`memory_items.status = resolved`).
- **Retention targets are ambitious (D30 15–20% vs 3–7% category).** Fine, but set a *floor* that triggers a rethink (D7 < 20% after two prompt iterations), not just a ceiling.

### Competitive
- The docs handle ChatGPT well. Add one line to the pitch and ASO: *ChatGPT waits; Rustle writes first.* It's the sharpest differentiator and it's true.
- **Opus 5.5** now exists at a lower price than Opus 5 ($4/$20 vs $5/$25 per million tokens). Update doc 08 §2 so the blind test includes it and the cost table reflects it.

**Changes:** ban "affirmations" from product copy (05, 10 §3.3, 03 §5); add life-moment landing pages (10 §3); add the keep-in-touch/pause plan (09 §3, §7); revise the free tier (09 §2); revise WFSU (12 §1) and add "not quite" and "resolved" metrics (12 §3); update models (08 §2, §9).

**Questions:** Q3, Q8, Q9.

---

## 4. As a business analyst

*Lens: are the requirements consistent, complete and unambiguous?*

### 4.1 Contradictions found across docs

| # | Topic | Doc A says | Doc B says | Resolve |
|---|---|---|---|---|
| C1 | Free notes per day | 01 §5: "1–3/day on free" | 09 §2: "1 per day" | Pick one (see §3), fix both |
| C2 | Memory summary length | 07 §3: ~400 words | 08 §3.3: ~300 words; 08 §5.5: ~250 words | 250–300 words everywhere |
| C3 | Recap cards | 01 §5.4: 6–10 cards | 08 §5.6: 6–8 cards | 6–8 |
| C4 | Notes pause after crisis | 08 §7: 24–48 h | 11 §2: 24 h | 24 h, extendable by the user |
| C5 | Paywall model | 04 pitch: "Freemium plus a 7-day trial" | 09, 13: hard vs soft A/B | Pitch should reflect the decision (or the recommendation in §2 to launch soft) |
| C6 | Local storage | 07 §1: MMKV "cache only" | 17 §6.2: offline note write must sync later | Add an outbox; storage is cache + outbox |
| C7 | Reply delay | 01 §5.1: "a few minutes to about an hour"; 07 §4.2: 2–60 min; 12 §6: test 5/30/natural | Consistent enough; state the range once (07) and link to it | — |
| C8 | Age vs marketing | 11 §5, 16: 18+ only | 10 §3.8: campaigns for the French **bac** (mostly 17–18-year-olds) | Target *partiels* and university finals, not the bac |
| C9 | Who reads notes | 07 §8: staff can't read notes without break-glass | 17 §5, §6.1: founder reads 30 generated notes weekly; 10 §3.5 "data stories" from 50,000 notes | Define what "reading" means: eval personas (synthetic) vs consented beta users vs aggregated metadata. Never content-mined stories. |
| C10 | Timeline | 04 slide 11: "MVP in ~18 weeks" | 06 §4: launch at 24–28 weeks | Use the same numbers, or define MVP ≠ launch explicitly |

### 4.2 Gaps in the data model (doc 07 §3)

| Missing | Why it matters | Add |
|---|---|---|
| `consents` | GDPR Art. 9 explicit consent, Apple's AI-data consent, and Quebec Law 25 all need a record of *what* was consented to, *which version*, *when*, in which locale. `users.age_confirmed_at` is not enough. | `consents (id, user_id, kind, version, locale, granted_at, withdrawn_at)` |
| `notes.exclude_from_ai` | Doc 11 §2 relies on it ("forget this" keeps the note but excludes it) | boolean column |
| `affirmations.reaction_reason` | Doc 08 §6 defines "not quite" reasons; nowhere to store them | text column |
| Per-user style note | Doc 08 §6 "prefers shorter, less emoji" | `profiles.style_notes text` |
| `key_dates.remind` | The opt-in for sensitive dates (see §1) | boolean, default depends on kind |
| `warm_notes.reported_at` / moderation status | Doc 11 R13 needs a report path | columns |
| Seasons / rhythm | `delivery_prefs.rhythm` ('active' / 'quiet') and `paused_until` already exists | enum column |
| Beta review consent | See §1 item 6 | a `consents.kind = 'quality_review'` row |
| Embedding provider | `embedding vector(1024)` implies a provider that is never named (Anthropic doesn't offer embeddings) | Drop for MVP, or name it (see §5) |

### 4.3 Terminology: one name per thing
Today the word "note" means four things. Proposal:

| Thing | User-facing (EN) | User-facing (FR) | Code / schema | Analytics |
|---|---|---|---|---|
| What the user writes on the board | **note** ("your notes") | note | `notes` | `board_note_*` |
| What Rustle sends daily | **a Rustle** / "a note from Rustle" | un mot de Rustle | `deliveries` (rename from `affirmations`) | `delivery_*` |
| Rustle's reply on a user note | **note back** | un mot en retour | `replies` | `reply_*` |
| A note the user sends a friend | **warm note** | un mot doux | `warm_notes` | `warm_note_*` |
| Quick mood entry | **check-in** | check-in / bilan | `checkins` | `checkin_*` |

Renaming `affirmations` to `deliveries` also removes the last trace of the word the brand argues against. Put this table in a `docs/00-glossary.md` and in `CLAUDE.md`.

### 4.4 Requirements that are stated but not specified
- **"Significant change" that triggers same-day regeneration** (07 §4.3): the extractor returns `situation_changed_significantly`, but nothing defines the threshold or what happens to already-delivered local notifications. Specify: cancel undelivered local notifications for today, regenerate, reschedule.
- **Reply batching for high-volume writers** (11 §2): "at most 1 per 30 min, with batching" needs a rule for *which* note the batched reply attaches to.
- **Anti-annoyance halving** (05 §7, 07 §6): "last 5 unopened → halve" — halve from what, and does it recover automatically? Specify a floor (1 per 2 days) and a recovery rule (any ❤️ or note written restores the user's setting).
- **Merge on account link** (07 §5): "move notes/memory, keep the older subscription" — memory merge is a real algorithm (duplicate people, conflicting situations). Specify: keep both sets, re-run the summariser, flag for the user in "What Rustle remembers".
- **Timezone shards**: one nightly batch per timezone means up to ~40 batches a night with a handful of users each in year one. Fine, but specify that shards with < N users are merged into hourly groups.

**Changes:** fix C1–C10; extend the schema (07 §3); add the glossary (new doc 00); specify the four rules above (07, 11).

---

## 5. As the IT team (architecture, delivery, operations)

*Lens: will this stack ship, and what will bite at 2 a.m.?*

### Verdict on the stack
Expo + Supabase + Claude + RevenueCat + PostHog + Sentry is the right choice for one founder building with Claude, and the "rejected, don't re-argue" list is a mature touch. The concerns are in the details.

### 5.1 Things that will bite

| Concern | Detail | Recommendation |
|---|---|---|
| **Expo's push service sees note text** | Expo Notifications routes through Expo's servers before APNs/FCM. That makes Expo a sub-processor for the most sensitive data you hold. | Either send directly to APNs/FCM from an Edge Function (more code, no third party), or make **payloads opaque** (an ID plus "A note from Rustle 🌿") and have the app fetch the text: an iOS Notification Service Extension and an Android data message. The lock-screen still shows the text; Expo, Apple and Google relay only an ID. Design the payload this way from day one even if the extension ships in V1.1. |
| **iOS Keychain persistence across uninstall is observed behaviour, not a documented guarantee** | Apple has changed its mind about it before. | Keep it, but treat it as best-effort: nudge account linking earlier for anyone with more than a few notes, and show backup status prominently (doc 07 §5 already does). Test on every iOS major version. |
| **Android Block Store** | No Expo module; the restore semantics differ by OEM and Google account state. | Prototype it on day 3 of M1 as planned, on two different Android phones, before relying on it in copy ("your notes survive a reinstall"). Have a fallback: the recovery key. |
| **pgsodium** | Supabase has been moving away from pgsodium for column encryption (verify current status at build time). | Do app-layer encryption in the Edge Function instead of in Postgres, with a single master key in Supabase secrets and per-user data keys derived from it (HKDF). No external KMS in MVP. Rotate later. |
| **Envelope encryption vs debugging and search** | With encrypted note bodies, you can't grep production data when something goes wrong, and search must be on-device. | Accept it. The trade is worth it for this data. But make the decision *now*; retrofitting encryption on a live table is a migration you'd rather not do. Recommendation: encrypt from the first migration, keep the implementation minimal. |
| **Embeddings** | Anthropic offers no embeddings API; `vector(1024)` implies Voyage, OpenAI or Cohere, i.e. another sub-processor receiving note content. Supabase's Edge runtime can compute small embeddings in-process (gte-small, 384 dimensions) with no third party, if you want them. | **Drop embeddings from the MVP.** Rank memories by salience × recency × life-area match; the summariser already does the "relevance" job. Do the repetition check with a cheap string-similarity measure. Revisit when per-user memory exceeds a few hundred items. |
| **Batch API timing** | Most batches finish within an hour, but the guarantee is 24 hours. A 02:00 batch for an 08:00 note is usually fine and occasionally not. | Generate **two days ahead** (the local pre-fetch already assumes 24–48 h) and have a real-time fallback for any slot with no delivered note 30 minutes before its time. |
| **Anonymous sign-in abuse** | Anyone can create an anonymous account and trigger a real LLM call (the first note). That's a cost and abuse surface. | App Attest (iOS) and Play Integrity (Android) on the onboarding-complete and warm-note endpoints, plus per-device and per-IP rate limits in Postgres. |
| **Edge Functions and Deno for the whole pipeline** | Workable, but: Deno's test runner, not Vitest, for functions; shared code between the app and functions needs a workspace package; every job must be resumable. | Monorepo with `packages/shared` (zod schemas, prompt types, the glossary as constants) consumed by both. Keep AI logic pure (no I/O) so it's testable in either runtime. |
| **Streaming the first note** | Supported by Edge Functions; make sure the RN client handles a stream and the 8-second fallback race without showing two notes. | Specify the state machine once (streaming / fallback / replaced). |
| **Solo on-call** | Doc 11 promises 4-hour triage for safety incidents and 48-hour review of reports. A solo founder can't promise that during a holiday. | Make the promise you can keep ("within 2 working days"), automate the first response (a report flags the note, pauses that user's generation if it's a safety report, and emails you), and put an out-of-office plan in doc 11 §6. |

### 5.2 Things that are fine but should be written down
- **Environments:** three Supabase projects is right. Add: prod prompts are promoted from staging by tag, never edited in place.
- **Cost guardrails:** Anthropic console spend limits per key, per environment, from day one. A runaway batch loop is the most likely large bill.
- **Cache hit monitoring:** log `cache_read_input_tokens` per call; if it's zero on the daily composer, the system prompt is being invalidated (usually by a timestamp or unsorted JSON in the prefix).
- **Prompt versioning:** prompts as files, `prompt_version` on every generation, and an eval gate in CI. Already in the docs; keep it.
- **Model choice per step:** the docs' blind test is the right method. Include Opus 5.5. For the safety classifier, pair Haiku with the keyword pre-filter as planned; false negatives there are the one failure you can't afford.

**Changes:** opaque push payloads and direct APNs/FCM or NSE (07 §1, §6); Keychain and Block Store as best-effort with early linking nudge (07 §5); app-layer encryption without pgsodium (07 §8); drop embeddings from MVP (07 §1, §3, 08 §3.3, §5.8); two-day generation horizon (07 §4.3); App Attest/Play Integrity (07 §8); monorepo shared package (07 §11); realistic support SLAs (11 §6).

**Questions:** Q4 (hours and coding experience determine how much of this you can carry).

---

## 6. As security, privacy and legal

*Lens: what a privacy lawyer and a pen-tester would flag.*

The legal analysis in doc 11 is strong. Gaps:

1. **Sub-processor list is incomplete.** Add whichever of these end up receiving note text: Expo (push relay, if used), Vercel (warm-note pages contain user-written text), the email provider (if recap emails ever carry content: they shouldn't), any embedding provider, AWS or Google for failover. Rule: **no note content in email, ever**; recap emails say "your month is ready" and link to the app.
2. **Consent records.** See §4.2. Also: consent copy must be separate from ToS acceptance, and re-consent is required when the purpose changes (e.g. enabling a second AI vendor).
3. **Beta review consent.** See §1 item 6.
4. **Warm-note pages** must be `noindex`, unguessable, expiring, revocable, reportable, and must never show the sender's other data. Docs cover most of this; add `noindex` and "no analytics beyond a page-view count".
5. **The "data stories" PR angle** ("what 50,000 notes tell us") conflicts with "we never read notes". Aggregated *metadata* stories (when people write, mood trends by weekday) are fine; anything derived from note content isn't. Rewrite 10 §3.5.
6. **18+ and the bac.** See C8.
7. **Right to erasure vs backups:** 30-day purge is stated; add that Anthropic's API retention (per its terms) is disclosed, and that batch inputs are deleted after processing on your side.
8. **App lock** (Face ID / PIN) is in V1.1. For divorce and abuse situations it's a safety feature; consider pulling it into MVP-launch. It's a small amount of code.
9. **Illinois, NY and California:** the docs already design to comply. Add "periodic AI reminder where required" as a concrete UI element (a small "Rustle is AI" line in the About screen and on the first reply of each month, for example) so it isn't forgotten.
10. **Security review timing:** the docs plan two reviews (before beta, before launch). Add a third, cheaper one: a 1-hour review of the RLS policies and the Edge Function auth checks *before the first real beta tester*, not just before the 100-person beta.

**Changes:** 11 §4.2, §4.5 (sub-processors, consents, beta consent); 10 §3.5 (data stories); 06 (app lock earlier); 11 §3 (AI reminder element).

---

## 7. As UX and design

*Lens: the flow, the screens, the words.*

### Strong
The three-tab structure, onboarding content, the "wow" first note, the sticky-note board with an attached reply, the sensitive-content share guard, and the accessibility section are all good. The "paper & ink" direction is the right one (see doc 20).

### Improve
1. **Nine steps before the wow is long.** Test a variant: steps 1–4 (name, situation, own words, date) → first note → "does this feel right?" → steps 6–9 framed as "make it yours" → notification permission. Tone and avoid-list still shape the *second* note onward, and the first note is written in the neutral gentle register. Doc 12 has a related experiment; add this one.
2. **The empty board.** The empty state copy is fine; the *first-reply moment* isn't designed. The first time Rustle leaves a note back should be a small event: a soft push, the reply "sticking" onto the note with a short animation, and a one-time line: "I'll sometimes leave a note back. Turn on 'Just listen' if you'd rather I didn't."
3. **The "You" tab carries seven things.** Fine for now; make "What Rustle remembers" and "Your journey" the first two rows with visual weight, and push account and help down.
4. **Check-in scale.** A 5-point emoji scale reads differently across ages and cultures. Use five abstract shapes or weather-like marks with labels (see doc 20 §7), not faces.
5. **Notification title.** Doc 05 says "the user's name or nothing". With lock-screen privacy on, the title carries the whole message ("A note from Rustle"). Design both states.
6. **Dark mode is a first-class need**, not a theme. Many hard moments are at 11 p.m. Doc 05 lists a "night" theme as one of three; make *system-following dark mode* the default and keep "night" as an aesthetic choice on top.
7. **Simple mode** (larger text, fewer elements) is in the MVP list but has no screen spec. Define what it removes (share, themes, secondary actions) and what it enlarges.
8. **Terminology** as in §4.3, applied to every string.
9. **French length.** French copy runs 15–25% longer. Design buttons and chips at French length from the start.

**Changes:** 05 §3 (onboarding variant), §5 (first-reply moment), §6 (You tab order), §4 (check-in marks), §7 (title states), §12 (dark mode default), §11 (simple mode spec).

**Questions:** Q6 (mascot or abstract; recommendation: abstract, see doc 20).

---

## 8. As marketing and growth

*Lens: will people find it, and will it fit one founder's week?*

1. **The content plan is a team's plan.** "3–5 posts/day across 3–5 accounts" is a full-time job by itself; doc 17 gives marketing 15% of your week. Realistic: one brand account per language, 3–5 posts a *week* pre-launch, mostly faceless formats that Claude can script and a freelance editor can cut. Scale after the concierge test produces real quotes.
2. **Life-moment SEO** (see §3) fits the brand and compounds. It also gives creators something to link to.
3. **Warm notes as the growth loop only works if free users can send them.** See §3.
4. **The founder story** is the strongest hook in this category, and doc 13 asks whether you have one. If the answer is yes and you're comfortable, it should shape the brand voice too, not just PR.
5. **"Affirmations" in the store title** is defensible for search volume; test "Rustle: Notes That Know You" as the title with "affirmations" only in the keyword field once you have data. Apple weighs the title heavily, so measure.
6. **French market claims** ("no strong personal-AI support player") are researched to September 2026; re-verify a month before launch.
7. **Seasonal calendar**: swap the bac for partiels/university finals (C8).

**Changes:** 10 §3.1 (volume), §3 (SEO pages), §3.3 (title test), §3.8 (bac).

**Questions:** Q5, Q8.

---

## 9. As finance

*Lens: does the money work, and what's the sensitivity?*

- **Unit economics hold on every model tier.** The docs' numbers match current API pricing (Opus 5 $5/$25, Sonnet 5 $2/$10, Haiku 4.5 $1/$5 per million tokens), and Opus 5.5 at $4/$20 makes the top tier cheaper. AI cost is 5–18% of net revenue; the free-user subsidy matters more than the model choice once the free-to-paid ratio passes 5:1. **Watch the ratio, not the model.**
- **The 15% store fee assumes the Small Business Program**; you must enrol, and it applies under $1M/year. Note it.
- **Annual-plan users on premium volumes are the thin margin** (65%); the seasons model (fewer notes when life is calmer) improves this naturally, which is a nice alignment of ethics and margin.
- **Lifetime plan**: keep it out until you have 6 months of usage data; the ongoing AI cost makes it a bet on churn you can't yet price.
- **Budget line missing:** App Attest / Play Integrity are free, but a Notification Service Extension, Block Store and widgets are native work. If your coding experience is limited (Q4), budget 1–2 freelance days for native pieces.
- **Revenue scenarios are fine as ranges.** Add the one number that decides whether to raise: **CAC payback in months** at the base case (roughly 6 months at the docs' assumptions). Under 6 → bootstrap; over 12 → raise or cut paid acquisition.

**Changes:** 09 §5 (SBP note), §3 (lifetime deferred), 06 §3 (native freelance budget), 09 §6 (payback).

**Questions:** Q5, Q10.

---

## 10. On the documentation itself

- **It's excellent as a thinking record and slightly too long as a working spec.** Claude Code will read whatever you point it at; the risk is contradictions (§4.1), not length.
- **Add:** `00-glossary.md` (terms + schema names), a short `requirements.md` with acceptance criteria per MVP-core feature, and `CLAUDE.md` at the repo root (doc 15 has the template; the file doesn't exist yet). Consider an `adr/` folder for decisions after D21 instead of growing doc 13.
- **Mark verification dates** on external facts (laws, prices, competitor features). Several are marked "verify"; make it a convention: every external claim carries a month.
- **Pitch deck (doc 04)** lags the decisions (C5, C10). Update it last, after the questions in §12.

---

## 11. Consolidated change list (status checklist)

> Kept as a record, not archived (D39). **Status as of 2026-09-28.** Priority: **A** = before the first coding session · **B** = before the beta · **C** = before launch.

| P | Change | Docs | Status |
|---|---|---|---|
| — | Re-tier the MVP into core / launch / V1.1 | 06 §2 | ❌ Declined (D27) |
| — | Decide one beta language | 06, 14 | ❌ Declined (D27): both languages at launch |
| A | Launch with one paywall; test later | 09, 13 D9 | ✅ Trial-first + welcome week (D9, D28) |
| A | Glossary and renames (`affirmations` → `deliveries`) | 00, 05, 07 §3, 12 §4 | ✅ D24; analytics prefixes aligned |
| A | Fix contradictions C1–C10 | as listed | ✅ D41 |
| A | Schema additions (consents, exclude_from_ai, reaction_reason, style_notes, key_dates.remind, warm-note moderation, rhythm) | 07 §3 | ✅ plus `entitlement_grants`, `welcome_week_ends_at`, `resolved_at`, `recaps.helped`, `thanked_at` |
| A | Drop embeddings/pgvector from MVP | 07, 08, 15, 18 | ✅ D31 |
| A | Opaque push payloads; direct APNs/FCM vs NSE | 07 §1, §6 | ✅ D30: opaque + NSE in the MVP |
| A | App-layer encryption decision | 07 §8 | ✅ D29: pgcrypto + Vault + views, from migration 1 |
| A | Seed notes; two-day horizon; real-time fallback per slot | 07 §4 | ✅ |
| A | Outbox for offline writes | 07 §1, §4.2 | ✅ |
| A | Acceptance criteria per MVP feature | 21 | ✅ `docs/21-requirements.md` |
| A | Week-one experience spec | 05 §13 | ✅ both paths |
| A | Create `CLAUDE.md` | repo root | ✅ |
| B | Seasons / quiet rhythm model | 01, 06, 08 §3.3, 09 | ✅ D22 |
| B | Free tier: replies not capped; warm notes unlimited | 09 §2 | ✅ as door open: one note back a week, warm notes unlimited (D28) |
| B | Opt-in reminders for grief and medical dates | 05 §3, 07 §3, 11 §2 | ✅ |
| B | Prompt rule: Rustle has no own emotions or needs | 08 §5.1 | ✅ D23 |
| B | Lock-screen privacy default on for sensitive areas | 05 §7, 07 §6, 11 §2 | ✅ |
| B | Beta quality-review consent + review tool with access log | 11 §4.2, 17 §5, §6.4 | ✅ |
| B | Sub-processor list; no content in email; warm-note page `noindex` | 07 §8, 11 §4.2 | ✅ |
| B | Realistic support/incident SLAs for a solo founder | 11 §6 | ✅ |
| B | App Attest / Play Integrity + rate limits | 07 §1, §8 | ✅ |
| B | Models: Opus 5.5 in the blind test and cost table | 07 §7, 08 §2, §9, 13 D12, 17 §4 | ✅ |
| B | Metrics: WFSU without notification opens; "not quite" rate; resolved events | 01 §7, 12 | ✅ |
| B | Onboarding variant experiment (wow after step 4) | 05 §3, 12 §6 | ✅ |
| B | Dark mode as default; simple-mode spec; check-in marks | 05 §3, §4, §11, §12 | ✅ |
| C | Marketing volume realistic; SEO life-moment pages; bac → partiels | 10, 14 | ✅ |
| C | Data-stories PR angle limited to metadata | 10 §3.5 | ✅ |
| C | Keep-in-touch / pause plan | 09 §7 | ✅ as the quiet-season downgrade at cancellation, V1.x |
| C | App lock into the MVP | 06 §2 | ✅ D32 |
| C | Pitch deck updated to decisions | 04 | ✅ slides 9 and 11 |
| C | Finance notes: SBP enrolment, lifetime deferred, payback metric | 09 | ✅ |
| — | Reviewer additions 2026-09-28: onboarding step 9 asks only *when*; first-reply moment; You-tab order; recap "did it help" question; warm-note thank-you; B2B2C timing and aggregated-only rule; access codes; hardship offer | 05, 01, 07, 09, 10 | ✅ D28, D37, D40 |

**Still pending, by design:** the day-7 paywall and welcome-week copy in French (with the fr-CA reviewer); the legal review of the hardship offer and access-code terms; the NSE and Block Store prototypes on real devices in M1.

---

## 12. Questions for the founder

> **Update 2026-09-28 (evening):** every question below is now answered and logged in doc 13 (D22–D41). Q6 abstract mascot (D35) · Q7 opt-in grief and medical dates · Q8 founder story used only if real (D34) · Q10 budget and nine months of runway (D33) · Q11 thank-you tap (D37) · Q12 clinical advisor before the beta (D36) · Q13 bootstrap, decide at month 6 (D38). Two action items remain in doc 13 §B: confirm whether a founder story exists, and name the clinical advisor.

Grouped by what they unblock. The first group blocks scope decisions; answer those first.

**Blocks scope (answer before the first coding session)**
- **Q1. Seasons.** When someone's situation resolves and their check-ins are calm, should Rustle (a) ask once and step back to a quieter rhythm, (b) keep the same rhythm until the user changes it, or (c) something else? My recommendation is (a); it's the more honest product and it improves margins.
- **Q2. Rustle's voice.** Does Rustle speak as "I" (a presence) or stay impersonal ("a note for you")? The docs lean "I" and I agree, with the rule that Rustle never claims emotions or needs of its own. Confirm.
- **Q3. Free tier.** Are you comfortable making replies free-for-all (slower and shorter on free) and warm notes unlimited, and selling premium as "more of Rustle" rather than "unlock the basics"?
- **Q4. You.** Coding experience (any language, how much) and hours per week. This decides whether native pieces (widget, Block Store, notification extension) are yours or a freelancer's, and whether the 6-month plan is 6 or 12.
- **Q5. Market.** Where are you based, and which market do you know first-hand: France, Quebec, another? This decides the beta language, the legal entity, the soft-launch country and the PR story.

**Shapes design**
- **Q6. Mascot or abstract?** Recommendation: abstract (paper, leaf, a folded note as the recurring motif), no character. A character invites comparison with Finch and makes the "not a chatbot" story harder. See doc 20.
- **Q7. Grief and medical dates.** Opt-in reminders for those dates (my recommendation) or opt-out as now?

**Shapes growth and money**
- **Q8. Founder story.** Is there one you'd share? It changes the brand voice, not just the press kit.
- **Q9. Paywall.** Fine with launching soft-only and testing hard once you have ~2,000 installs?
- **Q10. Money.** Is the one-off budget (roughly €5–12k plus native freelance days) available, and is there a marketing budget at the "lean" level?

**Can wait**
- **Q11.** Should warm-note recipients be able to send a "thank you" back? (Recommendation: yes, one tap, no text: it closes the loop without opening a chat.)
- **Q12.** Do you know a psychologist, ideally French-speaking, for a few advisory hours a month?
- **Q13.** Bootstrap or raise later? (The payback metric in §9 should answer this for you at month 6.)

---

## 13. What to do next, in order

1. ~~Answer Q1–Q5.~~ Done.
2. ~~Apply the priority-A changes in §11.~~ Done (status table above).
3. ~~Create `00-glossary.md`, the requirements doc and `CLAUDE.md`.~~ Done.
4. Brief the designer with doc 20 and doc 05.
5. Run the concierge test (doc 17 phase 0) *while* the designer works; it doesn't depend on code.
6. First coding session: monorepo skeleton (doc 15 §4, session 1), following the MVP list in doc 06 §2, the acceptance criteria in doc 21 and the build order in doc 15 §4.
