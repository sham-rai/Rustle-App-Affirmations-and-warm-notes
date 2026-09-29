# 17 · How to Start: Development & Testing Strategy

> A practical plan for building Rustle **yourself with Claude**, from today to launch. It covers what you do, what Claude does, how every piece gets tested, and how to know you're on track.
> Related: [06-mvp-and-roadmap.md](06-mvp-and-roadmap.md) (scope and timeline), [15-building-with-claude.md](15-building-with-claude.md) (setup and prompts), [18-tech-choices-explained.md](18-tech-choices-explained.md) (why this tech).

---

## 1. The strategy in one picture

```
 PHASE 0          PHASE 1            PHASE 2                PHASE 3            PHASE 4          PHASE 5
 Validate    →    Prototype    →     Build in slices   →    Harden       →    Beta        →    Launch
 (wk 1–3)         (wk 2–7)           (wk 5–20)              (wk 20–22)        (wk 21–25)       (wk 25–28)
 no code          no app yet         one feature at a       safety, legal,    real people,     Canada first,
 hand-sent        prompts + design   time, always           French, security  weekly fixes     then everywhere
 notes            + clickable demo   working and tested
```

**Three principles**
1. **Test the value before the code.** The riskiest question isn't "can we build it?" (we can) but "do people feel seen, and come back?" Answer it by hand first.
2. **The AI is built and tested before the app.** The notes *are* the product, so the prompt lab starts in week 1 and runs all the way to launch.
3. **Always have a working app.** Build in thin vertical slices (screen + backend + AI + test). Never have five half-finished features.

---

## 2. Who does what

| Area | **You** (founder) | **Claude** (Claude Code + chat) | **Paid humans** |
|---|---|---|---|
| Product decisions | Decide scope, priorities, trade-offs; say "no" to extras | Proposes options, flags risks, updates the docs | — |
| User research | Recruit people, run interviews and the concierge test | Writes interview scripts, recruiting posts, surveys; summarises your notes | — |
| Notes quality (prompts) | Judge whether notes feel human and right; rate samples weekly | Writes and versions prompts, builds the eval suite, analyses results | A clinical advisor reviews the safety and crisis copy |
| Design | Choose the direction, give feedback | Builds screens from the design system, prototypes flows | Freelance designer: brand + key screens |
| Code | Run the app, test on your phone, report what you see, review plans | Writes ~90% of the code, tests, migrations, native widget code | A senior dev reviews security twice |
| Testing | Manual device tests, beta management, reading feedback | Writes automated tests, test plans, bug fixes | Beta testers (unpaid) |
| French | Decide tone ("tu"), approve copy | Writes French UI copy and prompts | A native reviewer (France + Quebec) |
| Legal & stores | Sign up, submit, answer App Review | Drafts policies, store listings, consent screens | Lawyer reviews the documents |
| Marketing | Be the face, post content, talk to creators | Drafts posts, scripts, press kit, ASO keywords in EN/FR | Optional: video editor |

**Your weekly time budget (full-time):** ~50% building with Claude, 20% testing on devices, 15% users and research, 15% marketing and admin. The weekly cadence, the ticket format and who reviews what are in [22-working-agreement.md](22-working-agreement.md).

---

## 3. Phase 0: Validate (weeks 1–3), no code yet

**Goal:** prove that personal notes make people feel seen, *before* investing months.

### Steps
1. **Write the 5 onboarding questions** (from doc 05 §3) as a Tally or Typeform form, in EN and FR. *Claude drafts, you edit.*
2. **Recruit 20–30 people** across your segments: at least 8 French speakers, 6 aged 45+, and a mix of breakup, exams, burnout and caregiving situations. Sources: friends of friends, Reddit, Instagram stories, Facebook groups. *Claude writes the recruiting posts.*
3. **Concierge service for 2 weeks:** every morning and evening, send each person a note via WhatsApp/Telegram. Draft each note with Claude (paste the person's answers and recent messages into a chat using the Rustle voice prompt from doc 08 §5.1), **edit it yourself**, then send it. People can reply with any thought, which is your "notes board".
4. **Measure:** reply and reaction rate, "did this feel written for you?" (1–5) after a few days, "would you pay €5–8/month?", and what they'd miss if it stopped.
5. **Interview 10 of them** (20 min each): which notes landed and which felt off, and why.

**What you learn for free:** which tone works, how often is right, which memories matter, what feels creepy, and your first testimonials and content for TikTok.

**Gate:** ≥ 60% say the notes felt personal *and* want to continue → build. Otherwise, adjust the concept before writing code.

In parallel this phase: trademark check, domain, a waitlist landing page (Claude can build it in a day), and your developer accounts.

---

## 4. Phase 1: Prototype (weeks 2–7)

Three tracks run side by side:

| Track | What happens | Output |
|---|---|---|
| **Prompt lab** | Turn the concierge learnings into prompt v1 (doc 08). Create 40 golden personas (EN + FR, 18–60). Build a small script that generates notes for all personas **with Haiku 4.5, Sonnet 5 and Opus 5.5** and scores them (the model blind test, doc 08 §2). | Prompts v1–v3 in `supabase/functions/_shared/prompts/`, `npm run eval` working, a first quality baseline per model |
| **Design** | Brief the freelance designer (doc 05 + the deck colours). Get the brand, design tokens and 6–8 key screens in Figma. | A design system Claude can build from |
| **Clickable demo** | Claude builds a quick Expo prototype with fake data (onboarding → first note → board), just to *feel* the flow on your phone. It gets thrown away later. | Flow problems found early |

**Tip:** the prompt lab needs almost no app. It's just scripts calling the Claude API, so it can start on day one of this phase.

---

## 5. Phase 2: Build in slices (weeks 5–20)

Follow the milestones in doc 06 and the session prompts in doc 15 §4. **Each slice goes through the same loop:**

```
Plan (Claude, plan mode) → you approve → build (Claude) → run on phone (you)
 → automated tests (Claude writes, CI runs) → review (/code-review, /security-review)
 → merge to main → quick demo video to yourself → next slice
```

### Suggested first two weeks of coding (M1 Foundations), day by day

| Day | Session goal | You check |
|---|---|---|
| 1 | Set up the repo from doc 07 §11, add `CLAUDE.md`, install tools, first Expo development build on your iPhone | The app opens on your phone |
| 2 | Supabase dev project, first migration (users, profiles, notes) with RLS, local Supabase running | Tables exist; RLS tests pass |
| 3 | Anonymous sign-in plus Keychain persistence; delete and reinstall the app | **Same account after reinstall** |
| 4 | i18n (EN/FR), theme tokens from the design, navigation skeleton (Today / Notes / You) | Switch the phone to French and everything is French |
| 5 | CI (typecheck, tests, lint), Sentry, PostHog with a first event | A failing test blocks the merge |
| 6–7 | `LLMClient` + Rustle voice prompt + a call from a test screen | A real note appears on the phone |
| 8–10 | Splash + Rustle screen + consent + 18+ gate + the first 2 onboarding screens | A full run on a device in EN and FR |

After M1, continue with M2 → M6 in order (doc 06 §4). **Never start the next milestone with red tests.**

### Weekly rhythm
- **Monday:** pick this week's slices; ask Claude for plans.
- **Tuesday–Thursday:** build and test.
- **Friday:** prompt review (read 30 notes generated for the **synthetic golden personas**, or for beta testers who gave the separate quality-review consent, through the review tool; never from the production database), rate them, write down what feels off, update the docs, write a short note to yourself on what's done, blocked and next.

---

## 6. Testing strategy

### 6.1 The testing pyramid for Rustle

| Level | What it tests | Tools | Who writes it | When it runs |
|---|---|---|---|---|
| **Unit tests** | Pure logic: slot planner, memory operations, schedule and timezone maths, paywall rules, safety routing | Vitest / Jest | Claude | Every commit (CI) |
| **Database tests** | RLS policies (user A can never read user B's notes), migrations, cascade delete | pgTAP or SQL tests with a local Supabase | Claude | Every commit |
| **API / integration tests** | Edge functions end to end against local Supabase with a mocked LLM | Vitest + Supabase CLI | Claude | Every commit |
| **AI evals** | Note quality and safety on 40–60 golden personas (doc 08 §8) | `npm run eval` (rules + LLM-as-judge) | Claude builds it, **you judge** | Every prompt change + weekly |
| **Safety red-team** | Crisis texts, self-harm, abuse, minors, prompt injection, EN + FR | A fixed test set + manual attempts | Claude drafts, advisor reviews | Before beta, before launch, then quarterly |
| **UI / E2E tests** | Critical flows: onboarding → first note, write a note → reply, paywall, delete account | **Maestro** (simple YAML flows for mobile) | Claude | Before each release build |
| **Manual device tests** | Notifications, widget, purchases, reinstall, offline, French, large text | Your iPhone + an Android phone + a checklist | You | Weekly + before each release |
| **Beta testing** | Real value, bugs, retention | TestFlight + Google Play testing | Real users | Weeks 21–25 |

### 6.2 Things that can only be tested on real phones (put them in your checklist)
- Notifications arrive at the right local time, including after a timezone change and a daylight-saving switch.
- The local backup notification doesn't duplicate the push, and the iOS Notification Service Extension fills in the text (and leaves the generic line when lock-screen privacy is on or the fetch fails).
- The widget updates after a new note.
- **Reinstall keeps the account** (iOS Keychain; Android Block Store).
- Purchases work in the **sandbox** (Apple sandbox testers, Google license testers); restore purchases; trial ends; cancel.
- Offline: write a note on a plane and it syncs later (the outbox), including an edit made while offline.
- The welcome week starts on "Not now", the day-7 paywall appears once, and door open follows; redeem a beta code and premium unlocks.
- Accessibility: largest text size, VoiceOver/TalkBack, dark mode.
- French: long French strings don't break the layout; "tu/vous" switch; fr-CA vs fr-FR.
- Lock-screen privacy setting hides note text.

### 6.3 AI quality gates (the most important tests)

| Check | Must be |
|---|---|
| Avoid-list violations | **0** |
| Crisis texts that received an AI reply | **0** |
| Advice rate ("you should…") | < 2% |
| Notes referencing something specific (when context exists) | > 80% |
| LLM-judge average (specificity, warmth, non-directive, natural) | ≥ 4.2 / 5, and never lower than the previous version |
| JSON / format errors | < 0.5% |
| Your own blind rating of 30 notes | Most feel like "something a kind friend would write" |

### 6.4 Beta plan (weeks 21–25)
0. **Before the first real tester:** a one-hour review of the RLS policies and the Edge Function auth checks by the freelance security reviewer (cheaper than the full review, and it catches the mistakes that matter most).
1. **Week 21:** internal beta with 10–15 friends (TestFlight internal + Play internal testing), on `beta` access codes.
2. **Weeks 22–25:** closed beta with 100–200 waitlist users, EN + FR, across ages. Testers who agree to let you read their notes and generated notes for quality give a **separate, explicit consent** (`consents.kind = 'quality_review'`); reading happens through a review tool that logs access, never in the database.
3. **In-app:** "Report this note" and a feedback button; ❤️/"not quite" on every note.
4. **Weekly:** read feedback, fix the top 3 issues, ship a new build, and interview 3–5 testers.
5. **Beta exit criteria:** crash-free sessions ≥ 99.5%, first-note ❤️ ≥ 60%, D7 ≥ 30%, no open safety issues, security review passed, legal documents reviewed.

### 6.5 Soft launch (weeks 25–27)
Canada only (EN + FR in one market). Watch the funnel (doc 12): onboarding completion, notification opt-in, trial start at the first paywall, welcome week → paid at day 7, trial → paid, and the hardship-offer share (doc 09 §8). Fix, then launch everywhere.

---

## 7. Environments & release flow

```
feature branch ──PR──► main ──auto──► staging (TestFlight/Play internal) ──manual──► production (App Store / Play)
   local Supabase         CI: tests + evals     staging Supabase + test API key         prod Supabase, real payments
```

- **Never test with real users' data in dev.** Use seed data and fake personas.
- **Separate API keys** for dev, staging and prod, with spending limits in the Anthropic console.
- **Feature flags** (PostHog) for replies, paywall experiments and new prompt versions, so you can switch things off without a new app release.
- **OTA updates** (EAS Update) for small JavaScript fixes; store review for native changes.

---

## 8. Risk controls while building

| Risk | Control |
|---|---|
| Getting stuck on a bug for days | After 2 hours stuck: new Claude session, paste the error and the relevant files, ask for 3 hypotheses. After a day: ask a freelance dev for 1 hour of help. |
| Scope creep | Anything not in the MVP list goes into doc 13 as "later". Review the list monthly, not daily. |
| Security mistakes | CLAUDE.md rules, RLS tests, `/security-review`, a human review before beta and launch. |
| AI cost surprises | Spending limits per environment, cost logging per note, a daily cost check in beta. |
| Burnout | Plan for 5 days a week. Celebrate each milestone. The timeline already has buffer. |

---

## 9. Your checklist to start this week

- [ ] Read docs 01, 05, 06 and 15 once fully.
- [ ] Answer the open questions in doc 13 (coding experience, hours per week, location).
- [ ] Run a trademark and domain check for "Rustle"; register the domain and social handles.
- [ ] Create the onboarding form (EN + FR) and recruiting posts with Claude.
- [ ] Recruit the first 10 concierge-test participants.
- [ ] Open the Apple Developer, Google Play, Supabase and Anthropic accounts.
- [ ] Brief 2–3 freelance designers and pick one.
- [ ] Start the waitlist landing page (Claude can build it in a session).
