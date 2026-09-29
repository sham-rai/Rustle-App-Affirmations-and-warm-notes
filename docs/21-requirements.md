# 21 · Requirements: Acceptance Criteria for the MVP

> **Build from this.** One block per MVP item in doc 06 §2, in the build order of doc 15 §4. Each block says where the spec lives and what "done" means. Claude Code should treat every criterion as a test to write or a manual check to list. When a criterion changes, change the source doc first, then this file, then log it in doc 13 §D.
> Conventions: "Rustle" = a delivery; "note" = what the user writes; "note back" = a reply (doc 00). Entitlement states: `premium`, `welcome_week`, `door_open` (doc 09 §2).

## 0. Foundations (doc 15 §4 sessions 1–2, 5; doc 07 §10–11)
1. Monorepo with `/app`, `/supabase`, `/packages/shared`, `/evals`, `/web`, `/scripts`, `CLAUDE.md`; `npm run typecheck`, `npm run lint` and `npm test` run in CI on every PR and a failure blocks merge; `npm run eval` runs in CI on every PR that changes `supabase/functions/_shared/prompts/**` or `evals/**` (it calls the Claude API) and a failure blocks merge.
2. Three Supabase projects (dev, staging, prod) with matching EAS profiles; secrets only in EAS/Supabase secrets; a pre-commit secret scanner is installed.
3. Migration 1 creates every table in doc 07 §3 with RLS in the same migration; pgTAP tests prove user A cannot read, update or delete user B's rows in any table.
4. Encrypted columns (`notes.body`, `memory_items.content`, `memory_summary.summary`, `deliveries.body`, `replies.body`, `recaps.cards`) are unreadable in a raw `SELECT` and readable through the decrypting views under RLS; the key lives in Vault.
5. Sentry receives a test crash with request bodies scrubbed; PostHog receives `app_opened` with no content properties; both run in their EU/Canada-appropriate regions.
6. `packages/shared` exports zod schemas, the glossary constants and the design tokens, and is imported by both the Expo app and a Deno Edge Function without a build step.

## 1. Splash, Rustle screen, 18+ gate, consent (doc 05 §2–3, doc 11 §4–5)
0. Cold start shows the company splash (DreamTeam Co., placeholder) for about 2 s on paper, then fades into the Rustle screen; the native splash uses the same paper colour so no flash is visible; a warm start skips both.
1. The Rustle screen shows the tree (Skia, from the tree module; still under reduce-motion), the wordmark and mark from the first frame, and after 1 s the headline, sub, "Begin", "I already have an account" and the crisis footer with the AI disclosure, in EN and FR from the device locale (fr-FR, fr-CA, fr-BE, fr-CH → French). Returning users go to Today after the 1 s beat.
2. A neutral date-of-birth picker precedes onboarding; under 18 shows the youth-resources screen with localised helplines and blocks retry for that install (local flag); 18+ writes `users.age_confirmed_at`.
3. Consent screens for terms, AI processing and special-category data are separate from each other and from the ToS acceptance; each writes a `consents` row with kind, version, locale and timestamp; declining AI processing ends onboarding with a kind message and no account data beyond the anonymous user.
4. The AI disclosure sentence ("Rustle is AI, not a therapist or a crisis service") is visible on the consent screen and in About.

## 2. Onboarding and the first note (doc 05 §3, doc 07 §4.1, doc 08 §5.10)
1. Five screens as specified in doc 05 §3; every open question is skippable; the progress line has no step numbers; chips are laid out at French length without truncation; the whole flow takes under 90 s when every open field is skipped.
2. Screen 2 stores the free text as the first note and the optional date as a `key_dates` row, asking the opt-in question for anniversary and medical kinds (`key_dates.remind`); screen 3 uses the five labelled marks; screen 4 stores tone and avoid list and, for French users, tu/vous; screen 5 stores the optional name and the slots, and `delivery_prefs.per_day` defaults to 2.
3. `POST /onboarding/complete` requires a valid App Attest / Play Integrity assertion, is rate-limited per device and IP, and stores profile, consents, first note, key dates and check-in in one transaction.
4. The first Rustle streams and appears within 5 s in the happy path; at 8 s without a result the personalised template shows, and the regenerated note replaces it silently later; the screen never shows two notes.
5. The first Rustle references at least one specific thing from screens 1–2 (eval check on the golden personas > 95%); when every open question was skipped it still references the chosen life areas.
6. Onboarding text classified `crisis` shows the crisis screen before anything else; `elevated` or `crisis` suppresses the paywall for that session and marks the first Rustle as soft.
7. The same call writes 48 h of seed Rustles (`kind='seed'`, two a day at the chosen slots), which the app pre-fetches and schedules locally.
8. ❤️ / "Not quite" on the first Rustle writes `deliveries.reaction` and, for "Not quite", a one-tap `reaction_reason`.
9. The notification permission prompt appears only after the first Rustle and its reaction, with the pre-prompt line naming the chosen slots.

## 3. Anonymous account, persistence, linking (doc 07 §5)
1. First launch creates an anonymous Supabase user with no form; all data syncs server-side from the first write.
2. iOS: delete and reinstall on the same iPhone restores the same account; Android: the same on two different phones via Block Store; both are in the manual checklist for every OS major version.
3. "Keep your notes safe" appears after the fifth note, on day 5, before the first recap, or at purchase, whichever first, at most once per day, never in a heavy-note session; Sign in with Apple, Google and email magic link all link to the existing user (`linkIdentity`) with no data copy.
4. Settings always shows backup status ("Backed up ✓ (Apple ID)" or the warning with "Protect them"); a recovery key can be generated and used to restore an anonymous account on a new device.
5. Linking an identity that already owns another Rustle account offers "Switch" or "Merge"; merge keeps both note sets, re-runs the summariser, keeps the older subscription, and shows the tidy-up banner in "What Rustle remembers".

## 4. Today (doc 05 §4, doc 20 §7.1)
1. The latest Rustle is the hero card in the user's theme with ❤️, share and "Send a warm note"; "Not quite" is one tap deeper except on the first Rustle.
2. Earlier Rustles scroll below; the check-in card appears when due (2–4 a week, never twice in a day) with the five labelled marks and an optional line.
3. A date-aware banner shows when a key date is within 24 h; the footer shows "days you showed up" as leaf marks without a count.
4. Opening from a push, the widget or a deep link lands on the right Rustle and logs `app_opened.source`.

## 5. Notes board and notes back (doc 05 §5, doc 07 §4.2, doc 08 §5.3)
1. Create, edit, delete and pin notes; the sticky-note grid has seeded rotation; list view and search work on the on-device cache (encrypted columns are not searched server-side).
2. A note written offline appears immediately, sits in the outbox, syncs when online (including an offline edit), and logs `board_note_created.offline = true`.
3. Every note runs the safety gate synchronously before any other job; `crisis` shows the crisis screen and composes no note back; `elevated` composes a note back with the elevated rules and shows the resources card.
4. A note back is composed only when `wants_reply` is true and the entitlement state allows it: `premium` and `welcome_week` on every note; `door_open` on the first note of the calendar week only. Safety responses are never gated.
5. The note back becomes visible between 2 and 60 minutes after posting (sooner for heavy notes), attaches to the note with the "stick" animation, sends one push, and offers ❤️ / "Not quite" with a reason; there is no text field under it.
6. The first note back ever shows the one-time "I'll sometimes leave a note back" line; a door-open user's second note in a week shows the contextual card instead of a note back, never after an `elevated` or `crisis` note.
7. More than one note per 30 minutes produces one batched note back attached to the most recent note.
8. "Forget this" sets `exclude_from_ai`, deletes memory items derived only from that note and re-summarises; deleting a note does the same and removes it from the board; editing re-extracts.
9. Long-press actions: Pin · Hide from recaps · Forget this · Edit · Delete · Report this note.

## 6. Memory engine and "What Rustle remembers" (doc 08 §3, §5.4–5.5, doc 05 §6)
1. The extractor returns valid JSON matching the schema on > 99.5% of golden inputs and never proposes a diagnosis or a third party's sensitive detail beyond first name + relationship.
2. `add`, `update`, `resolve` operations upsert `memory_items`; resolving sets `resolved_at`, emits `situation_resolved`, schedules exactly one follow-up Rustle and removes the item from daily focus.
3. The rolling summary is regenerated weekly or when `situation_changed_significantly` is true and stays within ~250 words.
4. "What Rustle remembers" lists items grouped by People · Dates · Situations · Things that help · Things to avoid; edit sets `user_edited = true` and the extractor never overrides an edited item; delete sets `user_deleted`; "Pause memory" stops extraction until resumed.
5. A user-added avoid item is a hard constraint: the eval suite reports 0 avoid-list violations across the golden set.

## 7. Daily Rustles, delivery, seed notes (doc 07 §4.3, §6, doc 08 §3.3)
1. The nightly job runs per timezone shard (shards under 50 users merged hourly), builds context packs, submits one Message Batch per shard, polls on later cron ticks and ingests results as `deliveries` two days ahead; no invocation waits on a batch.
2. The planner picks an intent per slot by the rotation rules, at most one explicit older-memory callback a day, about one in five `quiet_presence`, no upbeat intents for 72 h after an `elevated` signal, and honours `rhythm = 'quiet'` (2–3 a week).
3. Door-open users get one `presence` Rustle a week at their favourite slot plus key-date notes on the day; nothing else is composed for them.
4. A slot with no delivered Rustle 30 minutes before its time gets a real-time composition, then the template; no slot is ever empty and no push is ever blank.
5. The push carries only `delivery_id` and the generic alert; the iOS Notification Service Extension fetches the text (from the App Group cache or the API) and rewrites the notification, leaving the generic line when lock-screen privacy is on or the fetch fails; Android data messages build the notification in-app.
6. The app pre-fetches 48 h of Rustles and schedules local notifications; a Rustle delivered by push suppresses its local twin and vice versa (idempotency key); the manual checklist covers timezone change, DST and a phone offline for two days.
7. After a significant change, today's undelivered local notifications are cancelled and the remaining slots regenerated.
8. Fatigue rule: five unopened in a row halves frequency to a floor of one every two days; any ❤️, note or check-in restores the setting; 14 days inactive → 1 per 3 days; 30 days → one "I'm here if you need me" and stop.
9. The output guardrail rejects banned phrases, advice, avoid-list terms, URLs or numbers outside the crisis flow, wrong language, and > 0.8 similarity to the last 14 Rustles; one regeneration, then the template.

## 8. Delivery settings, lock-screen privacy, app lock (doc 05 §6–7, doc 07 §6, doc 11 §2)
1. Slots, quiet hours, "adapt to me" and quiet season are editable by everyone; frequency (1–5) is editable in `premium` and `welcome_week` and shown disabled with one line in `door_open`.
2. Lock-screen privacy defaults to on when life areas include divorce/separation, abuse, illness or grief, with an explanation and a switch; off otherwise; the extension respects it.
3. App lock (Face ID / Touch ID / PIN) protects every screen after 30 s in the background and is offered once after onboarding for the same sensitive life areas.
4. Grief and medical dates with `remind = false` never produce a Rustle; with `remind = true`, the date-day Rustle passes the extra-gentle eval rubric.

## 9. Safety gate and crisis flow (doc 08 §5.7, §7, doc 11 §3, §5b)
1. The keyword pre-filter (EN + FR, incl. fr-CA) escalates to at least `elevated` regardless of the model; the classifier runs on every user text in under 1 s; the eval set shows 0 false negatives on the crisis subset.
2. `crisis` shows the human-written crisis screen (doc 20 §7.9) with the user's country lines from doc 11 §5b, composes nothing, pauses upbeat Rustles for 24 h (extendable), replaces them with presence copy, and logs a minimal `safety_event`.
3. Crisis resources are one tap away on the welcome screen, in Help and on the warm-note web page; every number is verified at build and every six months (a dated checklist in the repo).
4. `minor_indicators` triggers a gentle age re-confirmation; a second signal limits the account and shows youth resources.
5. No paywall, backup prompt or permission prompt appears in a session that began from a `crisis` or `elevated` text.
6. "Report this note" flags the delivery or reply, triggers the automated first response (pause generation for safety reports, email the founder) and is reviewed within 2 working days.

## 10. Share cards (doc 05 §9, doc 20 §9.1)
1. 9:16 and 1:1 cards render on-device from the Rustle text and theme, with the watermark in `door_open` and `welcome_week`, optional in `premium`.
2. The sensitive-content guard warns when the text names a person, a health detail or a date, offers a one-tap "make it general" rewrite, and logs `sensitive_warning_shown`.
3. Cards never include mood values, memory items, dates or the user's name unless the user turns the name on.

## 11. Send a warm note (doc 05 §10, doc 07 §4.5, doc 08 §5.9)
1. Situation chips + optional line → three drafts in one call → edit → re-moderation of the edited text (a failed check does not publish) → card style → system share sheet with link and image.
2. `POST /warm-notes` requires App Attest / Play Integrity and is rate-limited; unlimited for every entitlement state within the abuse limits.
3. The web page renders server-side with an OG image, is `noindex`, unguessable, expires, can be revoked, shows a "Need support now?" link, has a report link, and carries only a page-view counter.
4. The recipient's one-tap ❤️ sets `thanked_at` once and sends the sender a single push; there is no text reply.
5. The install CTA deep-links with referral attribution and logs `warm_note_install`.

## 12. iOS widget and notification extension (doc 05 §8, doc 20 §8.2, doc 07 §6)
1. Small, medium and lock-screen widgets show the latest Rustle from App Group storage; privacy on shows the folded-note mark and "A note is waiting".
2. The widget refreshes within a minute of a new delivery (`reloadTimelines`); tapping opens Today.
3. The Notification Service Extension ships in the same build, via `expo-apple-targets`, and passes criterion 7.5.
4. Free widget style is Paper; other styles are `premium`.

## 13. Paywall, welcome week, door open, access codes (doc 09 §2–3, §9, doc 07 §9, doc 20 §7.8)
1. The first paywall appears after the first Rustle's reaction and the permission prompt, never in an `elevated`/`crisis` session, with annual preselected, both plans on the 7-day trial, the "either way you keep your notes" sentence, the hardship line, "redeem a code", legal links, restore purchases and a "Not now" button the same size as the primary.
2. "Not now" sets `welcome_week_ends_at = now + 7 days` once per account; the planner treats the user as `welcome_week`; no paywall is shown during the week.
3. On day 7 the "one week" Rustle arrives, then the day-7 paywall with its own headline; "Not now" moves the user to `door_open` with the one-sentence explanation.
4. Contextual paywalls in `door_open` fire at most once a week, never after a heavy note, only at the five moments listed in doc 09 §3.
5. RevenueCat webhook events update `subscriptions`; the planner reads only server-side state; the SDK state drives UI only; grace periods keep `premium`.
6. The hardship promotional offer applies 50% for three months to either plan and logs `offer = hardship`.
7. Redeeming a valid code in Settings calls the Edge Function, grants `premium` through RevenueCat, appends the user to `redeemed_by`, respects `max_redemptions` and `expires_at`, and logs `entitlement_granted.kind` only.
8. A day-5 trial reminder notification is sent; Settings has a subscription entry that deep-links to the store, labelled « Résilier mon abonnement » in French.

## 14. Themes and dark mode (doc 05 §12, doc 20 §3)
1. Dark mode follows the system by default; Paper, Dawn and Night are available to every state; Garden, Linen, Tide and seasonal are `premium`.
2. Every component reads colours from tokens; a lint rule fails on hex literals; a CI script fails any theme below AA for text.

## 15. Settings, export, delete (doc 05 §6, doc 07 §8, doc 11 §4.2)
1. Export produces a JSON file with notes, check-ins, memory items, Rustles, replies and recaps, decrypted, delivered in-app; PDF is V1.1.
2. Delete account removes every row for the user (cascade), revokes RevenueCat, purges backups within 30 days, and works without a linked identity.
3. Consents are listed with version and date and can be withdrawn where withdrawal is allowed (marketing use, quality review).
4. About shows "Made in Ontario, Canada · Your notes are stored in Canada", the AI disclosure, version and licences; Help shows the localised crisis lines and FAQ.

## 16. Analytics, crash reporting, cost logging (doc 12 §4, doc 07 §7, §10)
1. Every event in doc 12 §4 is implemented with exactly the listed properties and the glossary prefixes; a test asserts no property is a free-text field.
2. Every LLM call logs model, provider, prompt_version, input/output/cached tokens and cost; a dashboard shows spend per day, per step and per entitlement state; console spend limits are set per environment.
3. `cache_read_input_tokens` is non-zero on the daily composer in staging (the system prompt is cached).

## 17. Languages: English and French (doc 05 §3, doc 20 §10, doc 14 §6)
1. Every string lives in `en.json` / `fr.json`; a lint rule flags hard-coded text, "!" in UI strings and the word "affirmation".
2. French defaults to "tu", switchable to "vous" in onboarding for French users and in Settings; a "vous" user never sees "tu" anywhere, including errors and legal screens (a snapshot test over all strings).
3. Rustles, notes back, recaps and warm notes are written in the user's language, detected per note; fr-CA vocabulary is preferred when the user's own words show it; the golden set includes Quebec and France personas.
4. Layouts at French length and at the largest accessibility text size show no truncation in the eight key screens.

## 18. Landing page, privacy and terms (doc 07 §1, doc 11 §4.5, doc 10 §3.3b)
1. rustle.app serves the landing page, privacy policy, terms, subscription terms (including the welcome week, hardship offer and codes), the sub-processor list and the cookie notice, in EN and FR.
2. Warm-note pages and the five life-moment pages render under a second on a 3G profile with the OG image.
3. Universal Links / App Links open `rustle.app/n/{id}` in the app when installed and on the web otherwise.

## Cross-cutting: definition of done for any slice
- Typecheck, unit tests, RLS tests and (for prompt changes) `npm run eval` pass in CI.
- The slice runs on a real iPhone and, where relevant, a real Android phone, in EN and FR, at the default and one accessibility text size.
- No note content reaches analytics, logs, Sentry, email or push payloads (grep the diff for the event and log calls).
- Edge cases in doc 11 §2 for the feature are listed as handled, deferred (with a doc 13 entry) or not applicable.
- The docs and `CLAUDE.md` are updated in the same branch when behaviour differs from what they say.
