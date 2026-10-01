# 12 · Metrics & Analytics Plan

## 1. North-star metric

**Weekly Felt-Seen Users (WFSU):** unique users per week who do at least one of these: ❤️ a Rustle or a note back, or write a note or check-in **within 24 hours after** a Rustle arrived.

Why: it captures both halves of the relationship (Rustle gave something, and the user received it) better than DAU or time-in-app, which we deliberately don't optimise. **Notification opens are not in it:** an open is attention, not feeling seen, and counting it would let the metric flatter delivery volume. Opens are tracked as an engagement input.

## 2. Metric tree

```
Revenue (MRR)
├── Paying users = installs × trial start % × trial→paid % + door-open→paid conversions − churn
└── ARPPU (annual mix, regional pricing)

WFSU (north star)
├── Activation: onboarding complete %, first-note ❤️ %, notification opt-in %
├── Engagement: notes written/user/week, check-ins/week, notification open rate, widget installed %
├── Quality: ❤️ rate per note, "not quite" rate + reasons, reply ❤️ rate, repetition flags
└── Retention: D1, D7, D30, D90; W4 WFSU

Growth
├── Warm notes sent/MAU, warm-note page → install %
├── Share cards exported/MAU
└── K-factor = invites per user × invite conversion
```

## 3. Targets (first 6 months)

"Good" is the canonical target set in doc 06 §1 (D48); the other two columns sit around it.

| Metric | Launch target | Good | Great |
|---|---|---|---|
| Onboarding completion | 60% | 70% | 88% |
| First note ❤️ | 50% | 60% | 80% |
| Notification opt-in | 50% | 60% | 80% |
| Notification open rate | 10% | 18% | 25% |
| D1 / D7 / D30 retention | 40 / 25 / 12% | 50 / 30 / 15% | 60 / 40 / 25% |
| "Not quite" rate per Rustle | < 15% | < 10% | < 6% |
| Trial start at the first paywall (of installs) | 6% | 8% | 14% |
| Welcome week → trial or paid at day 7 | 8% | 10% | 18% |
| Trial → paid | 30% | 35% | 55% |
| Paying by day 14 (of installs) | 4% | 5% | 9% |
| Door-open → paid within 90 days | 1.5% | 2.5% | 4% |
| Monthly paid churn | 10% | 6% | 4% |
| MAU who send a warm note in their first month (doc 01 §7) | 8% | 15% | 25% |
| AI cost / paying user / month | < $1.5 | < $1.0 | < $0.6 |

Benchmarks from research: typical wellness apps D30 ≈ 3–7%, best health apps 15–25%; RevenueCat H&F median trial → paid ≈ 40%.

**Floor that triggers a rethink** (not only ceilings): D7 below 20% after two prompt iterations in beta → stop and revisit onboarding and the first week before adding anything.

**Leading indicator to watch:** `situation_resolved` events (from `memory_items.status`). They predict both the seasons feature and churn, and they're the honest measure of the product doing its job.

## 4. Event tracking plan (PostHog)

> **Never send note content, reply text or memory content to analytics, and never life areas, mood or check-in values, or anything about safety (D48).** Only bare events and the pre-approved metadata below.

| Event | Key properties |
|---|---|
| `app_opened` | source (push/widget/icon/deeplink) |
| `onboarding_step_viewed` / `_completed` | step, skipped (bool), chars_written (bucketed) |
| `onboarding_completed` | has_key_date, tone, duration_s, variant |
| `consent_granted` / `_withdrawn` | kind, version |
| `delivery_first_shown` | latency_ms, fallback_used |
| `delivery_reaction` | kind (a `DELIVERY_INTENTS` value, packages/shared), reaction (heart/not_quite), reason |
| `delivery_opened` | slot, intent, minutes_after_delivery, via (push/local/widget) |
| `notification_permission` | granted |
| `board_note_created` / `_edited` / `_deleted` | length_bucket, wants_reply, offline (bool) |
| `reply_viewed` | delay_min |
| `reply_reaction` | reaction, reason |
| `checkin_completed` | (none) |
| `memory_viewed` / `memory_item_deleted` / `memory_item_edited` / `memory_paused` | count |
| `situation_resolved` | (none) |
| `season_changed` | from, to (active/quiet), initiated_by (planner/user) |
| `share_card_exported` | destination, theme |
| `sensitive_warning_shown` | (none; it carries no content) |
| `warm_note_created` / `_sent` / `_opened` (web) / `_thanked` / `_install` | (none) |
| `paywall_viewed` | placement (first/day7/contextual_*), variant |
| `welcome_week_started` / `_ended` | ended_with (trial/paid/door_open) |
| `trial_started` / `subscription_started` / `_cancelled` | product, price, placement, offer (none/hardship/student) |
| `entitlement_granted` | kind (beta/creator/student/gift/partner/hardship/support) |
| `account_linked` | provider, notes_count_at_link |
| `note_reported` | kind (quality/other; safety reports are never sent, they are counted in Postgres) |
| `widget_added` | size |
| `recap_viewed` / `recap_shared` / `recap_helped` | cards_viewed · answer (a_lot/a_little/not_really) |

PostHog receives bare events only (D48): no note text, no life areas, no mood or check-in values, no warm-note situation, and nothing about safety (no safety level, no crisis-screen or resource events, no safety reports). This supersedes D46's "coarse life areas pending the lawyer". Segment analysis by life area or mood is done in Postgres, not PostHog. Names follow the glossary prefixes (doc 00): `delivery_*` for what Rustle sends, `board_note_*` for what the user writes, `reply_*` for notes back, `warm_note_*` for notes to friends.

## 5. Dashboards

1. **Activation funnel:** install → consent → onboarding steps → first note → ❤️ → notification permission → paywall → trial.
2. **Retention cohorts:** weekly, split by tone, notes/day, widget yes/no, wrote-a-note-in-week-1 yes/no in PostHog; splits by life area or mood are computed in Postgres (D48).
3. **Quality:** ❤️ rate by prompt version and model; "not quite" reasons; guardrail rewrite rate; fallback rate.
4. **Monetization:** RevenueCat charts plus paywall variant comparisons.
5. **Cost:** LLM spend per day, per step, per user; tokens per note; cache hit rate.
6. **Safety:** counts of elevated/crisis events read from `safety_events` in the database (nothing about safety is sent to PostHog, D48), weekly manual review of a sample, time to resolve reports.

## 6. Experiments backlog (first ones)

1. Paywall: welcome week as the default (current) vs card-first with a thin door-open mode (doc 09 §8); needs ~1,000 installs per arm.
2. Onboarding: five screens before the first note vs three screens → first note → "make it yours" (doc 05 §3).
3. Notification permission timing: after the first note vs after onboarding screen 5.
4. Door-open presence note: weekly vs twice a week.
5. Reply delay: 5 min vs 30 min vs "natural" (random 5–60).
6. Name in notification title vs no title.
7. First-note length: 1 sentence vs 2–3.
8. Haiku 4.5 vs Sonnet 5 vs Opus 5.5 daily notes (blind ❤️ rate; doc 08 §2).
9. Trial length 7 vs 14 days, and the 14-day product when a key date falls 8–14 days out (doc 09 §8).
