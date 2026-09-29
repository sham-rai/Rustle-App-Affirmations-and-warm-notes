# Rustle: Project Documentation

> *Notes that know what you're going through.*
> **Thesis:** less generation, more relationship. Any app can call an AI. The product is what the app knows about you, and the feeling of being known.

## Contents

| # | Document | What's inside |
|---|---|---|
| 00 | [Glossary](00-glossary.md) | One name per thing: note / a Rustle / note back / warm note, plus every product term with its schema name |
| 01 | [Product Concept & Analysis](01-product-concept.md) | Vision, problem, pillars, personas, JTBD, feature-by-feature verdicts (replies, journal, voice, meditation, warm notes, recap), tone of voice, honest viability assessment |
| 02 | [Market & Competitors](02-market-and-competitors.md) | Market size, 20+ competitors, positioning map, SWOT, differentiation, market entry |
| 03 | [Naming](03-naming.md) | Rustle vs Nautila vs Zorya vs Celeste vs Oberih: scorecard, conflicts, recommendation, taglines |
| 04 | [Pitch](04-pitch.md) | Elevator pitch, 12-slide deck outline, App Store description |
| 05 | [UX: Onboarding & Screens](05-ux-onboarding-and-screens.md) | Information architecture, splash and Rustle screen, 5-screen onboarding, screens, notifications, widgets, share, accessibility, design direction |
| 06 | [MVP & Roadmap](06-mvp-and-roadmap.md) | MVP scope, V1.x/V2/V3, building with Claude, timeline, decision gates |
| 07 | [Technical Architecture](07-technical-architecture.md) | Stack, architecture, database schema, flows, **accounts (anonymous-first)**, notifications, security, paywall implementation, repo layout |
| 08 | [AI, Memory & Prompts](08-ai-and-prompts.md) | Model strategy, memory engine, context assembly, **full prompt templates**, safety classifier, guardrails, evals, cost per user |
| 09 | [Monetization](09-monetization.md) | **Trial-first with the door open:** what each state gets, the paywall, pricing (CAD first), unit economics, scenarios, experiments |
| 10 | [Marketing & PR](10-marketing-and-pr.md) | Positioning, growth loops, TikTok/creators/ASO/PR/communities, launch plan, seasonal calendar, budget |
| 11 | [Risks, Edge Cases, Safety & Legal](11-risks-edge-cases-safety.md) | Risk register, 40+ edge cases, crisis design, GDPR/EU AI Act/US state laws/App Store, minors policy, incident response |
| 12 | [Metrics & Analytics](12-metrics-and-analytics.md) | North-star, metric tree, targets, event plan, dashboards, experiments |
| 13 | [Open Questions & Decisions](13-open-questions-and-decisions.md) | Decisions made and recommended, remaining questions, pre-code validation tests |
| 14 | [Audience & Segments (18–60)](14-audience-and-segments.md) | Age bands, life moments, AI attitudes by age, where to focus, English vs French market |
| 15 | [Building with Claude](15-building-with-claude.md) | Setup, CLAUDE.md template, session workflow, build order with starter prompts, where humans are needed |
| 16 | [Competitor Comparison](16-competitor-comparison.md) | Feature and price matrix (incl. French competitors), competitors' age policies, what 18+ means |
| 17 | [Development & Testing Strategy](17-development-and-testing-strategy.md) | **Start here to build:** phases from validation to launch, who does what (you / Claude / freelancers), first coding days, testing pyramid, AI quality gates, beta plan |
| 18 | [Why This Tech?](18-tech-choices-explained.md) | Plain-language reasons for each technology choice, alternatives, trade-offs, running costs |
| 19 | [Pre-build Review](19-pre-build-review.md) | **Read before coding:** the concept reviewed from every seat (user, product owner, PM, BA, engineering, legal, UX, marketing, finance), contradictions found, change list, questions for the founder |
| 20 | [Style Guide](20-style-guide.md) | Visual and verbal style: principles, palette with checked contrast, typography, components, motion, notifications, share cards, microcopy, accessibility, design tokens, designer brief |
| 21 | [Requirements](21-requirements.md) | **Build from this:** acceptance criteria for every MVP item, in build order, with the doc each one comes from |
| 22 | [Working Agreement](22-working-agreement.md) | How the PO and the team lead work: tickets, weekly cadence, delegation to subagents, review ladder, monitoring, model routing (Fable vs Opus vs Sonnet), the M1 ticket split |

**Presentation:** [Rustle: Pitch & Roadmap deck](https://claude.ai/artifact/M5EB2Wrj9HiSiEniGfV1hE) (16 slides; private until shared)

## Executive summary

**Decided so far:** built by the founder, full-time, with Claude · an **Ontario, Canada** company ("Made in Canada", data hosted in Canada, fr-CA first) · adults **18–60** (18+ only) · **English + French** at launch · **no-chat principle** (one delayed "note back", no conversation) · Rustle speaks as "I" · **seasons**: Rustle steps back when things resolve · **trial-first with the door open** (doc 09) · the founder is a software engineer.

**What:** A mobile app (iOS + Android) that turns what a user shares (a 2-minute onboarding, quick check-ins and a private notes board) into short, personal, well-timed support notes delivered by notification, widget and home screen. It remembers everything, sometimes leaves a note back on what you wrote, and each month shows you how far you've come.

**Why it can win:** Generic affirmation apps (I am, Motivation, ThinkUp) prove demand at millions of installs but don't know the user. AI journals and chatbots (Rosebud, Replika, ChatGPT, Headspace Ebb) know the user but require effort and conversation. **Rustle is the only one that is both personal and push-based.** Its moat is the per-user memory, which grows over time.

**Key recommendations**
- **Name:** Rustle (fallback: Nautila). Avoid Celeste (a famous game plus an existing AI life-coach app) and Zorya (existing companion app).
- **Replies:** yes, as a single, slightly delayed "note back", **not a chat**. This is safer, cheaper, more special, and less exposed to regulation.
- **Journal:** merge it into the Notes board. **Categories:** replace with AI-detected focus areas. **Meditation:** no. **Voice:** V2.
- **Accounts:** anonymous-first, with reinstall-proof persistence (iOS Keychain / Android Block Store) and a gentle "keep your notes safe" sign-in after value is proven.
- **Money:** trial-first with the welcome week and the door open. After the first note, a 7-day trial; "Not now" gives a card-free welcome week, then the paywall again on day 7. One plan with everything (CA$10.99/mo or CA$59.99/yr; $7.99 / $44.99; €7.99 / €44.99), a quiet hardship offer, and access codes for beta testers, creators and later partners. Non-payers keep their board, memory, safety resources, warm notes, a weekly presence note and one note back a week. AI cost ≈ $0.3–1 per payer, ≈ $0.03–0.10 once per welcome week, and ≈ $0.05–0.12 per door-open user per month.
- **Stack:** Expo React Native, Supabase (Postgres with pgcrypto column encryption + anonymous auth; AI pipeline on Edge Functions, no separate server; no embeddings in the MVP), the Claude API (Batch + prompt caching; model chosen by blind test), RevenueCat, PostHog and Sentry. Opaque push payloads. No cross-app tracking. Widgets and the notification extension are native. Source of truth: [07 §1](07-technical-architecture.md).
- **Safety:** a safety gate on every input, a crisis flow with no AI generation, localised crisis lines, a clinical advisor, and strict non-therapy positioning (the Illinois, NY, CA and EU AI Act rules all apply to this space).
- **Timeline:** building with Claude, ~6 months to public launch full-time (~9–12 months part-time), with small paid help for design, a security review, legal and French review. Run a 2-week concierge test *before* writing code.
- **Growth:** the warm-note viral loop, share cards, monthly recap shares, TikTok/Reels content, micro-creators and ASO. Launch in English + French, timed to exam or breakup peaks.

**Realistic outcomes (18–24 months):** conservative ~$5–8k MRR · base ~$25–50k MRR · breakout $100k+ MRR. The difference is mainly distribution and retention, not technology.

## Next steps

0. ~~Read doc 19, answer its questions, apply its changes.~~ Done 2026-09-28 (doc 19 §11 is the status checklist; decisions D22–D41 in doc 13).
1. Action items in [13-open-questions-and-decisions.md §B](13-open-questions-and-decisions.md): write the founder story (placeholder in doc 10 §3.5b), name the clinical advisor, trademark check.
2. Run a trademark check for "Rustle" and secure the domain and handles.
3. Run the 2-week concierge test with 20–30 people.
4. Brief a designer (docs 05 and 20). First coding session: approve the M1 split in `backlog/M1/` (doc 22 §9), then "run M1-01".
5. Start the TikTok/IG accounts and the waitlist landing page 8 weeks before the beta.
