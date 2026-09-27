# 12 · Metrics & Analytics Plan

## 1. North-star metric

**Weekly Felt-Seen Users (WFSU):** unique users per week who do at least one of these: ❤️ a note or reply, open a notification, or write a note/check-in *in response to* a note.

Why: it captures both halves of the relationship (Rustle gave something, and the user received it) better than DAU or time-in-app, which we deliberately don't optimise.

## 2. Metric tree

```
Revenue (MRR)
├── Paying users = installs × trial start % × trial→paid % + free→paid conversions − churn
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

| Metric | Launch target | Good | Great |
|---|---|---|---|
| Onboarding completion | 70% | 80% | 88% |
| First note ❤️ | 60% | 70% | 80% |
| Notification opt-in | 60% | 70% | 80% |
| Notification open rate | 10% | 18% | 25% |
| D1 / D7 / D30 retention | 40 / 25 / 12% | 50 / 32 / 18% | 60 / 40 / 25% |
| Trial start (of installs) | 10% | 15% | 20% |
| Trial → paid | 30% | 40% | 55% |
| Monthly paid churn | 10% | 7% | 5% |
| Warm notes sent / MAU / month | 0.1 | 0.3 | 0.6 |
| AI cost / paying user / month | < $1.5 | < $1.0 | < $0.6 |

Benchmarks from research: typical wellness apps D30 ≈ 3–7%, best health apps 15–25%; RevenueCat H&F median trial → paid ≈ 40%.

## 4. Event tracking plan (PostHog)

> **Never send note content, reply text or memory content to analytics.** Only metadata.

| Event | Key properties |
|---|---|
| `app_opened` | source (push/widget/icon/deeplink) |
| `onboarding_step_viewed` / `_completed` | step, skipped (bool), chars_written (bucketed) |
| `onboarding_completed` | life_areas, has_key_date, tone, duration_s |
| `first_note_shown` | latency_ms, fallback_used |
| `note_reaction` | kind (daily/first/reply), reaction (heart/not_quite), reason |
| `notification_permission` | granted |
| `notification_opened` | slot, intent, minutes_after_delivery |
| `board_note_created` | length_bucket, wants_reply, mood |
| `reply_viewed` | delay_min |
| `checkin_completed` | mood |
| `memory_viewed` / `memory_item_deleted` / `memory_paused` | count |
| `share_card_exported` | destination, theme, sensitive_warning_shown |
| `warm_note_created` / `_sent` / `_opened` (web) / `_install` | situation |
| `paywall_viewed` | placement, variant |
| `trial_started` / `subscription_started` / `_cancelled` | product, price, placement |
| `account_linked` | provider, notes_count_at_link |
| `safety_level_detected` | level (no content) |
| `crisis_screen_shown` / `resource_tapped` | country |
| `widget_added` | size |
| `recap_viewed` / `recap_shared` | cards_viewed |

## 5. Dashboards

1. **Activation funnel:** install → consent → onboarding steps → first note → ❤️ → notification permission → paywall → trial.
2. **Retention cohorts:** weekly, split by life area, tone, notes/day, widget yes/no, wrote-a-note-in-week-1 yes/no.
3. **Quality:** ❤️ rate by prompt version and model; "not quite" reasons; guardrail rewrite rate; fallback rate.
4. **Monetization:** RevenueCat charts plus paywall variant comparisons.
5. **Cost:** LLM spend per day, per step, per user; tokens per note; cache hit rate.
6. **Safety:** counts of elevated/crisis events, weekly manual review of a sample, time to resolve reports.

## 6. Experiments backlog (first ones)

1. Paywall: soft (dismissable) vs hard trial gate.
2. Notification permission timing: after the first note vs after onboarding step 9.
3. Default notes/day for free users: 1 vs 2.
4. Reply delay: 5 min vs 30 min vs "natural" (random 5–60).
5. Name in notification title vs no title.
6. First-note length: 1 sentence vs 2–3.
7. Haiku 4.5 vs Sonnet 5 vs Opus 5 daily notes (blind ❤️ rate; doc 08 §2).
