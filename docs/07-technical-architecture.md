# 07 · Technical Architecture

> Goals: ship an MVP quickly with a small team (1–2 engineers), keep AI cost per user low, **never lose user data**, and treat privacy as a feature.

---

## 1. Recommended stack (summary)

> **This table is the single source of truth for the stack.** Other docs link here instead of restating it. Change it here first, then log the change in [13-open-questions-and-decisions.md](13-open-questions-and-decisions.md) §D.

| Layer | Choice | Why | Alternatives |
|---|---|---|---|
| Mobile app | **React Native + Expo (SDK latest), TypeScript (strict)**, Expo Router, TanStack Query, MMKV (cache plus a small **outbox** for notes and check-ins written offline; App Group storage shared with the widget) | One codebase for iOS and Android, one language across the stack, EAS Update ships copy and UI-flow fixes without store review. The server is the source of truth; the device caches, and the outbox replays offline writes when back online | Native Swift + Kotlin (2× the cost). Flutter: rejected (see below) |
| Secure storage | **iOS Keychain** (`expo-secure-store`) · **Android Google Block Store** + Auto Backup of an encrypted token | The anonymous session must survive a reinstall (§5). Android Keystore alone is **not** enough: its keys are deleted on uninstall | — |
| Widgets | **Native**: SwiftUI WidgetKit (iOS) via `expo-apple-targets`; Jetpack Glance (Android) via `react-native-android-widget` or a native module | Widgets can't be written in RN | — |
| Abuse protection | **App Attest** (iOS) and **Play Integrity** (Android) on the onboarding-complete and warm-note endpoints, plus per-device and per-IP rate limits in Postgres | Anonymous sign-in makes the first note (and the seed notes) a free LLM call for anyone who scripts the API | — |
| Backend / DB | **Supabase**: Postgres, Auth (incl. **anonymous sign-in**), Row Level Security, Storage, Edge Functions, `pg_cron`, `pgcrypto` + Vault (column encryption, §8) | One managed platform, SQL (good for the memory model), Canada and EU regions available, open source (no lock-in) | Firebase: rejected (see below). `pgvector` embeddings: **not in the MVP** (D31); relevance is salience × recency × life-area match. Revisit when per-user memory passes a few hundred items |
| AI pipeline | **Supabase Edge Functions (Deno/TS) only, no separate API server or worker**, triggered by `pg_cron` over a Postgres jobs table. See §2.1 | One language, managed, low maintenance | A small TS worker, **only if** Edge Function limits are hit (see §2.1 for the trigger) |
| LLM | **Claude API** (Anthropic). Model per step chosen by blind test (§7, [08-ai-and-prompts.md](08-ai-and-prompts.md) §2). Failover: same Claude model via **Amazon Bedrock or Google Vertex AI (Canada or EU region)** → static template | Excellent warm, nuanced writing and strong safety behaviour; prompt caching and the Batch API cut cost. Failing over to the *same* model keeps the voice and safety behaviour identical | A second-vendor small model (e.g. OpenAI gpt-5-nano) behind `LLMClient`, **off by default** (see §7) |
| Queue / scheduling | `pg_cron` + a Postgres jobs table | Nightly note generation, delivery scheduling, retries | Inngest / Trigger.dev if the jobs table gets complex |
| Push | **Expo Notifications** (wraps APNs + FCM) with **opaque payloads** (a delivery ID, never note text), an iOS **Notification Service Extension** (via `expo-apple-targets`) and Android **data messages** that fetch the text on-device, plus **local scheduled notifications** | See §6. No third party relays note content (D30) | OneSignal |
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
│  UI · local cache (MMKV) + offline outbox · local notification scheduler│
│  Widget + notification extensions (SwiftUI / Glance / NSE) ← App Group  │
│  RevenueCat SDK · PostHog SDK · Sentry                                  │
└──────────────┬──────────────────────────────────────────▲───────────────┘
               │ HTTPS (Supabase client, JWT)             │ push (APNs/FCM)
               ▼                                          │
┌────────────────────────── Supabase (Canada region) ─────────┴───────────────┐
│ Auth (anonymous → linked Apple/Google/email)                            │
│ Postgres + RLS: users, profiles, consents, notes, checkins,             │
│   memory_items, deliveries, replies, recaps, warm_notes,                │
│   entitlement_grants, jobs · pgcrypto + Vault (note text encrypted)    │
│ Storage (share cards, export)                                          │
│ Edge Functions: /onboarding/complete, /notes (create), /warm-notes,     │
│   /recap, /export, /delete-account, RevenueCat webhook                  │
└──────────────┬───────────────────────────────────────────▲──────────────┘
               │ jobs table / pg_cron                      │
               ▼                                           │
┌──────────── AI pipeline (Supabase Edge Functions, Deno/TS) ┴────────────┐
│ 1. Safety classifier (every user input)                                  │
│ 2. Memory extractor (note → memory_items)                               │
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
- **Nightly notes** are split into steps that each fit in one invocation: *build contexts for one timezone shard → submit a Message Batch → poll the batch on later cron ticks → ingest results into `deliveries`*. No invocation waits for a batch to finish.
- Real-time paths (first note, warm notes, safety gate) run directly in their request function, with the 8-second template fallback (§4.1).

**Trigger to add a worker:** if jobs regularly time out, or chunking starts to distort the code, add one small TypeScript worker for the batch steps only. The jobs table, prompts and `LLMClient` stay the same, so this is a move, not a rewrite. Record it in doc 13 §D if it happens.

---

## 3. Data model (Postgres)

> Every table has RLS: `user_id = auth.uid()`. Sensitive text columns are encrypted at rest (Supabase disk encryption), with optional **column-level encryption** (pgsodium / app-layer envelope encryption) for note bodies. See §8.

```sql
-- Identity
users (id uuid pk = auth.users.id, created_at, is_anonymous bool, locale text,
       timezone text, age_confirmed_at timestamptz,
       welcome_week_ends_at timestamptz null,   -- set when the user taps "Not now" (doc 09 §3)
       deleted_at timestamptz)

consents (id uuid pk, user_id, kind text,   -- 'terms'|'ai_processing'|'special_category'|'quality_review'|'marketing_use'
          version text, locale text, granted_at timestamptz, withdrawn_at timestamptz null)

profiles (user_id pk fk, display_name text, pronouns text null,
          tone text[],                 -- e.g. {'gentle','humour'}
          avoid text[],                -- hard constraints: {'advice','religion','ex'}
          focus_weights jsonb,         -- {"exams":0.6,"health":0.4}
          style_notes text null,       -- learned from reactions: "prefers shorter, less emoji"
          theme text, lockscreen_private bool,   -- default true for sensitive life areas (§6), else false
          simple_mode bool default false, app_lock bool default false,
          reply_default text default 'reply')   -- 'reply' | 'listen'

delivery_prefs (user_id pk, slots jsonb,          -- [{"time":"08:00"},{"time":"21:00"}]
                per_day int default 2, quiet_hours jsonb, adaptive bool,
                rhythm text default 'active',    -- 'active' | 'quiet'  (seasons, D22)
                paused_until timestamptz)

-- Inputs
notes (id uuid pk, user_id, body text /* encrypted, §8 */, mood smallint null, source text,  -- 'onboarding'|'board'|'checkin'|'voice'
       wants_reply bool, pinned bool, hidden_from_recap bool,
       exclude_from_ai bool default false,   -- "forget this": the note stays on the board, never enters context again
       safety_level text,            -- 'none'|'low'|'elevated'|'crisis'
       life_areas text[], created_at, edited_at, deleted_at)

checkins (id, user_id, mood smallint, energy smallint null, line text null, created_at)

key_dates (id, user_id, label text, date date, kind text,   -- exam|appointment|anniversary|court|medical|other
           remind bool,                  -- opt-in for grief and medical dates (asked when captured); default true otherwise
           recurring bool, source_note_id null, created_at)

-- Memory (the heart of the product)
memory_items (id uuid pk, user_id,
              kind text,        -- fact|person|situation|feeling|win|struggle|helps|avoid|goal|date|identity
              content text /* encrypted */,     -- "Sister Maya is having surgery on Oct 3"
              salience real,    -- 0..1 importance
              status text,      -- active|resolved|archived|user_deleted
              resolved_at timestamptz null,     -- chapters close here (D22); feeds the "situation resolved" metric
              life_areas text[],
              first_seen_at, last_seen_at, times_mentioned int,
              source_note_ids uuid[],
              user_visible bool default true, user_edited bool default false)
-- No embedding column in the MVP (D31). Relevance = salience × recency × life-area match (doc 08 §3.3).

memory_summary (user_id pk, summary text /* encrypted */,   -- rolling ~250-word "who they are & what's happening now"
                version int, updated_at)

-- Outputs
deliveries (id uuid pk, user_id, body text /* encrypted */, kind text,     -- daily|date_eve|date_day|follow_up|quiet_presence|win_celebration|first|seed|presence|reengage  ("a Rustle"; see 00-glossary)
              scheduled_for timestamptz, delivered_at, opened_at,
              reaction text null,                            -- heart|not_quite
              reaction_reason text null,                     -- too_generic|too_positive|wrong_topic|too_long|dont_mention
              memory_refs uuid[],                            -- which memory items it used
              model text, prompt_version text, cost_micros int, created_at)

replies (id, user_id, note_id fk, body text /* encrypted */, visible_at timestamptz,
         reaction text null, reaction_reason text null, model, prompt_version, created_at)

recaps (id, user_id, period_start, period_end, cards jsonb /* encrypted */,
        helped text null,             -- 'a_lot'|'a_little'|'not_really' (the one feedback question, doc 01 §5.4)
        created_at, viewed_at, shared bool)

warm_notes (id text pk /* short, unguessable slug */, sender_user_id, recipient_label text null,
            situation text, body text, card_style text, created_at, expires_at,
            opened_count int, thanked_at timestamptz null,      -- recipient's one-tap "thank you" (D37)
            revoked bool, reported_at timestamptz null,
            moderation_status text default 'approved')          -- approved|held|removed

-- Entitlements
subscriptions (user_id pk, entitlement text, product_id, status, expires_at, store, updated_at) -- mirrored from the RevenueCat webhook
entitlement_grants (id uuid pk, code text unique, kind text,   -- beta|creator|student|gift|partner|hardship|support
                    entitlement text default 'premium', duration_days int, partner_id uuid null,
                    max_redemptions int default 1, redeemed_by uuid[], created_at, expires_at)  -- doc 09 §9

-- Ops
jobs (id, type, user_id, payload jsonb, run_at, status, attempts, last_error)
push_tokens (id, user_id, token, platform, updated_at)
safety_events (id, user_id, note_id, level, action_taken, created_at)   -- minimal, for audit
```

**Why structured memory instead of "just send all the notes to the LLM"**
- Cost: 6 months of notes can reach 50k+ tokens. A memory summary plus the top-k relevant items is about 1–2k tokens.
- Quality: a curated "now" state (exam in 3 days, Maya's surgery went well, a breakup 4 months ago that's healing) produces better notes than raw logs.
- Control: the user can see, edit and delete individual memories, which is a trust and GDPR requirement.
- Raw notes are still kept forever (until the user deletes them) for recaps and re-extraction when models improve.

**Relevance without embeddings (D31).** Per-user memory is small (rarely more than a few hundred items), so the planner ranks `memory_items` by `salience × recency × life-area match` with the slot's focus, and the summariser already does the semantic work of deciding what matters now. Repetition against recent Rustles is checked with a cheap string-similarity measure (doc 08 §5.8). Embeddings would add an unnamed sub-processor for note text (Anthropic has no embeddings API); add them only if ranking quality demands it, computed in-process (for example gte-small in the Edge runtime) rather than through a third party.

---

## 4. Core flows (sequence)

### 4.1 Onboarding complete → first note
1. The app collects answers locally and calls `POST /onboarding/complete` with an **App Attest / Play Integrity** assertion (§8); the endpoint is rate-limited per device and IP.
2. The server stores the profile, the consent records (`consents`), the first note, key dates (with `remind` set from the opt-in question for grief and medical dates) and a check-in.
3. It runs the safety classifier on the free text. If `crisis` → crisis flow (see risks doc).
4. The memory extractor runs (synchronously for onboarding) and writes `memory_items` and `memory_summary v1`.
5. The note composer runs **in real time** with streaming (target < 5 s) and saves `deliveries(kind='first')`.
6. It returns the note to the app. **Fallback:** if the LLM fails or times out (8 s), show a template note personalised with slot-filling ("{name}, {life_area_phrase}. You don't have to carry it perfectly…") and regenerate in the background. The client state machine has three states, *streaming → shown* or *streaming → fallback → replaced*, and never shows two notes.
7. **Seed notes:** the same call then composes the next **48 hours** of Rustles (two a day at the chosen slots, `kind='seed'`, one Batch-free real-time call returning all of them as JSON) so the user isn't empty until the first nightly batch. They're stored as `deliveries` and pre-fetched by the app for local scheduling (§4.3).

### 4.2 New note on the board
1. The app writes the note to the local **outbox** and shows it on the board immediately; `POST /notes` syncs it, retrying until online. Edits and deletes go through the same outbox.
2. Enqueue `safety_check` (sync, ~300 ms with a small model) → `extract_memory` (async) → `compose_reply` (async, if `wants_reply` and the user's entitlement state allows a note back: premium and welcome week on every note; door open on the first note of each week only; safety responses for `elevated` and `crisis` always, doc 09 §2).
3. The reply is stored with `visible_at = now + human_delay` (2–60 min, shorter for heavy notes, 0 for crisis-adjacent notes where we surface resources). A push fires at `visible_at`.
4. **High-volume writers** (more than one note per 30 minutes): replies are batched into one note back attached to the **most recent** note, at most one per 30 minutes, and the reply may reference the others ("everything you wrote this afternoon").

### 4.3 Daily notes (the main engine)
- **Nightly batch per timezone** (for example at 02:00 local): for each user in an active entitlement state (premium, welcome week), build a context (profile, memory summary, relevant memory items, key dates in the next 7 days, recent check-ins, recent notes, the last ~14 notes sent to avoid repetition) and submit *N* note-generation requests to the **Message Batches API** (50% cheaper). Generate **two days ahead**: batches usually finish within an hour but the guarantee is 24 hours. Timezone shards with fewer than 50 users are merged into hourly groups.
- Door-open users are planned by the same job: one `presence` Rustle a week at their favourite slot, plus key-date notes on the day (doc 09 §2).
- Store the results as `deliveries` with `scheduled_for` per the user's slots.
- **Real-time fallback:** a cron tick 30 minutes before any slot with no delivered note for that user composes one directly (Messages API), then the template.
- **Delivery (hybrid, opaque payloads, D30):**
  - The server sends a push at the scheduled time carrying only the **delivery ID** and a generic alert ("A note from Rustle 🌿"). On iOS a **Notification Service Extension** fetches the text over TLS from our API (or reads it from the pre-fetched App Group cache) and rewrites the notification before it's shown; on Android the push is a **data message** and the app builds the notification locally. Expo, Apple and Google relay only an ID.
  - The app also **pre-fetches the next 48 h of notes** and schedules **local notifications** as a backup (these carry the text, fetched directly from our API). This works offline, is reliable on Android OEMs that kill background processes, and the server marks deliveries via idempotency keys so the user never gets duplicates.
  - If the extension can't fetch in time, the generic alert stays and the text is in the app and the widget. Never an empty or broken notification.
- **Freshness:** if the user writes a note or checks in after the batch ran and the extractor returns `situation_changed_significantly` (a new or resolved situation, a key-date outcome, or a mood swing of 2+ points), the app **cancels today's undelivered local notifications**, the server regenerates today's remaining slots in real time and reschedules them.

### 4.4 Monthly recap
A `pg_cron` job on day 30 and monthly gathers the month's notes, check-ins, memory changes and wins. The recap composer (larger context, higher quality model/effort) writes the cards (JSON), which are rendered natively and pushed as "Your month with Rustle is ready 🌿". The last card asks one non-clinical question, *"Did Rustle help this month?"* (a lot / a little / not really), stored in `recaps.helped`. Door-open users get the first two cards and the share line; the full story is premium (doc 09 §2).

### 4.5 Warm note to a friend
`POST /warm-notes` (App Attest / Play Integrity + rate limit) → the AI drafts 3 options → the user picks and edits → output moderation on the edited text → save → a short, unguessable link. The web page renders server-side (Next.js) with an OG image for a rich preview in WhatsApp/iMessage; it is `noindex`, expiring, revocable and reportable, and carries no analytics beyond a page-view count. The recipient can tap **❤️ thank you** once (no text, D37): `warm_notes.thanked_at` is set and the sender gets one push. Vercel therefore receives user-written warm-note text and is listed as a sub-processor (doc 11 §4.2).

---

## 5. Accounts: anonymous-first with safe backup ✅ (decision recommendation)

**The dilemma:** accounts add friction and many users drop off, but with no account, data is lost on reinstall or a new phone. For an app whose promise is "I remember everything", losing data is a catastrophe.

**Recommended solution: "Silent account, visible choice."**

1. **Anonymous auth on first launch** (Supabase `signInAnonymously()`). The user gets a real server-side account and a UUID immediately. No form, no email, and all data is synced to the server from day one.
2. **Persist the anonymous session across reinstalls:**
   - **iOS:** store the refresh token in the **Keychain** (`expo-secure-store` with `keychainAccessible: AFTER_FIRST_UNLOCK`, and an iCloud-synced keychain group if we want it to survive a *new device* too). Keychain items usually persist after uninstall on iOS, so a reinstall silently restores the session. **This is observed behaviour, not a documented guarantee:** treat it as best-effort, test it on every iOS major version, and nudge account linking early for anyone with more than a few notes.
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
| User links Apple ID that already has a Rustle account | Ask: "Switch to that account" or "Merge". Merge = keep **both** sets of notes and memory items, re-run the summariser, keep the older subscription, and show a one-time banner in "What Rustle remembers" so the user can tidy duplicates. |
| Anonymous user subscribes, then reinstalls with no token | RevenueCat restore by store receipt → reattaches the entitlement; data is recovered only if linked. Show a warning at purchase. |
| Anonymous accounts inactive for 12+ months | Soft email impossible → keep them for 24 months, then delete (disclosed in the privacy policy). |
| "Hide My Email" Apple relay | Supported; store the relay address. |

---

## 6. Notifications: technical details

- **Payloads are opaque (D30).** The push carries a delivery ID and a generic alert; the **iOS Notification Service Extension** (MVP, same `expo-apple-targets` plugin as the widget) and Android data messages fetch the text on-device. Local backup notifications carry the text fetched directly from our API. Expo's relay, APNs and FCM never see note content. The extension respects the lock-screen privacy setting: with privacy on, it leaves the generic alert.
- **Lock-screen privacy defaults to on** when the life areas include divorce or separation, abuse, illness, or grief, with a one-line explanation the user can change. It's off by default otherwise.
- Mark sensitive pushes with `interruption-level: passive` / `active` appropriately; never `time-sensitive` for marketing.
- **Rate limits and fatigue:** a max of 5/day, plus quiet hours. If the last 5 are unopened, halve the user's chosen frequency, down to a **floor of one every two days**; any ❤️, note written or check-in **restores the user's setting**. After 14 days inactive, 1 per 3 days; after 30 days, stop and send one gentle "I'm here if you need me." Door-open users are already at one a week and aren't reduced further.
- **Timezones and travel:** store the IANA timezone and update it on app open. Schedule in the user's local time; on a timezone change, reschedule.
- **Widget refresh:** after a delivery, write the note to App Group storage and call `WidgetCenter.reloadTimelines`. On Android, update the Glance state via WorkManager.
- **Android exact alarms:** use `SCHEDULE_EXACT_ALARM` only if needed. Inexact local notifications with ±10 min are acceptable and avoid permission friction.

---

## 7. AI service design (summary; full detail in doc 08)

| Pipeline step | Latency | Model tier (recommended) | Notes |
|---|---|---|---|
| Safety classifier | sync, < 1 s | `claude-haiku-4-5` + keyword pre-filter | Runs on every user text |
| Memory extraction | async | `claude-haiku-4-5` or `claude-sonnet-5`, structured JSON output | Upserts memory items, updates the summary weekly or on big changes |
| Daily notes | nightly **Batch API** | **Chosen by blind test:** `claude-haiku-4-5` vs `claude-sonnet-5` vs `claude-opus-5-5` (doc 08 §2) | 50% batch discount + prompt caching of the static system prompt |
| Note replies | async, delayed | Same test as daily notes | Human-like delay hides latency |
| Monthly recap | async | `claude-sonnet-5` or `claude-opus-5`, higher effort | Once a month, so the cost is small |
| Warm notes to friends | real time | Same test as daily notes | 3 drafts in one call (JSON) |
| Output guardrail | sync after generation | Rules + `claude-haiku-4-5` | Checks for advice, forbidden topics, length, repetition |

**Provider abstraction:** a thin `LLMClient` interface (`generate(prompt, schema, tier)`) so models can be swapped or A/B-tested per step. Log `model`, `provider`, `prompt_version`, tokens and cost for every generation.

**Failover chain:** Claude on the Anthropic API → **the same Claude model on Amazon Bedrock or Google Vertex AI (EU region)** → static template. The overnight batch rarely needs failover (it can retry before delivery time); failover matters mostly for the real-time paths. A second-vendor model (e.g. gpt-5-nano) may be wired into `LLMClient` but stays **off by default**. Turning it on requires a signed DPA and retention check, a sub-processor disclosure update, and a separate pass of the full eval suite with the same prompts.

**Cost controls:** per-user daily token budget, a circuit breaker on spend spikes, caching of the static prompt prefix, the Batch API for anything that isn't interactive, and template fallbacks.

---

## 8. Security & privacy

- **Data residency (D25):** **Canada (Central) region first.** Rustle is an Ontario company and the soft launch is Canada, so hosting in Canada is the honest "proudly Canadian" story and the strongest answer to Quebec Law 25's assessment of transfers outside Quebec (verify the region on the chosen Supabase plan). An **EU region** with per-region routing is added before the France/Belgium/Switzerland launch so GDPR users' data stays in the EU. LLM calls still leave the region (Anthropic's API; for failover, a Bedrock region in Canada if Claude is offered there, otherwise US/EU), which the privacy policy discloses as a sub-processor transfer.
- **Encryption (D29):** TLS 1.2+ in transit and AES-256 at rest (managed). On top, **column encryption with `pgcrypto`** for `notes.body`, `memory_items.content`, `memory_summary.summary`, `deliveries.body`, `replies.body` and `recaps.cards`, using a key held in **Supabase Vault**, with **decrypting views under RLS** so the app keeps reading through PostgREST and the Edge Functions read plaintext for the AI pipeline. This protects against database dumps, backup leaks and casual access; it does **not** protect against a database administrator, and the privacy policy says so honestly ("encrypted at rest, access audited", not "end-to-end"). Trade-off: no SQL full-text search on encrypted columns, so board search is on-device over the cached notes. Revisit app-layer envelope encryption with per-user keys before the EU launch. Encrypt from **migration 1**: retrofitting a live table is the migration nobody wants.
- **LLM provider:** use API terms under which **inputs are not used for training**. Disclose every provider that can receive note text as a sub-processor: Anthropic, plus AWS or Google for the failover route (EU region). Strip unnecessary identifiers before sending (no email or user ID in prompts).
- **Access control:** RLS on every table. Service-role keys live only in Edge Function secrets. Admin access is audited, and staff can't read notes without a break-glass process.
- **Data rights:** in-app export (JSON + readable PDF), in-app hard delete (cascade + a 30-day backup purge), and editable memory.
- **Minimal analytics:** events carry no note content. PostHog runs with IP anonymisation.
- **Secrets:** EAS secrets / Supabase vault; no API keys in the app bundle. All LLM calls go through our backend.
- **Abuse:** **App Attest** (iOS) and **Play Integrity** (Android) assertions on `onboarding/complete` and `warm-notes`, rate limits per user, device and IP on every generation endpoint (warm notes could be abused for spam), and content moderation on warm-note output including after edits.
- **Sub-processors that can receive note text:** Supabase (database), Anthropic (LLM), Vercel (warm-note pages, user-written text only), and AWS or Google **only if** the failover route is enabled. RevenueCat, PostHog, Sentry and Expo's push relay receive no note content by design. The email provider never receives note content: recap emails say "your month is ready" and link to the app.
- **Lock-screen privacy** and an **app lock** (Face ID / PIN) option. This is important for people in shared households, including domestic-abuse situations.

---

## 9. Paywall & subscription implementation

- **RevenueCat** products: `rustle_premium_monthly` and `rustle_premium_annual`, both with a 7-day trial as the introductory offer; `rustle_premium_annual_14d` (the same plan with a 14-day trial, offered when a key date falls 8–14 days out, doc 09 §8); a **hardship promotional offer** (50% off for 3 months) attached to both plans (doc 09 §4). Lifetime deferred; chapter pass (non-renewing, 6 weeks) in V1.1.
- One entitlement: `premium`. It can come from a store subscription **or** from an `entitlement_grants` code redeemed through an Edge Function that calls RevenueCat's granted-entitlements API (beta testers, creators, students, gifts, partner seats, support; doc 09 §9).
- **Entitlement states the planner reads** (server-side, from `subscriptions`, `entitlement_grants` and `users.welcome_week_ends_at`): `premium` (trial, paid or granted) · `welcome_week` (7 days after "Not now", full experience, no card) · `door_open` (everything else). Doc 09 §2 defines what each gets.
- **Paywall UI:** RevenueCat Paywalls (remote-configurable) or a custom RN screen fed by `Offerings`. Remote config enables A/B tests of price, copy and trial.
- **Server trust:** the RevenueCat webhook updates `subscriptions`; the app's RevenueCat SDK state is for instant UI only. The planner reads the server-side state: **premium** and **welcome week** → daily notes, replies, full recap; **door open** → one presence note a week, key-date notes on the day, memory extraction, one note back a week on the first note written (safety responses always). See doc 09 §2.
- **Grace periods and billing retry:** keep premium during the store grace period.
- **Win-back:** RevenueCat offer codes / Google promo offers for lapsed users. **Before cancelling** (the Settings entry that deep-links to the store), show one calm screen offering the quiet-season downgrade once it exists (V1.x, doc 09 §7); never a guilt screen.
- **Web checkout (later, not MVP):** a web purchase path via **RevenueCat Web Billing** (Stripe underneath), so web and store purchases unlock the same `premium` entitlement. In-app Stripe for digital subscriptions is not allowed; linking out to web checkout is allowed only in some regions (e.g. the US after the 2025 Epic v. Apple ruling, the EU under the DMA) and the rules keep changing. **Re-check Apple and Google rules per region when we build it.**

---

## 10. Environments, CI/CD, quality

- **Environments:** `dev` / `staging` / `prod` Supabase projects; EAS build profiles to match.
- **CI:** GitHub Actions for lint, typecheck, unit tests, migrations check, and a **prompt regression test suite** (see doc 08 §8) on every prompt change.
- **Release:** EAS Build + EAS Submit; TestFlight / Play internal testing; OTA updates for JS-only fixes (respecting store rules).
- **Migrations:** Supabase CLI SQL migrations in the repo (`/supabase/migrations`).
- **Observability:** Sentry, Supabase logs, a job-failure dashboard, and an LLM cost dashboard (per day, per user cohort, per pipeline step).
- **Feature flags:** PostHog, for replies, recap, prompt versions and paywall experiments.

## 11. Suggested repository structure

```
/app                 Expo app (expo-router)
  /app               routes: (onboarding)/, (tabs)/today, notes, you
  /components        UI kit (NoteCard, StickyNote, ThemeProvider…)
  /features          onboarding, notes, deliveries, recap, warm-notes, paywall, settings
  /lib               supabase client, revenuecat, analytics, notifications, secure-storage, outbox
  /targets/widget    iOS WidgetKit extension (SwiftUI)
  /targets/notification-service   iOS Notification Service Extension (fetches note text, D30)
  /android-widget    Glance widget
/packages/shared     zod schemas, prompt types, glossary constants, design tokens (doc 20 §13);
                     pure ESM with no Node built-ins so both the app and Deno functions import it
/supabase
  /migrations        SQL
  /functions         edge functions (onboarding-complete, notes, warm-notes, export, delete, rc-webhook,
                     job-dispatcher, batch-submit, batch-poll)
    /_shared/llm     LLMClient (Claude API + Bedrock/Vertex failover), cost logging
    /_shared/ai      composers, safety gate, memory extractor, guardrail
    /_shared/prompts versioned prompt templates (see doc 08)
/evals               golden personas, eval runner and results (`npm run eval`)
/scripts             one-off tools: create entitlement codes, contrast check on tokens (doc 20 §15)
CLAUDE.md            standing instructions for Claude Code (root)
/web                 Next.js: landing page, warm-note pages, privacy/terms
/docs                this documentation
```

## 12. Scalability notes

- At 100k MAU: about 300k notes/day → batch jobs are sharded by timezone. The Postgres load is small, and the main cost is the LLM (see doc 09).
- Memory ranking is a per-user query over a few hundred rows (`user_id`, `status`, `life_areas`, `salience`, `last_seen_at`); a composite index on `(user_id, status)` is enough. If embeddings are added later, compute them in-process and index with HNSW per user.
- Partition `deliveries` by month when it passes about 50M rows.
