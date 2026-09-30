# 06 · MVP Scope, Roadmap & Timeline

## 1. MVP goal

**Prove one thing:** *People feel seen by notes generated from what they shared, and they keep coming back.*

MVP success criteria (closed beta → soft launch):
| Metric | Target |
|---|---|
| Onboarding completion | ≥ 70% |
| First note ❤️ "This feels right" | ≥ 60% |
| Notification opt-in | ≥ 60% |
| D7 retention | ≥ 30% |
| D30 retention | ≥ 15% (category average: ~3–7%) |
| Users writing ≥ 1 board note in week 1 | ≥ 40% |
| Trial start at the first paywall (of installs) | ≥ 8% |
| Trial → paid | ≥ 35% |
| Welcome week → trial or paid at the day-7 paywall | ≥ 10% |
| Paying by day 14 (all paths, of installs) | ≥ 5% |
| Qualitative | "How did it know?" in beta interviews |

## 2. MVP scope

> **Scope confirmed 2026-09-28 (D27):** all items below ship in the MVP, in both languages. The founder builds full-time and is a software engineer. The split into "core / launch" proposed in doc 19 §2 was considered and declined; the build order in doc 15 §4 and the milestones in §4 below remain the sequence.

### ✅ In (must have)
1. Welcome, **18+ age gate**, AI/data consent
2. Company splash + Rustle screen (tree), 5-screen onboarding + first personalised note (with fallback)
3. Anonymous account + Keychain/Block Store persistence + optional Sign in with Apple/Google linking
4. **Today** screen: current note, recent notes, ❤️ / "not quite", check-in card
5. **Notes board**: create/edit/delete/pin notes, the "just listen" toggle, **Rustle replies** (delayed, one per note)
6. Memory engine: extraction, summary, key dates, "What Rustle remembers" (view/delete)
7. Daily note generation (nightly batch two days ahead + real-time refresh), seed notes for the first 48 h, and delivery (opaque push + iOS Notification Service Extension + local backup)
8. Delivery settings: slots and their times (up to four a day), quiet hours, lock-screen privacy (default on for sensitive life areas), **app lock (Face ID / PIN)**
9. Safety gate + crisis flow + localised resources (US, UK, IE, CA, AU, FR, BE, CH at launch)
10. **Share card** (Stories/image) with a sensitive-content check
11. **Send a warm note** (simple: 3 AI drafts → edit → link + web page)
12. iOS widget (small, medium, lock-screen)
13. Paywall (RevenueCat): **trial-first with the welcome week**, the hardship offer, **door-open mode** rules in the planner, and **access codes** (`entitlement_grants`) for beta testers and creators (doc 09)
14. 3 themes (paper, dawn, night)
15. Settings: account, export (JSON), delete account, consent records, « Résilier mon abonnement », help
16. Analytics (PostHog), crash reporting (Sentry), cost logging
17. Languages: **English + French** (UI + AI notes; French with tu/vous option, **fr-CA first**, fr-FR vocabulary reviewed before the European launch)
18. Landing page + privacy/terms pages (EN + FR)

### 🟡 V1.1–1.3 (weeks 2–12 after launch)
- "Look how far you've come" monthly recap (needed by day 30 of the first cohort!)
- Android widget and the large iOS widget
- More themes plus widget styles
- Tone learning from reactions; adaptive timing
- Date follow-up notes ("how did it go?")
- PDF export
- **Chapter pass** (non-renewing 6-week purchase, timed to the first exam season, doc 09 §4)
- Quiet-season downgrade offer at cancellation (doc 09 §7)
- Gift subscriptions (needs web checkout, doc 07 §9)
- Referral rewards (send 3 warm notes → 1 free premium week)

### 🔵 V2 (months 4–9)
- Voice-in (dictation to notes) and voice-out (listen to your note)
- 60-second personalised breathing moment before key dates
- Journal view (long notes timeline) + search
- Apple Watch complication / Wear OS tile
- More languages (ES, DE, PT-BR, IT, then others)
- "Letters to future me"
- Lock-screen widgets / Live Activities for key days ("Exam day. I'm with you.")
- Photo notes

### 🔵 V3 (months 9–18)
- B2B2C programmes (universities, outplacement, employers, patient orgs) with a partner dashboard (aggregated, anonymous)
- "Rustle for two" / circles: a small trusted group that can send warm notes to each other
- Printed "My year" book
- Web companion (read and write notes)
- Deeper recap (a yearly "Year with Rustle")

### ❌ Explicitly out of MVP
Meditation library, chat interface, categories picker, social feed/community, streak mechanics, a separate journal, a desktop app, voice cloning.

## 3. Team: founder + Claude ✅ (decided)

You'll build Rustle yourself with Claude (Claude Code for the coding, Claude for design, copy and prompt work). The full working guide is in [15-building-with-claude.md](15-building-with-claude.md).

**Core team**
| Role | Who | Notes |
|---|---|---|
| Product, design direction, marketing, testing | **You** | You make the decisions; Claude drafts and builds |
| Engineering (app, backend, AI, widget) | **You + Claude Code** | TypeScript everywhere (Expo + Supabase + Node) is ideal for AI-assisted development: one language, huge training data, strong typing that catches mistakes |
| Brand & key screens | Freelance designer (2–4 weeks) | Logo, palette, 6–8 key screens in Figma. Claude can build the rest from the design system. ~€2–5k |
| Code & security review | Senior freelance dev (a few hours, twice) | **Strongly recommended**: the app handles intimate data. Review auth, RLS and encryption before beta and before launch. ~€1–2k |
| Legal | Privacy/consumer lawyer (hours) | ToS, privacy policy, consent screens, GDPR/Quebec Law 25 review. ~€1.5–4k |
| Safety | Clinical psychologist advisor (a few hours/month) | Reviews crisis copy, prompts and marketing claims. ~€150–400/month |
| Translation quality | Native French reviewer (fr-CA first, then fr-FR) | Review UI copy and a sample of AI notes each week in beta. ~€300–800 |

**What you need:** a **Mac** (needed for iOS widget development, the simulator and Xcode), an iPhone and ideally a cheap Android phone for testing, an Apple Developer account ($99/yr), a Google Play account ($25 once), a Claude subscription with Claude Code (Pro/Max, ~$20–200/month depending on usage), and an Anthropic API account for the app's AI (billed per use).

**Running costs before traction (< 5k MAU):** Supabase Pro $25+, Claude subscription $20–200, LLM API ~$0.2–1 per active user/month, RevenueCat free up to $2.5k monthly revenue, PostHog/Sentry free tiers, domain and email ~$20/month. **≈ $100–500/month.**

**One-off budget:** €5–12k (designer, reviews, lawyer, trademark, French review), plus a marketing budget (see doc 10).

## 4. Timeline (founder + Claude)

How fast you go depends mostly on your hours per week and how much coding experience you have. Claude writes most of the code, but you still need to run it, test it on devices, make decisions, and debug with Claude when something breaks.

| | Full-time (~40 h/week) | Part-time (~15–20 h/week) |
|---|---|---|
| Public launch | **~24–28 weeks** (≈ 6 months) | **~9–12 months** |

```
Week (full-time): 1   3   5   7   9   11  13  15  17  19  21  23  25  27
Discovery+concierge ████                                              
Design (freelancer)    ██████                                         
Prompt lab           ██████████████████ (continuous)                  
M1 Foundations            ██████                                      
M2 Onboarding+1st note          ██████                                
M3 Notes+memory+replies               ████████                        
M4 Daily notes+push+widget                    ██████                  
M5 Paywall+share+warm notes                         ████              
M6 Safety+legal+FR polish                               ████          
Closed beta (100–200)                                       ██████    
Store prep + soft launch                                          ███ 
Public launch                                                        ▲
Recap (V1.1)                                                   ██████ 
```

### Milestones

| Milestone | Full-time weeks | You have when it's done |
|---|---|---|
| **0. Discovery & concierge test** | 1–3 | 15–20 interviews (18–60, EN + FR), 20–30 people receiving hand-sent notes via WhatsApp/Telegram, final name + trademark search, waitlist landing page |
| **1. Design** | 2–7 | Brand, design system, key screens in Figma (freelancer + you + Claude) |
| **2. M1 Foundations** | 5–8 | Expo app skeleton, Supabase project, database schema + RLS, anonymous auth + Keychain persistence, i18n (EN/FR), CI, Sentry, PostHog |
| **3. M2 Onboarding + first note** | 8–11 | Splash and Rustle screen, 5-screen onboarding, consent + 18+ gate, AI pipeline v1 (Edge Functions), the first personalised note, notification permission, **the first paywall, welcome week, the entitlement-state reader and code redemption** (moved up from M5 so RevenueCat and sandbox trials are set up early, D46) |
| **4. M3 Notes, memory, replies** | 11–15 | Notes board, memory extraction + summary, "What Rustle remembers", delayed replies, safety gate + crisis flow |
| **5. M4 Daily notes, push, widget** | 15–18 | Nightly batch generation two days ahead, opaque push + Notification Service Extension + local backup, delivery settings, iOS widget |
| **6. M5 Paywall, sharing, warm notes** | 18–20 | The day-7 and contextual paywalls, door-open rules in the planner, hardship offer, share cards, warm-note links + web page with the thank-you tap |
| **7. M6 Safety, legal, French polish** | 20–22 | Red-team, eval suite, legal docs, French copy review, security review by a freelance dev |
| **8. Closed beta** | 21–25 | TestFlight + Play testing with 100–200 waitlist users; weekly prompt iterations |
| **9. Store prep & soft launch** | 25–27 | ASO in EN + FR, soft launch in Canada (EN + FR in one market!) and Belgium or Ireland |
| **10. Public launch** | ~27–28 | Launch campaign (doc 10) |
| **V1.1 Recap** | 24–30 | Monthly recap ready before the first cohort reaches day 30 |

## 5. Roadmap after launch

| Horizon | Theme | Key bets |
|---|---|---|
| **Months 0–3** | *Retention & funnel* | Recap, Android widget, tone/timing learning, paywall experiments (card-first vs welcome week, 7 vs 14 days), chapter pass, referral loop, fixing top churn reasons, **first B2B2C conversations** (procurement takes 6–12 months, doc 09 §7) |
| **Months 3–6** | *Growth engine* | Creator programme, student ambassador programme, gifting, next languages (ES, DE, PT-BR, IT), ASO scaling, first paid user acquisition (Apple Search Ads, TikTok Spark Ads) |
| **Months 6–9** | *Depth* | Voice in/out, breathing moments, Live Activities for key days, Watch, "letters to future me" |
| **Months 9–18** | *New channels* | B2B2C pilots (2–3 universities, 1 outplacement firm, 1 patient organisation), circles, printed book, web companion |
| **18+** | *Platform* | Rustle for specific life events (bundled programmes: "First 90 days after divorce", "Exam season", "Chemo companion") co-created with experts |

## 6. Decision gates

- **After the concierge test (week 3):** do ≥ 60% of participants say the notes felt personal and want to continue? If not → rethink before building.
- **After the closed beta (~week 25 full-time):** D7 ≥ 30% and first-note ❤️ ≥ 60%? If not → iterate on the prompts and onboarding before launch.
- **Month 3 post-launch:** D30 ≥ 15% and trial→paid ≥ 30%? If yes → invest in paid user acquisition. If not → focus on retention.
- **Month 6:** MRR trend and CAC/LTV decide whether to raise a pre-seed/angel round or keep bootstrapping.
