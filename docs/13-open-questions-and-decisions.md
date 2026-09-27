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
| D9 | Paywall | ✅ **A/B test hard vs soft paywall at launch (decided)**; both after the first note, 7-day trial on annual | 09 §0–1b |
| D10 | Pricing | $7.99/mo, $44.99/yr, regional tiers, student discount | 09 |
| D11 | Stack | ✅ Expo React Native + Supabase (AI pipeline on **Edge Functions only**, no separate server) + Claude API + RevenueCat + PostHog + Sentry, TypeScript everywhere. **Doc 07 §1 is the source of truth**, including the rejected list | 07 §1 |
| D12 | Models | Haiku 4.5 for safety and guardrail; model for user-facing writing **chosen by blind test** (Haiku 4.5 vs Sonnet 5 vs Opus 5); failover to the same Claude model on Bedrock/Vertex (EU) → template | 08 §2 |
| D13 | Age | ✅ **18+ (decided)**; audience 18–60 | 11 §5, 14, 16 |
| D14 | Launch languages | ✅ **English + French (decided)**; more later | 02, 06, 14 |
| D15 | Design direction | Paper & ink base + nature themes | 05 §12 |
| D16 | Launch timing | January or late April (exam/breakup peaks) | 02, 10 |
| D17 | Build approach | ✅ **Founder + Claude (Claude Code)**, plus freelance designer, security review, lawyer, French reviewer | 06, 15 |
| D18 | Marketing focus | Lead with life moments: 25–44 breakup/divorce/burnout (revenue) + 18–24 exams/heartbreak (virality); 45–60 as a second wave | 14 |
| D19 | No-chat principle | One delayed "note back" per note, no conversation thread | 01 §5.1 |
| D20 | Tracking | ✅ **No cross-app tracking, no ATT prompt**; attribution via AdAttributionKit/SKAdNetwork, Apple Search Ads API, Play Install Referrer | 07 §1, 10 §3.6 |
| D21 | Web checkout | Later, via RevenueCat Web Billing; re-check store rules per region when built | 07 §9 |

**Rejected stack options** (Flutter, Firebase/Firestore, a separate Express server, own VPS, self-hosted LLM, direct StoreKit) are recorded with their reopen conditions in [07 §1](07-technical-architecture.md). Don't re-argue them unless a condition there becomes true.

## B. Questions for you (the founder)

✅ Answered: build approach (founder + Claude), audience (18–60), languages (EN + FR), age (18+), paywall (test hard vs soft).

Still open:
1. **Coding experience:** Have you written code before (any language)? This mainly affects the timeline (doc 06 §4) and how much time to plan for learning in the first weeks.
2. **Time:** Roughly how many hours per week can you put into Rustle? Full-time is ~6 months to launch, part-time ~9–12 months.
3. **Budget:** Is ~€5–12k one-off (design, reviews, lawyer, trademark, French review) plus ~$100–500/month realistic? Is there a marketing budget?
4. **Where are you based, and which market do you know best?** France, Quebec or elsewhere? That affects legal entity, launch order and the PR story.
5. **Personal story:** Is there a story behind Rustle you'd be comfortable sharing publicly?
6. **Tone:** Should Rustle speak as "I" (a presence with some personality) or be more neutral? Should it have a mascot, or stay abstract (leaves, paper)?
7. **Memory philosophy:** Should users be able to "archive" a life chapter (e.g. "the divorce year"), hiding it from daily notes but keeping it for recaps?
8. **Clinical advisor:** Do you know a psychologist (ideally French-speaking) who could advise a few hours per month?
9. **Warm notes:** Should recipients be able to send a "thank you ❤️" back to the sender?
10. **Lifetime plan:** Test it for 45+ users, or not (AI costs are ongoing)?
11. **Fundraising:** Bootstrap or raise pre-seed later?

## C. Validation experiments before coding (cheap)

1. **Concierge MVP (2 weeks):** 20–30 people fill in a Typeform version of onboarding. You send them 2 AI-drafted, human-reviewed notes a day via Telegram/WhatsApp, and they can reply with any thought. Measure: do they read them, do they feel seen, would they pay €5/month?
2. **Fake-door landing page:** 3 headline variants ("Affirmations that know you" / "Notes for hard times" / "Someone kind who remembers") → waitlist conversion.
3. **TikTok content test:** post 20 faceless "notes for your exam week" videos → measure engagement per persona.
4. **Pricing survey** (Van Westendorp) with the waitlist.

## D. Decision log (fill in as you go)

| Date | Decision | Rationale | Owner |
|---|---|---|---|
| 2026-09-27 | Stack reconciled with the founder's plan: Edge Functions only (worker only if limits are hit); Block Store on Android; model chosen by blind test incl. Haiku 4.5; same-model failover via Bedrock/Vertex; no ATT; web checkout later; rejected list recorded | Keep one language and no servers; make the reinstall promise true on Android; let quality data pick the model; privacy as a feature | Founder |
