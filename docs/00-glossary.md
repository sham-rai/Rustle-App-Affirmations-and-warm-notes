# 00 · Glossary

> One name per thing, used identically in the UI, the schema, analytics events and these docs. Accepted 2026-09-28 (decision D24). When a term here changes, change it here first.

## The four kinds of "note"

| Thing | UI (EN) | UI (FR) | Schema / code | Analytics prefix |
|---|---|---|---|---|
| What the user writes on the board | **note** ("your notes", "leave a note") | note | `notes` | `board_note_*` |
| What Rustle sends (daily, date-aware, first, re-engage) | **a Rustle** / "a note from Rustle" | un mot de Rustle | `deliveries` (renamed from `affirmations`) | `delivery_*` |
| Rustle's reply attached to a user's note | **note back** | un mot en retour | `replies` | `reply_*` |
| A note the user sends to a friend | **warm note** | un mot doux | `warm_notes` | `warm_note_*` |

The word **"affirmation" never appears in the product.** It lives only in App Store keywords and paid-search terms, where it's the category people type.

## Other terms

| Term | Meaning | Schema / code |
|---|---|---|
| **Board** | The user's private space of notes (the "Notes" tab). There is no separate journal. | `(tabs)/notes` |
| **Today** | The home tab: the latest Rustle, earlier ones, the check-in card. | `(tabs)/today` |
| **Check-in** | A 10-second mood entry (five marks, optional line). | `checkins` |
| **Key date** | A date the user said matters (exam, appointment, anniversary). Drives timed Rustles. Grief and medical dates are opt-in for reminders. | `key_dates` (`remind` bool) |
| **Memory item** | One durable fact Rustle keeps: person, situation, date, win, struggle, what helps, what to avoid. Visible and editable in "What Rustle remembers". | `memory_items` |
| **Now summary** | The rolling ~250-word private briefing about the person that every generation reads. | `memory_summary` |
| **Avoid list** | Hard constraints the user set ("no advice", "don't mention my ex"). Violations must be zero. | `profiles.avoid`, memory kind `avoid` |
| **Just listen** | Per-note toggle: "no note back on this one". Rustle still remembers it. | `notes.wants_reply = false` |
| **Life area** | One of eleven values, defined once as `LIFE_AREAS` in `packages/shared/enums.ts` (D46): `exams`, `breakup`, `divorce`, `health`, `caregiving`, `work`, `grief`, `change`, `loneliness`, `hard_time`, `other`. Onboarding chips map one to one; the extractor uses the same list. | `notes.life_areas`, `profiles.focus_weights` |
| **Focus areas** | The user's life areas with user-adjustable weights. Replaces "categories". | `profiles.focus_weights`, `notes.life_areas` |
| **Slot** | A delivery time the user chose (morning, midday, evening, before sleep). | `delivery_prefs.slots` |
| **Intent** | Why a given Rustle exists: `daily`, `date_eve`, `date_day`, `follow_up`, `quiet_presence`, `win_celebration`, `first`, `seed`, `reengage`. Defined once as `DELIVERY_INTENTS` in `packages/shared/enums.ts` (D46). The door-open weekly note is a `quiet_presence` on a weekly cadence, not a separate intent. | `deliveries.kind`, planner |
| **Season** | The rhythm Rustle is in for this person: **active** (the hard period; 1–5 Rustles a day) or **quiet** (the situation resolved; a few a week, mostly presence and anchors). See doc 01 §5.6. | `delivery_prefs.rhythm` |
| **Chapter** | A resolved situation (the breakup, the exam term). Closed chapters stop driving daily Rustles but stay in recaps as "how far you've come". | `memory_items.status = resolved` |
| **Recap** | The monthly "Look how far you've come" story (6–8 cards). | `recaps` |
| **Share card** | A 9:16 or 1:1 image of a Rustle for Stories or posts, with the sensitive-content guard. | share feature |
| **Warm-note page** | The web page a friend opens (no install), `rustle.app/n/{id}`. | `/web` |
| **Safety level** | The classifier's result for any user text: `none`, `low`, `elevated`, `crisis`. | `notes.safety_level`, `safety_events` |
| **Crisis flow** | Human-written, localised resources shown for `crisis`; no AI generation. | crisis screen |
| **Rustle screen** | The screen after the company splash: tree, wordmark, then headline and Begin. Not called "welcome" or "intro" in code: `(onboarding)/rustle`. | `(onboarding)/rustle` |
| **Company splash** | ~2 s of the company name on paper on a cold start. DreamTeam Co. is a placeholder until registration. | `(onboarding)/splash` |
| **Seed notes** | The first 48 h of Rustles generated at onboarding so the user isn't empty until the nightly batch (`deliveries.kind = 'seed'`). | onboarding-complete |
| **Delivery** | One Rustle scheduled for one slot, sent by an opaque push (an ID, never text; the text is fetched on-device) with a local-notification backup and an idempotency key. | `deliveries` |
| **Welcome week** | The 7 days of full experience, with no card, after "Not now" at the first paywall. Once per account. | `users.welcome_week_ends_at` |
| **Door open** | The state of a user with no trial, welcome week or subscription: board, memory, warm notes, safety, one presence Rustle a week, one note back a week. Never called a "free tier" in the product. | planner state `door_open` |
| **Entitlement state** | What the planner reads for each user: `premium` (trial, paid or granted), `welcome_week`, `door_open`. | `subscriptions`, `entitlement_grants`, `users.welcome_week_ends_at` |
| **Access code** | A code that grants premium for a period: beta, creator, student, gift, partner, hardship fallback, support. | `entitlement_grants` |
| **Hardship offer** | Half price for three months, self-declared from the paywall ("Things are tight right now?"). | RevenueCat promotional offer |
| **Chapter pass** | A non-renewing six-week purchase (V1.1) for a time-bound hard period. Ends in door open. | non-renewing product |
| **Forget this** | Per-note or per-memory action: memory items derived from it are deleted and the note never enters context again. The note stays on the board. | `notes.exclude_from_ai`, `memory_items.status = user_deleted` |
| **Consent** | One recorded agreement, with kind, version and locale: terms, AI processing, special-category data, quality review, marketing use. | `consents` |

## Naming rules
- Sentence case everywhere, in both languages. No all-caps.
- French: "tu" by default, "vous" if chosen; Canadian French (fr-CA) is the primary variant.
- Analytics events use the prefixes above and never carry note text.
