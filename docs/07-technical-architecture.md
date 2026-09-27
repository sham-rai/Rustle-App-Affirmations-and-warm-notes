# 07 · Technical Architecture

> Goals: ship an MVP quickly with a small team (1–2 engineers), keep AI cost per user low, **never lose user data**, and treat privacy as a feature.

---

## 1. Recommended stack (summary)

> **This table is the single source of truth for the stack.** Other docs link here instead of restating it. Change it here first, then log the change in [13-open-questions-and-decisions.md](13-open-questions-and-decisions.md) §D.

| Layer | Choice | Why | Alternatives |
|---|---|---|---|
| Mobile app | **React Native + Expo (SDK latest), TypeScript (strict)**, Expo Router, TanStack Query, MMKV (cache only; App Group storage shared with the widget) | One codebase for iOS and Android, one language across the stack, EAS Update ships copy and UI-flow fixes without store review. The server is the source of truth; the device only caches | Native Swift + Kotlin (2× the cost). Flutter: rejected (see below) |
| Secure storage | **iOS Keychain** (`expo-secure-store`) · **Android Google Block Store** + Auto Backup of an encrypted token | The anonymous session must survive a reinstall (§5). Android Keystore alone is **not** enough: its keys are deleted on uninstall | — |
| Widgets | **Native**: SwiftUI WidgetKit (iOS) via `expo-apple-targets`; Jetpack Glance (Android) via `react-native-android-widget` or a native module | Widgets can't be written in RN | — |
| Backend / DB | **Supabase**: Postgres, Auth (incl. **anonymous sign-in**), Row Level Security, Storage, Edge Functions, `pgvector`, `pg_cron` | One managed platform, SQL (good for the memory model), EU region available, open source (no lock-in) | Firebase: rejected (see below) |
| AI pipeline | **Supabase Edge Functions (Deno/TS) only, no separate API server or worker**, triggered by `pg_cron` over a Postgres jobs table. See §2.1 | One language, managed, low maintenance | A small TS worker, **only if** Edge Function limits are hit (see §2.1 for the trigger) |
| LLM | **Claude API** (Anthropic). Model per step chosen by blind test (§7, [08-ai-and-prompts.md](08-ai-and-prompts.md) §2). Failover: same Claude model via **Amazon Bedrock or Google Vertex AI (EU region)** → static template | Excellent warm, nuanced writing and strong safety behaviour; prompt caching and the Batch API cut cost. Failing over to the *same* model keeps the voice and safety behaviour identical | A second-vendor small model (e.g. OpenAI gpt-5-nano) behind `LLMClient`, **off by default** (see §7) |
| Queue / scheduling | `pg_cron` + a Postgres jobs table | Nightly note generation, delivery scheduling, retries | Inngest / Trigger.dev if the jobs table gets complex |
| Push | **Expo Notifications** (wraps APNs + FCM) + **local scheduled notifications** | See §6 | OneSignal |
| Subscriptions / paywall | **RevenueCat** over StoreKit 2 / Google Play Billing; **web checkout path later** (RevenueCat Web Billing, see §9) | Handles both stores, receipt validation, paywall A/B tests, analytics, webhooks. In-app Stripe for digital subscriptions is not allowed by Apple or Google | Adapty, Superwall (paywall experiments, can sit on top of RevenueCat). Direct StoreKit: rejected |
| Analytics | **PostHog** (EU cloud): events only, **never note text**; funnels, feature flags, A/B tests | Privacy-friendly, all-in-one | Amplitude, Mixpanel |
| Attribution | **No cross-app tracking, no App Tracking Transparency (ATT) prompt.** Apple **AdAttributionKit / SKAdNetwork**, the **Apple Search Ads attribution API**, Google Play Install Referrer, and ad-network aggregated measurement (e.g. Meta AEM) | Privacy is the product; an ATT prompt in an app for intimate notes costs trust. Trade-off: coarser campaign data | An MMP (AppsFlyer/Adjust) **only in no-IDFA mode** if paid UA outgrows the above |
| Deep links / warm-note links | Own domain `rustle.app/n/{id}` + Universal Links / App Links; landing page on **Next.js** (Vercel) | Full control, great OG previews | Branch.io |
| Crash / perf | **Sentry**, request/response bodies scrubbed | RN + native crash reporting | Bugsnag |
| Builds / releases | **EAS Build + EAS Submit + EAS Update**, development builds (not Expo Go) | Managed signing and store submission; widgets via config plugins keep us in the managed workflow | — |
| Speech-to-text (V2) | On-device dictation first (iOS/Android keyboards); later Whisper-class API | Free, private | Deepgram |
| TTS (V2) | ElevenLabs / OpenAI TTS / Azure Neural voices | Warm voices | — |
| Email | Resend / Postmark (magic links, receipts, recap emails) | — | — |

**Rejected, recorded so these aren't re-argued** (reopen only if the stated condition becomes true):

| Rejected | Why | Reopen if… |
|---|---|---|
| Flutter | A second language (Dart) next to TypeScript everywhere | Never for this app |
| Firebase / Firestore | Document model is weak for relational memory and vector search; stronger lock-in | — |
| Separate Express/Node API server | Edge Functions cover request/response | — (a background *worker* is covered by the §2.1 trigger, not by this) |
| Own VPS | Servers, patching and backups to run ourselves | — |
| Self-hosted LLM | Writing quality and safety behaviour are the product | — |
| Direct StoreKit / Play Billing | Weeks of fragile receipt, renewal and refund logic | RevenueCat pricing or policy becomes a blocker |

---

## 2. High-level architecture

```
┌───────────────────────── Mobile app (Expo RN) ─────────────────────────┐
│  UI · local cache (MMKV, cache only) · local notification scheduler     │
│  Widget extension (SwiftUI / Glance) ← App Group shared storage         │
│  RevenueCat SDK · PostHog SDK · Sentry                                  │
└──────────────┬──────────────────────────────────────────▲───────────────┘
               │ HTTPS (Supabase client, JWT)             │ push (APNs/FCM)
               ▼                                          │
┌────────────────────────── Supabase (EU region) ─────────┴───────────────┐
│ Auth (anonymous → linked Apple/Google/email)                            │
│ Postgres + RLS: users, profiles, notes, checkins, memory_items,         │
│   note_deliveries (affirmations), replies, recaps, warm_notes, events   │
│ pgvector (embeddings of notes & memory) · Storage (share cards, export) │
│ Edge Functions: /onboarding/complete, /notes (create), /warm-notes,     │
│   /recap, /export, /delete-account, RevenueCat webhook                  │
└──────────────┬───────────────────────────────────────────▲──────────────┘
               │ jobs table / pg_cron                      │
               ▼                                           │
┌──────────── AI pipeline (Supabase Edge Functions, Deno/TS) ┴────────────┐
│ 1. Safety classifier (every user input)                                  │
│ 2. Memory extractor (note → memory_items, embeddings)                   │
│ 3. Note composer (daily notes; nightly via Batch API)                   │
│ 4. Reply composer (replies to notes, delayed)                           │
│ 5. Recap composer (monthly)                                             │
│ 6. Quality/guardrail checker (output validation)                        │
│ LLMClient → Claude API (Messages + Batches, prompt caching)             │
│   failover → same Claude model on Bedrock / Vertex (EU) → template      │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Running the AI pipeline on Edge Functions only

Edge Functions have hard wall-clock and CPU-time limits per invocation (check Supabase's current limits for our plan). So every job is **short, idempotent and resumable**:

- `pg_cron` (via `pg_net`) calls a dispatcher Edge Function every minute. It claims a small batch of rows from `jobs` (`status = 'queued' and run_at <= now()`, `FOR UPDATE SKIP LOCKED`), runs them, and marks them done or schedules a retry with backoff.
- **Nightly notes** are split into steps that each fit in one invocation: *build contexts for one timezone shard → submit a Message Batch → poll the batch on later cron ticks → ingest results into `affirmations`*. No invocation waits for a batch to finish.
- Real-time paths (first note, warm notes, safety gate) run directly in their request function, with the 8-second template fallback (§4.1).

**Trigger to add a worker:** if jobs regularly time out, or chunking starts to distort the code, add one small TypeScript worker for the batch steps only. The jobs table, prompts and `LLMClient` stay the same, so this is a move, not a rewrite. Record it in doc 13 §D if it happens.

---

## 3. Data model (Postgres)

> Every table has RLS: `user_id = auth.uid()`. Sensitive text columns are encrypted at rest (Supabase disk encryption), with optional **column-level encryption** (pgsodium / app-layer envelope encryption) for note bodies. See §8.

```sql
-- Identity
users (id uuid pk = auth.users.id, created_at, is_anonymous bool, locale text,
       timezone text, age_confirmed_at timestamptz, deleted_at timestamptz)

profiles (user_id pk fk, display_name text, pronouns text null,
          tone text[],                 -- e.g. {'gentle','humour'}
          avoid text[],                -- hard constraints: {'advice','religion','ex'}
          focus_weights jsonb,         -- {"exams":0.6,"health":0.4}
          theme text, lockscreen_private bool default false,
          reply_default text default 'reply')   -- 'reply' | 'listen'

delivery_prefs (user_id pk, slots jsonb,          -- [{"time":"08:00"},{"time":"21:00"}]
                per_day int, quiet_hours jsonb, adaptive bool, paused_until timestamptz)

-- Inputs
notes (id uuid pk, user_id, body text, mood smallint null, source text,  -- 'onboarding'|'board'|'checkin'|'voice'
       wants_reply bool, pinned bool, hidden_from_recap bool,
       safety_level text,            -- 'none'|'low'|'elevated'|'crisis'
       life_areas text[], created_at, edited_at, deleted_at)

checkins (id, user_id, mood smallint, energy smallint null, line text null, created_at)

key_dates (id, user_id, label text, date date, kind text,   -- exam|appointment|anniversary|court|other
           recurring bool, source_note_id null, created_at)

-- Memory (the heart of the product)
memory_items (id uuid pk, user_id,
              kind text,        -- fact|person|situation|feeling|win|struggle|helps|avoid|goal|date
              content text,     -- "Sister Anna is having surgery on Oct 3"
              salience real,    -- 0..1 importance
              status text,      -- active|resolved|archived|user_deleted
              first_seen_at, last_seen_at, times_mentioned int,
              source_note_ids uuid[], embedding vector(1024),
              user_visible bool default true, user_edited bool default false)

memory_summary (user_id pk, summary text,   -- rolling ~400-word "who they are & what's happening now"
                version int, updated_at)

-- Outputs
affirmations (id uuid pk, user_id, body text, kind text,   -- daily|date_aware|first|reengage
              scheduled_for timestamptz, delivered_at, opened_at,
              reaction text null,                            -- heart|not_quite
              memory_refs uuid[],                            -- which memory items it used
              model text, prompt_version text, cost_micros int, created_at)

replies (id, user_id, note_id fk, body text, visible_at timestamptz,
         reaction text null, model, prompt_version, created_at)

recaps (id, user_id, period_start, period_end, cards jsonb, created_at, viewed_at, shared bool)

warm_notes (id text pk /* short slug */, sender_user_id, recipient_label text null,
            situation text, body text, card_style text, created_at, expires_at,
            opened_count int, revoked bool)

-- Ops
jobs (id, type, user_id, payload jsonb, run_at, status, attempts, last_error)
subscriptions (user_id pk, entitlement text, product_id, status, expires_at, store, updated_at) -- mirrored from RevenueCat webhook
push_tokens (id, user_id, token, platform, updated_at)
safety_events (id, user_id, note_id, level, action_taken, created_at)   -- minimal, for audit
```

**Why structured memory instead of "just send all the notes to the LLM"**
- Cost: 6 months of notes can reach 50k+ tokens. A memory summary plus the top-k relevant items is about 1–2k tokens.
- Quality: a curated "now" state (exam in 3 days, Anna's surgery went well, a breakup 4 months ago that's healing) produces better notes than raw logs.
- Control: the user can see, edit and delete individual memories, which is a trust and GDPR requirement.
- Raw notes are still kept forever (until the user deletes them) for recaps and re-extraction when models improve.

---

## 4. Core flows (sequence)

### 4.1 Onboarding complete → first note
1. The app collects answers locally and calls `POST /onboarding/complete`.
2. The server stores the profile, the first note, key dates and a check-in.
3. It runs the safety classifier on the free text. If `crisis` → crisis flow (see risks doc).
4. The memory extractor runs (synchronously for onboarding) and writes `memory_items` and `memory_summary v1`.
5. The note composer runs **in real time** with streaming (target < 5 s) and saves `affirmations(kind='first')`.
6. It returns the note to the app. **Fallback:** if the LLM fails or times out (8 s), show a template note personalised with slot-filling ("{name}, {life_area_phrase}. You don't have to carry it perfectly…") and regenerate in the background.

### 4.2 New note on the board
1. `POST /notes` saves the note (optimistic UI; the note appears immediately).
2. Enqueue `safety_check` (sync, ~300 ms with a small model) → `extract_memory` (async) → `compose_reply` (async, if `wants_reply`).
3. The reply is stored with `visible_at = now + human_delay` (2–60 min, shorter for heavy notes, 0 for crisis-adjacent notes where we surface resources). A push fires at `visible_at`.

### 4.3 Daily notes (the main engine)
- **Nightly batch per timezone** (for example at 02:00 local): for each active user, build a context (profile, memory summary, relevant memory items, key dates in the next 7 days, recent check-ins, recent notes, the last ~14 notes sent to avoid repetition) and submit *N* note-generation requests to the **Message Batches API** (50% cheaper; results within hours).
- Store the results as `affirmations` with `scheduled_for` per the user's slots.
- **Delivery (hybrid):**
  - The server sends a push at the scheduled time **with the text in the payload** (works even if the app hasn't been opened).
  - The app also **pre-fetches the next 24–48 h of notes** and schedules **local notifications** as a backup. This works offline, is reliable on Android OEMs that kill background processes, and the server marks it as delivered via idempotency keys so the user never gets duplicates.
- **Freshness:** if the user writes a note or checks in after the batch ran, *upcoming* notes that day are regenerated in real time when the change is significant (the classifier flags "situation changed", e.g. "I passed!!!").

### 4.4 Monthly recap
A `pg_cron` job on day 30 and monthly gathers the month's notes, check-ins, memory changes and wins. The recap composer (larger context, higher quality model/effort) writes the cards (JSON), which are rendered natively and pushed as "Your month with Rustle is ready 🌿".

### 4.5 Warm note to a friend
`POST /warm-notes` → the AI drafts 3 options → the user picks and edits → save → a short link. The web page renders server-side (Next.js) with an OG image for a rich preview in WhatsApp/iMessage.

---

## 5. Accounts: anonymous-first with safe backup ✅ (decision recommendation)

**The dilemma:** accounts add friction and many users drop off, but with no account, data is lost on reinstall or a new phone. For an app whose promise is "I remember everything", losing data is a catastrophe.

**Recommended solution: "Silent account, visible choice."**

1. **Anonymous auth on first launch** (Supabase `signInAnonymously()`). The user gets a real server-side account and a UUID immediately. No form, no email, and all data is synced to the server from day one.
2. **Persist the anonymous session across reinstalls:**
   - **iOS:** store the refresh token in the **Keychain** (`expo-secure-store` with `keychainAccessible: AFTER_FIRST_UNLOCK`, and an iCloud-synced keychain group if we want it to survive a *new device* too). Keychain items usually persist after uninstall on iOS, so a reinstall silently restores the session.
   - **Android:** use **Google Block Store** (it persists tokens across reinstalls and device restores, end-to-end encrypted) plus Android Auto Backup of an encrypted token. **Not the Android Keystore alone:** Keystore keys are deleted when the app is uninstalled. Expo has no official Block Store module, so budget for a small native module / config plugin and keep it updated with Expo SDK upgrades.
   - This covers most reinstall cases **without the user ever creating an account**.
3. **Gentle "Keep your notes safe" prompt** after value is proven: after the 5th note, on day 3, before the first recap, or when they subscribe. Copy: *"You've shared 12 notes with me. Want to make sure they're never lost, even on a new phone?"* Offer **Sign in with Apple / Google** (one tap) or an email magic link. This **links** to the same account (Supabase `linkIdentity`), with no data migration needed.
4. **At purchase:** RevenueCat uses the Supabase user ID as `appUserID`. Store-level "Restore purchases" works regardless, and we strongly nudge account linking for subscribers.
5. **Settings always shows the status:** "Your notes are backed up ✓ (Apple ID)" or "⚠️ Not backed up. If you delete the app you may lose your notes. [Protect them]".
6. **Recovery code option** for privacy-maximalists: a 12-word or QR "Rustle key" they can save, with no email needed.
7. **Passkeys: later, not MVP.** Before adding them as a sign-in option, confirm that Supabase Auth supports passkeys as a *primary* sign-in (not only as an MFA factor) and that they link to the existing anonymous account.

Sign in with Apple stays the primary option on iOS: it's the one-tap choice there, and Apple requires it (or an equivalent privacy-focused login) whenever Google sign-in is offered.

**Edge cases**
| Case | Behaviour |
|---|---|
| Reinstall, same iPhone, anonymous | Keychain token is restored → same account ✓ |
| New phone, anonymous, iCloud Keychain on | Restored ✓ |
| New phone, anonymous, no keychain sync / Android without Block Store | Data is lost unless linked. This is why we nudge linking. Show "Restore with recovery key". |
| User links Apple ID that already has a Rustle account | Ask: "Switch to that account" or "Merge" (merge = move notes/memory, keep the older subscription). |
| Anonymous user subscribes, then reinstalls with no token | RevenueCat restore by store receipt → reattaches the entitlement; data is recovered only if linked. Show a warning at purchase. |
| Anonymous accounts inactive for 12+ months | Soft email impossible → keep them for 24 months, then delete (disclosed in the privacy policy). |
| "Hide My Email" Apple relay | Supported; store the relay address. |

---

## 6. Notifications: technical details

- **Content is generated server-side**, so pushes carry the text. On iOS, use a **Notification Service Extension** only if we later need to decrypt end-to-end-encrypted payloads. For MVP, plain text over APNs/FCM (TLS) is acceptable, but check the lock-screen privacy setting.
- Mark sensitive pushes with `interruption-level: passive` / `active` appropriately; never `time-sensitive` for marketing.
- **Rate limits and fatigue:** a max of 5/day, plus quiet hours. If the last 5 are unopened, halve frequency; after 14 days inactive, 1 per 3 days; after 30 days, stop and send one gentle "I'm here if you need me."
- **Timezones and travel:** store the IANA timezone and update it on app open. Schedule in the user's local time; on a timezone change, reschedule.
- **Widget refresh:** after a delivery, write the note to App Group storage and call `WidgetCenter.reloadTimelines`. On Android, update the Glance state via WorkManager.
- **Android exact alarms:** use `SCHEDULE_EXACT_ALARM` only if needed. Inexact local notifications with ±10 min are acceptable and avoid permission friction.

---

## 7. AI service design (summary; full detail in doc 08)

| Pipeline step | Latency | Model tier (recommended) | Notes |
|---|---|---|---|
| Safety classifier | sync, < 1 s | `claude-haiku-4-5` + keyword pre-filter | Runs on every user text |
| Memory extraction | async | `claude-haiku-4-5` or `claude-sonnet-5`, structured JSON output | Upserts memory items, updates the summary weekly or on big changes |
| Daily notes | nightly **Batch API** | **Chosen by blind test:** `claude-haiku-4-5` vs `claude-sonnet-5` vs `claude-opus-5` (doc 08 §2) | 50% batch discount + prompt caching of the static system prompt |
| Note replies | async, delayed | Same test as daily notes | Human-like delay hides latency |
| Monthly recap | async | `claude-sonnet-5` or `claude-opus-5`, higher effort | Once a month, so the cost is small |
| Warm notes to friends | real time | Same test as daily notes | 3 drafts in one call (JSON) |
| Output guardrail | sync after generation | Rules + `claude-haiku-4-5` | Checks for advice, forbidden topics, length, repetition |

**Provider abstraction:** a thin `LLMClient` interface (`generate(prompt, schema, tier)`) so models can be swapped or A/B-tested per step. Log `model`, `provider`, `prompt_version`, tokens and cost for every generation.

**Failover chain:** Claude on the Anthropic API → **the same Claude model on Amazon Bedrock or Google Vertex AI (EU region)** → static template. The overnight batch rarely needs failover (it can retry before delivery time); failover matters mostly for the real-time paths. A second-vendor model (e.g. gpt-5-nano) may be wired into `LLMClient` but stays **off by default**. Turning it on requires a signed DPA and retention check, a sub-processor disclosure update, and a separate pass of the full eval suite with the same prompts.

**Cost controls:** per-user daily token budget, a circuit breaker on spend spikes, caching of the static prompt prefix, the Batch API for anything that isn't interactive, and template fallbacks.

---

## 8. Security & privacy

- **Data residency:** EU region (Frankfurt) for GDPR comfort; a US region can be added later with per-region routing.
- **Encryption:** TLS 1.2+ in transit and AES-256 at rest (managed). **Application-level envelope encryption** of `notes.body`, `memory_items.content` and `replies.body`, with keys in a KMS (per-user data keys). This protects against database dumps and staff curiosity. Trade-off: no SQL full-text search on encrypted fields, so search uses on-device or embedding-based lookup.
- **LLM provider:** use API terms under which **inputs are not used for training**. Disclose every provider that can receive note text as a sub-processor: Anthropic, plus AWS or Google for the failover route (EU region). Strip unnecessary identifiers before sending (no email or user ID in prompts).
- **Access control:** RLS on every table. Service-role keys live only in Edge Function secrets. Admin access is audited, and staff can't read notes without a break-glass process.
- **Data rights:** in-app export (JSON + readable PDF), in-app hard delete (cascade + a 30-day backup purge), and editable memory.
- **Minimal analytics:** events carry no note content. PostHog runs with IP anonymisation.
- **Secrets:** EAS secrets / Supabase vault; no API keys in the app bundle. All LLM calls go through our backend.
- **Abuse:** rate limits per user and IP on generation endpoints (warm notes could be abused for spam), and content moderation on warm-note output.
- **Lock-screen privacy** and an **app lock** (Face ID / PIN) option. This is important for people in shared households, including domestic-abuse situations.

---

## 9. Paywall & subscription implementation

- **RevenueCat** products: `rustle_premium_monthly`, `rustle_premium_annual` (7-day trial as an introductory offer), and optionally `rustle_lifetime`.
- One entitlement: `premium`.
- **Paywall UI:** RevenueCat Paywalls (remote-configurable) or a custom RN screen fed by `Offerings`. Remote config enables A/B tests of price, copy and trial.
- **Server trust:** the RevenueCat webhook updates `subscriptions`. The AI pipeline checks the entitlement before generating premium-only volume (for example more than 1 note/day, or replies).
- **Grace periods and billing retry:** keep premium during the store grace period.
- **Win-back:** RevenueCat offer codes / Google promo offers for lapsed users.
- **Web checkout (later, not MVP):** a web purchase path via **RevenueCat Web Billing** (Stripe underneath), so web and store purchases unlock the same `premium` entitlement. In-app Stripe for digital subscriptions is not allowed; linking out to web checkout is allowed only in some regions (e.g. the US after the 2025 Epic v. Apple ruling, the EU under the DMA) and the rules keep changing. **Re-check Apple and Google rules per region when we build it.**

---

## 10. Environments, CI/CD, quality

- **Environments:** `dev` / `staging` / `prod` Supabase projects; EAS build profiles to match.
- **CI:** GitHub Actions for lint, typecheck, unit tests, migrations check, and a **prompt regression test suite** (see doc 08 §8) on every prompt change.
- **Release:** EAS Build + EAS Submit; TestFlight / Play internal testing; OTA updates for JS-only fixes (respecting store rules).
- **Migrations:** Supabase CLI SQL migrations in the repo (`/supabase/migrations`).
- **Observability:** Sentry, Supabase logs, a job-failure dashboard, and an LLM cost dashboard (per day, per user cohort, per pipeline step).
- **Feature flags:** PostHog, for replies, recap, prompt versions and paywall variants.

## 11. Suggested repository structure

```
/app                 Expo app (expo-router)
  /app               routes: (onboarding)/, (tabs)/today, notes, you
  /components        UI kit (NoteCard, StickyNote, ThemeProvider…)
  /features          onboarding, notes, affirmations, recap, warm-notes, paywall, settings
  /lib               supabase client, revenuecat, analytics, notifications, secure-storage
  /targets/widget    iOS WidgetKit extension (SwiftUI)
  /android-widget    Glance widget
/supabase
  /migrations        SQL
  /functions         edge functions (onboarding-complete, notes, warm-notes, export, delete, rc-webhook,
                     job-dispatcher, batch-submit, batch-poll)
    /_shared/llm     LLMClient (Claude API + Bedrock/Vertex failover), cost logging
    /_shared/ai      composers, safety gate, memory extractor, guardrail
    /_shared/prompts versioned prompt templates (see doc 08)
/evals               golden personas, eval runner and results (`npm run eval`)
/web                 Next.js: landing page, warm-note pages, privacy/terms
/docs                this documentation
```

## 12. Scalability notes

- At 100k MAU: about 300k notes/day → batch jobs are sharded by timezone. The Postgres load is small, and the main cost is the LLM (see doc 09).
- Put pgvector indexes (HNSW) on `memory_items.embedding` per user. The per-user item count is small (< 2k), so filtering by `user_id` before the vector search is cheap.
- Partition `affirmations` by month when it passes about 50M rows.
