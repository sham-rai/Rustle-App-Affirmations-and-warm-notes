# Rustle

Mobile app (iOS + Android) that writes short, personal support notes from what users share, remembers everything, and delivers notes by notification and widget. **Not therapy, not a chatbot** (docs/01 §5.1, the no-chat principle). Users are 18+. Languages: English + French (fr-CA first; "tu" by default, "vous" optional). Ontario company; data hosted in Canada (Central), EU region before the European launch.

## Read before starting a feature
- Acceptance criteria per MVP item, in build order: `docs/21-requirements.md`
- Product and principles: `docs/01-product-concept.md` · UX and week one: `docs/05-ux-onboarding-and-screens.md`
- Architecture, schema, flows, entitlement states: `docs/07-technical-architecture.md`
- AI pipeline, memory, prompts, safety levels: `docs/08-ai-and-prompts.md`
- Monetization states and the paywall: `docs/09-monetization.md`
- Risks, edge cases, legal: `docs/11-risks-edge-cases-safety.md` · Analytics events: `docs/12-metrics-and-analytics.md`
- Style, tokens, microcopy: `docs/20-style-guide.md` · Decisions: `docs/13-open-questions-and-decisions.md`
- **How we work** (roles, tickets, delegation, review ladder, model routing): `docs/22-working-agreement.md` · Tickets and board: `backlog/`

## Working as the team lead
- The PO (Daria) approves the ticket split on Monday and merges PRs; the lead never merges a PR to `main`. The one exception is a board-only commit (D48, below).
- One ticket per subagent, in its own worktree, with only the ticket, this file and the linked doc sections. At most three subagents at once, on disjoint `owner_files`.
- The lead writes migrations, RLS, encryption, `LLMClient`, the safety gate, the planner, the paywall and first-note state machines, and the notification extension itself; subagents get screens, wiring, tests, i18n and the web (routing table in docs/22 §6).
- Every ticket gets a lead review (typecheck, tests, `/code-review`, `/security-review` where it applies, `npm run eval` for prompts) before a PR. Update `backlog/BOARD.md` on every state change, as a board-only commit directly on `main` (D48); everything else goes through a PR.

## Glossary (docs/00). One name per thing, in UI, schema, events and docs
| Thing | UI | Schema | Events |
|---|---|---|---|
| What the user writes on the board | note | `notes` | `board_note_*` |
| What Rustle sends | a Rustle / a note from Rustle | `deliveries` | `delivery_*` |
| Rustle's reply on a user's note | note back | `replies` | `reply_*` |
| A note sent to a friend | warm note | `warm_notes` | `warm_note_*` |

The word **"affirmation" never appears in the product** (store keywords only). No exclamation marks in UI copy. Sentence case.

## Stack (source of truth: docs/07 §1, including the rejected list; don't propose rejected options)
Expo (expo-router, TypeScript strict, TanStack Query, MMKV cache + offline outbox) · Supabase (Postgres, RLS on every table, anonymous auth, pg_cron, Edge Functions in Deno, **pgcrypto + Vault column encryption with decrypting views**; **no pgvector / embeddings in the MVP**) · Claude API only through `supabase/functions/_shared/llm/LLMClient.ts` · RevenueCat (one `premium` entitlement, plus `entitlement_grants` codes) · PostHog (events only) · Sentry (bodies scrubbed) · EAS Build/Submit/Update · Native: SwiftUI widget, iOS Notification Service Extension, Glance widget · `packages/shared` for zod schemas, prompt types, glossary constants and design tokens (pure ESM, no Node built-ins).

## Entitlement states (docs/09 §2, read server-side by the planner)
`premium` (trial, paid, or granted by code) · `welcome_week` (7 days after "Not now", full experience, no card) · `door_open` (one presence Rustle a week, key-date notes on the day, one note back a week on the first note written, warm notes unlimited). Safety responses, crisis resources, memory control, export and delete are never conditional on any state.

## Rules
- TypeScript strict; no `any`. Run `npm run typecheck && npm test` before saying a task is done.
- Every new table has RLS in the same migration: `user_id = auth.uid()` where a row belongs to a user; deny-all where it doesn't (`entitlement_grants`), reached only through Edge Functions or `SECURITY DEFINER` RPCs (the `warm_notes` public page). Never disable RLS. Encrypted columns are read and written through the decrypting views.
- Life areas and delivery intents are the `LIFE_AREAS` and `DELIVERY_INTENTS` enums in `packages/shared/enums.ts`; never redefine them. Length limits per output kind are the table in docs/08 §5.8; input limits (note 2 000, check-in line 280, warm note 220) are the constants in `packages/shared/limits.ts`, mirrored by `-- limit:` markers in the migrations.
- Never send note text, replies, memory content or recap text to analytics, logs, Sentry, email or push payloads. Analytics also never receive life areas, mood or check-in values, or safety signals (no safety level, crisis-screen or resource events, or safety reports); those analyses run in Postgres. Pushes carry a delivery ID and a generic alert; text is fetched on-device.
- All user-facing strings go through i18n (`en.json` + `fr.json`); never hard-code text. Design at French length. A "vous" user is never "tu"-ed, including in errors.
- All LLM calls go through `LLMClient` with a versioned prompt from `supabase/functions/_shared/prompts/`. Log model, prompt_version, tokens, cost and `cache_read_input_tokens` for every call.
- Background jobs are short, idempotent and resumable (docs/07 §2.1); never wait on a Batch inside one invocation. Generate two days ahead.
- Any change to prompts must pass `npm run eval` (golden persona set) before merge. Avoid-list violations must be 0. Crisis-level text never gets an AI-generated reply (docs/08 §7).
- Edge Functions that generate text on demand (`/onboarding/complete`, `/warm-notes`, any future on-demand composer) require App Attest / Play Integrity and are rate-limited per user, device and IP. Board notes are written through PostgREST under RLS, so the reply pipeline cannot carry an assertion and is rate-limited per user server-side.
- Colours come from tokens (`packages/shared/tokens.ts`), never hex literals in components. Contrast is checked in CI.
- No paywall, upsell or prompt of any kind on a crisis, elevated or heavy-note screen. "Not now" is the same size as the primary button.
- Small commits with clear messages; one feature per branch. When a decision changes, update the docs and this file in the same branch and log it in docs/13 §D.

## Commands
`npm run dev` · `npm run typecheck` · `npm test` · `npm run eval` · `supabase db reset` · `eas build --profile development`
