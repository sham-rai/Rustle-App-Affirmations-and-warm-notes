# 15 · Building Rustle with Claude

> You're building Rustle as a founder working with Claude (mainly **Claude Code** in this repository). This guide covers how to set it up, how to work session by session, what to build in which order, and where you still need humans.

---

## 1. Why this stack suits building with Claude

- **One language everywhere: TypeScript.** The app (Expo React Native), backend and AI pipeline (Supabase Edge Functions, Deno) and landing page (Next.js) are all TypeScript. Claude only has to keep one language and one type system in mind, and type errors catch many mistakes before you ever run the app.
- **Popular, well-documented tools.** Expo, Supabase, RevenueCat and PostHog are widely used, so Claude knows them well and their docs are easy to fetch.
- **Managed services instead of servers.** There's no Kubernetes and no servers to patch, so there's less that can go wrong at 2am.
- **SQL migrations in the repo.** The database schema is plain text that Claude can read, change and review.
- **The exceptions are native.** The iOS widget is Swift (SwiftUI) and the Android widget is Kotlin. They're small, and Claude can write them, but you'll need Xcode / Android Studio to run them.

## 2. One-time setup (week 1 of development)

1. **Accounts:** Apple Developer, Google Play Console, Expo (EAS), Supabase (Canada Central region; EU later), Anthropic API (a separate key for the app, not your Claude subscription), RevenueCat, PostHog (EU), Sentry, GitHub, a domain (e.g. `rustle.app`).
2. **Machine:** a Mac with Xcode, Android Studio, Node LTS, the Supabase CLI and the EAS CLI. Ask Claude Code to check what's installed and walk you through the rest.
3. **Repo structure:** follow [07-technical-architecture.md §11](07-technical-architecture.md) (`/app`, `/supabase`, `/evals`, `/web`, `/docs`).
4. **A `CLAUDE.md` at the repo root** (template below). Claude Code reads it automatically at the start of every session. It's your standing instructions.
5. **Secrets:** put them in `.env.local` files (git-ignored), EAS secrets and Supabase secrets. **Never paste API keys into code or chat.** Ask Claude to add a pre-commit secret scanner (e.g. `gitleaks`).
6. **Three environments:** `dev`, `staging` and `prod` Supabase projects. Claude works against `dev` only.

### `CLAUDE.md`

The file lives at the repo root (created 2026-09-28, D39) and is the source of truth for standing instructions: the glossary, the stack, the rules (RLS, no content in analytics, i18n, `LLMClient` only, idempotent jobs, evals before merging prompts, safety), the entitlement states and the commands. Edit it there, not here. When a decision in doc 13 changes a rule, change `CLAUDE.md` in the same branch.

## 3. How to work with Claude Code, session by session

**The team model** (roles, tickets, delegation to subagents, review ladder, model routing) is in [22-working-agreement.md](22-working-agreement.md); the tickets are in `backlog/`. The loop below is what happens inside one ticket.

**The loop for every feature:**
1. **Start with the doc.** "Read docs/05 §5 (Notes board) and docs/07 §3–4. Then plan the Notes board feature." Use **plan mode** for anything bigger than a small fix, so Claude proposes a plan before touching files. Read the plan and push back on it.
2. **Build in slices.** Do the database migration, then the API, then the UI, then the tests. Each slice should be runnable.
3. **Run it yourself** on the simulator or phone. Describe what you see, or paste the error or a screenshot.
4. **Test it.** Ask Claude to write tests for the logic (memory operations, scheduling, paywall entitlements, safety routing).
5. **Review it.** Run `/code-review` on the branch, and `/security-review` for anything that touches auth, RLS, data export/delete or payments.
6. **Commit and merge.** Keep `main` always working.

**Tips**
- **One feature per session.** Start fresh sessions often, and point Claude at the docs instead of re-explaining.
- **Be concrete about "done":** "Done means: a note can be created offline, syncs when online, shows in the board, and the test passes."
- **Ask "what could go wrong?"** and have Claude check the edge cases in doc 11 for each feature.
- **Keep the docs alive.** When a decision changes, ask Claude to update the docs in the same branch.
- **Don't accept code you can't run.** If something is unclear, ask Claude to explain it in plain words.
- **Use development builds, not Expo Go.** RevenueCat, widgets, secure storage configuration and some notification features need native code, so use `eas build --profile development` from week 1.

## 4. Build order (maps to the milestones in doc 06)

Use these as starting prompts for Claude Code sessions.

| # | Session goal | Starter prompt (short version) |
|---|---|---|
| 1 | Project skeleton | "Set up the monorepo from docs/07 §11: Expo app with expo-router + TypeScript strict, i18n EN/FR, Supabase project config, /evals package, CI with typecheck + tests." |
| 2 | Database | "Write the Supabase migrations for the data model in docs/07 §3 with RLS on every table, pgcrypto column encryption with a Vault key and decrypting views (docs/07 §8), the `consents` and `entitlement_grants` tables, plus seed data for 3 test users. Add pgTAP tests that user A can't read user B's notes." |
| 3 | Anonymous auth + persistence | "Implement anonymous sign-in with the session persisted in iOS Keychain / Android Block Store (not Keystore alone) so it survives reinstall (docs/07 §5). Add the 'backed up / not backed up' status in settings, and the offline outbox for notes and check-ins (docs/07 §4.2)." |
| 4 | Consent + 18+ gate | "Build the welcome, age gate (18+) and consent screens (terms, AI processing, special-category data) that write `consents` rows with version and locale (docs/05 §2–3, docs/11 §4), EN + FR." |
| 5 | Splash, Rustle screen, onboarding UI | "Build the company splash, the Rustle screen with the Skia tree (docs/05 §2, the style board as reference) and the 5-screen onboarding from docs/05 §3, storing answers locally until completion." |
| 6 | LLM client + prompts | "Create supabase/functions/_shared/llm/LLMClient.ts (Claude API, structured outputs, prompt caching, retries, cost logging, failover to the same model on Bedrock/Vertex, then template) and load versioned prompts from supabase/functions/_shared/prompts. Add the Rustle voice system prompt from docs/08 §5.1." |
| 7 | Safety gate | "Implement the keyword pre-filter + classifier from docs/08 §5.7 and the crisis screen with localised resources (docs/11). Add tests with sample texts in EN and FR." |
| 8 | First note | "Implement /onboarding/complete behind App Attest / Play Integrity: save, safety check, memory extraction, first-note generation with streaming and an 8-second template fallback, then the 48 h of seed notes (docs/07 §4.1)." |
| 9 | Eval harness | "Build `npm run eval`: 40 golden personas (docs/08 §8), rule checks, and an LLM-as-judge rubric, output as a report." |
| 10 | Notes board + replies | "Build the Notes board (docs/05 §5) and the delayed reply pipeline (docs/07 §4.2, docs/08 §5.3), including the 'just listen' toggle." |
| 11 | Memory screen | "Build 'What Rustle remembers' with view/edit/delete and pause memory." |
| 12 | Daily notes | "Implement the nightly per-timezone batch generation two days ahead with the Message Batches API, the slot planner with the three entitlement states (docs/08 §3.3, docs/09 §2), opaque push delivery, the real-time fallback per slot, local-notification backup and idempotency (docs/07 §4.3)." |
| 13 | iOS widget + notification extension | "Add a SwiftUI WidgetKit extension and a Notification Service Extension via expo-apple-targets: the widget shows the latest note from App Group storage (docs/05 §8); the extension fetches the note text for an opaque push and respects lock-screen privacy (docs/07 §6). Android: data messages build the notification in-app." |
| 14 | Paywall | "Integrate RevenueCat: one `premium` entitlement, monthly and annual products with a 7-day trial, the hardship promotional offer, the trial-first paywall after the first note, 'Not now' → welcome week → day-7 paywall → door open, and the access-code redemption Edge Function over `entitlement_grants` (docs/09 §2–3, §9; docs/07 §9). Paywall copy and offerings remote-configurable." |
| 15 | Share + warm notes | "Build share cards (9:16, 1:1) with the sensitive-content check, and warm notes: 3 drafts → edit → re-moderation → link → noindex Next.js page with OG image and the one-tap thank-you (docs/07 §4.5)." |
| 16 | Settings, export, delete | "Build settings (including app lock, lock-screen privacy defaults, consents, « Résilier mon abonnement », redeem a code), JSON export and full account deletion with cascade (docs/07 §8)." |
| 17 | Analytics | "Add the PostHog events from docs/12 §4. Double-check that no content is ever sent." |
| 18 | Hardening | "Run through every edge case in docs/11 §2 and tell me which are handled, which aren't, and fix the gaps." |

## 5. Where you still need humans

| Area | Why Claude alone isn't enough |
|---|---|
| **Brand & visual design** | Taste and originality matter a lot in this category. Claude can prototype, but a designer makes it distinctive. |
| **Security review** | A second pair of expert human eyes on auth, RLS and encryption before real users' intimate notes go in. |
| **Legal documents** | A lawyer must review the privacy policy, terms and consent flows (GDPR, Quebec Law 25, US state laws). |
| **Crisis copy & safety taxonomy** | This should be reviewed by a clinical professional. |
| **French quality** | A native speaker (ideally both France and Quebec) should check that the notes sound like a real person, not a translation. |
| **Real users** | Interviews, the concierge test and beta feedback. Nothing replaces talking to people. |
| **App Store submission** | Claude can prepare everything, but you submit and handle review questions. |

## 6. Common pitfalls for AI-assisted builders (and how to avoid them)

1. **The "almost working" pile-up.** Many half-finished features. → Finish and merge one slice at a time.
2. **Silent security gaps** (a table without RLS, a service key in the app). → CLAUDE.md rules, `/security-review`, and the human review.
3. **Prompt drift.** A small prompt edit quietly makes notes worse. → Versioned prompts and `npm run eval` on every change.
4. **Over-building.** Claude will happily build anything you ask for. → Stick to the MVP list in doc 06 and the acceptance criteria in doc 21; park new ideas in doc 13.
5. **Skipping real devices.** Notifications, widgets and purchases behave differently on real phones. → Test on your iPhone every week, and use TestFlight early.
6. **Losing context between sessions.** → Keep the docs and CLAUDE.md up to date; they're Claude's memory of the project.
