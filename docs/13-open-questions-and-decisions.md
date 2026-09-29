# 13 · Open Questions & Decision Log

## A. Decisions recommended in these docs (confirm or override)

| # | Topic | Recommendation | Doc |
|---|---|---|---|
| D1 | Name | **Rustle** (Nautila as fallback); Zorya/Celeste as theme names | 03 |
| D2 | Replies to notes | **Yes**, as a single delayed "note back", **no chat**; "just listen" toggle | 01 §5.1 |
| D3 | Journal | **Merge into the Notes board** (no separate journal) | 01 §5.2 |
| D4 | Categories | **No category picker**; AI-detected "focus areas" the user can weight | 01 §5 |
| D5 | Meditation | **No**; maybe a 60-sec personalised breathing moment in V2 | 01 §5 |
| D6 | Voice | V2 (voice-in first, then voice-out) | 06 |
| D7 | "Send a hug" | Rename to **"Send a warm note"**; link + web page, no install needed | 01 §5.3 |
| D8 | Account | ✅ **Anonymous-first** + iOS Keychain / Android Block Store persistence (not Keystore alone) + nudge to link Apple/Google/email magic link after value; recovery key; passkeys later | 07 §5 |
| D9 | Paywall | ✅ **Trial-first with the door open (decided 2026-09-28):** 7-day trial after the first note, then one plan with everything (monthly or annual); non-payers fall into **door-open mode** (board, memory, safety, export, warm notes, one presence note a week, key-date notes). Hard-vs-soft A/B dropped; extended by D28 | 09 |
| D10 | Pricing | CA$10.99/mo, CA$59.99/yr (US $7.99 / $44.99, EU €7.99 / €44.99), hardship offer at 50% for 3 months, chapter pass CA$19.99 for 6 weeks in V1.1, student and gift via codes later, lifetime deferred | 09 §4 |
| D11 | Stack | ✅ Expo React Native + Supabase (AI pipeline on **Edge Functions only**, no separate server) + Claude API + RevenueCat + PostHog + Sentry, TypeScript everywhere. **Doc 07 §1 is the source of truth**, including the rejected list | 07 §1 |
| D12 | Models | Haiku 4.5 for safety and guardrail; model for user-facing writing **chosen by blind test** (Haiku 4.5 vs Sonnet 5 vs Opus 5.5); failover to the same Claude model on Bedrock/Vertex (Canada or EU) → template | 08 §2 |
| D13 | Age | ✅ **18+ (decided)**; audience 18–60 | 11 §5, 14, 16 |
| D14 | Launch languages | ✅ **English + French (decided)**; more later | 02, 06, 14 |
| D15 | Design direction | Paper & ink base + nature themes | 05 §12 |
| D16 | Launch timing | January or late April (exam/breakup peaks) | 02, 10 |
| D17 | Build approach | ✅ **Founder + Claude (Claude Code)**, plus freelance designer, security review, lawyer, French reviewer | 06, 15 |
| D18 | Marketing focus | Lead with life moments: 25–44 breakup/divorce/burnout (revenue) + 18–24 exams/heartbreak (virality); 45–60 as a second wave | 14 |
| D19 | No-chat principle | One delayed "note back" per note, no conversation thread | 01 §5.1 |
| D20 | Tracking | ✅ **No cross-app tracking, no ATT prompt**; attribution via AdAttributionKit/SKAdNetwork, Apple Search Ads API, Play Install Referrer | 07 §1, 10 §3.6 |
| D21 | Web checkout | Later, via RevenueCat Web Billing; re-check store rules per region when built | 07 §9 |
| D22 | Seasons | ✅ Chapters close when resolved (one follow-up, then quiet); closed chapters live in recaps; a quiet season (2–3 notes/week) is offered once when nothing hard is active | 01 §5.6, 08 §3.3 |
| D23 | Voice | ✅ Rustle speaks as **"I"** (a presence), and never claims feelings, needs or pride of its own | 08 §5.1 |
| D24 | Glossary | ✅ One name per thing: note / a Rustle / note back / warm note; `affirmations` → `deliveries`; "affirmation" only in store keywords | 00, 07 §3 |
| D25 | Canada | ✅ Ontario company; **"Made in Canada"** in the About screen, store listing and Canadian marketing; **Canada (Central) hosting first**, EU region before the European launch; **fr-CA as the primary French** | 05, 07 §8, 10, 18 |
| D26 | Time | ✅ Founder works **full-time** → the ~6-month timeline in doc 06 §4 applies | 06 |
| D27 | MVP scope | ✅ **Full MVP as listed in doc 06 §2**, English + French at launch. The core/launch split and the one-language beta proposed in doc 19 were declined | 06 §2 |
| D28 | Welcome week and offers | ✅ "Not now" at the first paywall leads to a **7-day welcome week** (full experience, no card), then the day-7 paywall, then door open. Door open gets **one note back a week**. **Hardship offer** (50% for 3 months, self-declared) and **access codes** (`entitlement_grants`) in the MVP. Chapter pass, quiet-season downgrade and trial-length variants parked in 09 §4, §7, §8. Welcome week is the launch default; card-first is experiment 1 | 09 |
| D29 | Column encryption | ✅ `pgcrypto` with a Vault key and decrypting views under RLS, from migration 1. Honest wording: encrypted at rest and access audited, not end-to-end. App-layer envelope encryption revisited before the EU launch | 07 §8 |
| D30 | Push payloads | ✅ **Opaque**: a delivery ID and a generic alert. iOS Notification Service Extension (MVP, via `expo-apple-targets`) and Android data messages fetch the text on-device; local backup notifications carry text fetched from our API. Expo, Apple and Google never relay note content | 07 §6 |
| D31 | Embeddings | ✅ **No pgvector or embeddings in the MVP.** Relevance = salience × recency × life-area match; repetition by string similarity. Revisit at a few hundred items per user, computed in-process | 07 §3, 08 §3.3 |
| D32 | App lock | ✅ Face ID / PIN in the **MVP** (moved from V1.1): a safety feature for divorce and abuse situations. Lock-screen privacy defaults on for sensitive life areas | 05 §7, 06 §2, 11 §2 |
| D33 | Budget and runway | ✅ Plan on ~€10k one-off, ~€6.5k lean marketing, and **nine months** of personal runway for a six-month build | 06 §3, 10 §5 |
| D34 | Founder story | ✅ There is one. The founder writes it later in her own words; a placeholder holds its place in doc 10 §3.5b, and it shapes the brand voice once written | 10 §3.5b |
| D35 | Mascot | ✅ **Abstract**: the folded note and the leaf. No character | 20 §2.4 |
| D36 | Clinical advisor | ✅ Recruit **before the closed beta**, 2–4 paid hours a month; Ontario and Quebec francophone networks first | 06 §3, 11 §3 |
| D37 | Warm-note thank-you | ✅ One tap, a heart, no text; the sender gets one push. Closes the loop without opening a chat | 07 §4.5 |
| D38 | Fundraising | ✅ **Bootstrap.** Decide at month 6 on CAC payback: under 6 months keep going, over 12 raise or cut paid acquisition | 09 §6 |
| D39 | Doc hygiene | ✅ `CLAUDE.md` at the repo root; `docs/21-requirements.md` with acceptance criteria per MVP item; the week-one spec in 05 §13; doc 19 §11 kept as a **status checklist** rather than archived | root, 21, 05, 19 |
| D40 | B2B2C | ✅ Short section now (09 §7, 10 §3.7); first conversations at month 3 after launch; full sales brief at month 3. Partners see aggregated data above a cohort of 20, never individuals | 09 §7 |
| D42 | Splash and Rustle screen | ✅ Cold start: company splash ~2 s (**DreamTeam Co.**, placeholder until the company is registered), then the Rustle screen: tree, wordmark and mark from the first frame, headline + Begin + footer after 1 s. Intro and Welcome merged into one screen. Headline stays "Notes that know…" (not "Voice"). Dedicated first-note screen kept before Today | 05 §2, 20 §6, 21 §1 |
| D43 | Onboarding length | ✅ **Five screens**, not nine: life areas · own words + optional date · mood marks · tone + avoid list (+ tu/vous) · name + slots. The nine-step list stays in doc 05 §3 as the pool to add from in production or beta | 05 §3, 21 §2 |
| D41 | Contradictions resolved | ✅ Memory summary ~250 words · recap 6–8 cards · crisis pause 24 h extendable · free themes Paper, Dawn, Night · paywall copy per 09 §3 · Opus 5.5 in the blind test · analytics prefixes per doc 00 · WFSU without notification opens · grief and medical dates opt-in · seed notes and a two-day horizon · offline outbox · timeline in the pitch matches 06 | as listed |

**Rejected stack options** (Flutter, Firebase/Firestore, a separate Express server, own VPS, self-hosted LLM, direct StoreKit) are recorded with their reopen conditions in [07 §1](07-technical-architecture.md). Don't re-argue them unless a condition there becomes true.

## B. Questions for you (the founder)

✅ Answered: build approach (founder + Claude), audience (18–60), languages (EN + FR, fr-CA first), age (18+), time (full-time), location (Ontario, Canada), voice ("I"), memory philosophy (seasons, D22), glossary (D24).

✅ Also answered 2026-09-28: monetisation (D9, trial-first with the door open) and coding experience (the founder is a **software engineer**, so native pieces are in-house and the full-time ~6-month timeline stands).

✅ Also answered 2026-09-28 (D28–D41): welcome week and offers, encryption, push payloads, embeddings, app lock, budget and runway, founder story, mascot, clinical advisor, warm-note thank-you, fundraising, doc hygiene, B2B2C timing.

Still open (action items rather than decisions):
1. **Founder story:** write it in doc 10 §3.5b when ready (D34).
2. **Clinical advisor:** a name, before the closed beta (D36).
3. **Trademark and domain:** run the search and secure `rustle.app` and the handles (doc 03 §5).

## C. Validation experiments before coding (cheap)

1. **Concierge MVP (2 weeks):** 20–30 people fill in a Typeform version of onboarding. You send them 2 AI-drafted, human-reviewed notes a day via Telegram/WhatsApp, and they can reply with any thought. Measure: do they read them, do they feel seen, would they pay €5/month?
2. **Fake-door landing page:** 3 headline variants ("Affirmations that know you" / "Notes for hard times" / "Someone kind who remembers") → waitlist conversion.
3. **TikTok content test:** post 20 faceless "notes for your exam week" videos → measure engagement per persona.
4. **Pricing survey** (Van Westendorp) with the waitlist.

## D. Decision log (fill in as you go)

| Date | Decision | Rationale | Owner |
|---|---|---|---|
| 2026-09-29 | **Build start (D44).** Bundle identifier and Android package `app.rustle`, scheme `rustle`; Keychain service `app.rustle.session`, shared keychain access group = the App Group `group.app.rustle` (declared from M1-03; the widget and the notification extension share it). Android Auto Backup of the token is deferred: Block Store alone makes the reinstall promise true, and a backed-up token would need a key that survives the uninstall. npm workspaces, Jest, i18next with a `_vous` context key per string that differs in the "vous" form. Feature branches start from `main` once the docs branch is merged; the Supabase dev project is created by the PO after M1-01, so M1-03 is coded against env placeholders. Tickets M1-01, M1-04 and M1-03 run first, in that order | Stable identifiers before the first build (moving Keychain items later is painful); one string file per language keeps the "vous" rule testable | Founder, lead |
| 2026-09-28 | Seasons (D22), "I" voice (D23), glossary (D24), Canada-first hosting, fr-CA and "Made in Canada" (D25), full-time build (D26) | Founder answers to doc 19 §12 | Founder |
| 2026-09-28 | MVP scope confirmed in full, both languages (D27); the re-tiering in doc 19 §2 declined | Founder is a full-time software engineer and wants every discussed feature in the first release | Founder |
| 2026-09-28 | **Monetisation decided (D9): trial-first with the door open.** 7-day trial on both plans after the first note; everything included; non-payers keep board, memory, safety, export, warm notes, one presence note a week and key-date notes. Founder is a software engineer → native work in-house | Revenue per install of trial-first, without losing the warm-note loop, the memory moat or anyone mid-crisis; can be re-analysed with data (09 §8) | Founder |
| 2026-09-29 | **D42 splash + Rustle screen, D43 five-screen onboarding.** Company name placeholder DreamTeam Co.; wordmark present from the first frame; "Notes" kept over "Voice"; first-note screen kept before Today | Founder's flow for the first minute; nine questions judged too long for a first contact | Founder |
| 2026-09-28 | **Pre-build review applied (D28–D41).** Welcome week after "Not now", one note back a week in door open, hardship offer and access codes in the MVP; chapter pass, quiet-season downgrade and trial-length variants parked. pgcrypto + Vault column encryption from migration 1. Opaque push payloads with an iOS Notification Service Extension in the MVP. Embeddings dropped. App lock into the MVP. Schema extended (consents, exclude_from_ai, reaction_reason, style_notes, key_dates.remind, rhythm, warm-note moderation, entitlement_grants). Contradictions C1–C10 fixed. CLAUDE.md, requirements doc and week-one spec created. Doc 19 §11 turned into a status checklist. Budget/runway, mascot, clinical advisor, thank-you tap, bootstrap logged | Most of doc 19's priority-A list had not been applied; the majority post-paywall experience (82–90% of installs) was undesigned; several docs still contradicted each other on things migration 1 and the planner depend on | Founder |
| 2026-09-27 | Stack reconciled with the founder's plan: Edge Functions only (worker only if limits are hit); Block Store on Android; model chosen by blind test incl. Haiku 4.5; same-model failover via Bedrock/Vertex; no ATT; web checkout later; rejected list recorded | Keep one language and no servers; make the reinstall promise true on Android; let quality data pick the model; privacy as a feature | Founder |
