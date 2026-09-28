# 09 · Monetization: Trial-First, the Welcome Week and the Door Open

> **Decision (2026-09-28, D9, extended by D28):** Rustle is **trial-first with everything included**. After the first note, the paywall offers a **7-day free trial**, then a monthly or annual subscription with *all* of Rustle. Anyone who taps **"Not now"** gets a **welcome week**: seven days of the full experience with no card. On day 7 the paywall returns. Anyone who still doesn't subscribe, or whose trial or subscription lapses, falls into **"door open" mode**: their board, memory, safety resources, data rights and warm notes stay, Rustle sends one presence note a week and one note back a week, and the door never closes. No feature matrix to enforce: one entitlement, three states in the planner. The hard-vs-soft A/B test from the earlier plan is dropped; the experiments worth running once there's volume are in §8.

## 0. Definitions

- **Trial:** 7 days of full access through the store's introductory offer (payment method on file, charged automatically on day 8 unless cancelled). The user can cancel in App Store / Google Play settings at any time.
- **Premium** (the only paid state): everything Rustle does, at one price, monthly or annual. Also granted by access codes (§9).
- **Welcome week:** the 7 days after "Not now" at the first paywall. Full experience, no card, once per account (`users.welcome_week_ends_at`). It exists because Rustle's value is proven over days, and the first note is only a demo.
- **Door open:** the state of a user with no active trial, welcome week or subscription. Not a "free tier" with a feature list: it's the *relationship kept alive at almost no cost*, so the memory keeps building, the warm-note loop keeps working, and nobody is ever cut off mid-crisis.

## 1. Why this model

| | Pure hard paywall | Full freemium | **Trial-first + welcome week + door open** ✅ |
|---|---|---|---|
| Revenue per install | Highest in category data | Lowest | High: the trial is offered right after the "wow" for those ready, and again on day 7 to people who have *felt* the product |
| Build and run complexity | Lowest | Highest (a feature matrix to enforce everywhere) | Low (one entitlement; three planner states) |
| Fit with "I'm here for you" | ❌ Cut off on day 8 mid-breakup | ✅ | ✅ Nobody loses their notes or the door |
| Warm-note growth loop | ❌ Only payers can send | ✅ | ✅ Unlimited for everyone |
| Memory moat for non-payers | ❌ Never forms | ✅ | ✅ Keeps building; they come back at the next hard moment |
| AI cost of non-payers | none | must be capped | ≈ $0.03–0.10 once for the welcome week, then ≈ $0.05–0.12 per door-open MAU per month |
| Regulatory optics (FTC 6(b), monetising distress) | Worst | Best | Good: safety and the door never depend on paying; no card asked of someone who isn't ready |

**Honest caveat:** RevenueCat's category data usually shows card-required trials winning on revenue per install. The welcome week is a bet that a relationship sells better on day 7 than a promise sells at minute 3, and that fewer "charged $60 after I forgot" reviews are worth it. Experiment 1 in §8 settles it with data, not opinion.

## 2. What each state gets

| | **Door open** | **Welcome week** | **Trial / Premium** |
|---|---|---|---|
| Onboarding, first note, seed notes for the first 48 h | ✅ (everyone sees the wow before any paywall) | ✅ | ✅ |
| **Daily Rustles** | ❌ (one **presence note a week**, at their favourite slot) | ✅ 1–5 a day, custom times | ✅ 1–5 a day, custom times, quiet hours, seasons |
| **Key-date notes** (the exam day, the appointment) | ✅ the day itself, one note | ✅ eve + day + follow-up | ✅ eve + day + follow-up |
| Board: write unlimited, everything remembered | ✅ | ✅ | ✅ |
| **Note back** (replies) | **One a week**, on the first note written (safety responses to elevated/crisis text always, for everyone) | ✅ every note | ✅ every note (fair use), faster |
| Check-ins | ✅ | ✅ | ✅ |
| "What Rustle remembers" (view, edit, delete, pause) | ✅ never paywalled | ✅ | ✅ |
| Widget | Paper style, shows the latest note | Paper style | All styles |
| Themes | Paper, Dawn, Night (dark mode follows the system for everyone) | Same | All + seasonal |
| Monthly recap | Preview (2 cards) + the shareable line | n/a (week one) | Full story |
| Send a warm note | ✅ unlimited (abuse rate limits only) | ✅ | ✅ + card styles, no watermark |
| Share cards | With watermark | With watermark | Watermark optional |
| Lock-screen privacy, app lock, export, delete, crisis resources | ✅ always | ✅ | ✅ |
| Voice in/out (V2) | — | — | ✅ |

**Never paywalled, ever:** crisis and safety responses, the ability to write, memory visibility and control, export and delete, warm notes, key-date notes on the day, lock-screen privacy and the app lock.

**Why one note back a week in door open:** doc 01 says a board without replies is a void. One reply a week keeps the board alive and the memory growing for a cent a month, and it turns the contextual paywall (§3) from an absence ("nothing came") into a comparison ("want this on everything you write?").

## 3. The paywall

**When, first time:** after onboarding, after the first note has been shown and reacted to, and after the notification permission prompt. Never before the wow. Never in a session where onboarding text was `elevated` or `crisis` (the user gets the welcome week that session and the paywall appears on a later, calmer open).

**What it says:** headline *"Let me be there every day."* Three benefits: notes every day, timed to your life · a note back on everything you write · your month, told back to you. Plan selector: **annual preselected** (CA$59.99, "≈ CA$5 a month") and monthly (CA$10.99), both with the **7-day free trial**. A trial timeline: today full access · day 5 reminder · day 7 trial ends. One plain sentence under the buttons: *"Either way, you keep your notes and this week's Rustles."* A quiet secondary line: *"Things are tight right now?"* → the hardship offer (§4). Links to terms and privacy, restore purchases, redeem a code, and a **"Not now"** button in the secondary style (same size as the primary; doc 20 §7.8). Below the fold, the one-line AI reminder (doc 11 §3).

**"Not now"** → the **welcome week**, immediately and without guilt copy. `users.welcome_week_ends_at = now + 7 days`. No paywall is shown again during the week except the day-5 mention inside a Rustle (doc 05 §13).

**Day-7 paywall:** the "one week" Rustle arrives, then the same paywall with a different headline: *"This week I was there every day. Want me to stay?"* and one line of what it saw, without numbers that shame: *"You wrote about the interview, and you went anyway."* Same plans, same trial. "Not now" → door open, stated in one calm sentence: *"I'll keep your notes and check in once a week. The door's open whenever you want more."*

**Contextual moments** where the paywall is shown again in door open (each at most once per week, never after a heavy note):
1. A door-open user writes a **second** note in a week and, after the normal delay, gets a card instead of a note back: *"I read this. Want a note back on everything you write? Start your 7 days."* Not shown when the note is `elevated` or `crisis` (those get the safety response).
2. The eve of a key date: *"Tomorrow's the interview. Want me with you every day this week?"*
3. The day-30 recap preview → *"See your whole month."*
4. The themes and widget gallery.
5. The notes-per-day control, shown disabled with a one-line explanation.

**Rules:** no dark patterns, prices and the first-charge date always visible, "cancel anytime in Settings" explained in the user's language, a day-5 trial reminder notification, a clear « Résilier mon abonnement » entry in Settings for France (doc 11 §4.4b), no guilt copy, no countdown timers, no "most people choose", no crossed-out fake prices.

## 4. Pricing and offers

Benchmarks: ThinkUp $7.99/mo · $39.99/yr; Finch Plus $9.99/mo · $69.99/yr; Rosebud ~$9.99–12.99/mo; Mindsera $14.99/mo; Daylio $4.99/mo · $35.99/yr; Calm $14.99/mo · $69.99/yr; Petit BamBou €6.99/mo; MindDay €13.99/mo · €79.99/yr. Health & Fitness skews to ~68% annual plans; 5–9-day trials are the most common.

| Plan or offer | Canada (home market) | US | EU | When | Notes |
|---|---|---|---|---|---|
| Monthly | **CA$10.99** | $7.99 | €7.99 | MVP | 7-day trial |
| Annual | **CA$59.99** (≈ CA$5 a month) | $44.99 | €44.99 | MVP | 7-day trial, **default selection**. Test upward to CA$69.99 as well as down (§8) |
| Switzerland | — | — | CHF 7.99 / 44.99 | MVP | |
| **Hardship offer** | 50% off for 3 months, on either plan | same | same | MVP | A promotional offer behind *"Things are tight right now?"* on the paywall. Self-declared, no proof, one tap. The app serves people who just lost a job; this is brand-defining and the floor price still covers AI cost. Some will use it dishonestly; that's fine. |
| **Access codes** | premium for N days | | | MVP | Beta testers, seeded creators, students, support gestures, later partners and gifts (§9) |
| **Chapter pass** | **CA$19.99** for 6 weeks, non-renewing | $14.99 | €14.99 | V1.1, with the first exam-season campaign | For people who won't subscribe (students, many 45+). Follows the product's own logic that hard periods end, and the seasons model. Both stores support non-renewing purchases. Ends in door open, never auto-renews. |
| Student | 40% off annual | | | V1.x | Via a school-email magic link that issues a code, rather than a third-party verifier |
| Gift a year | Same as annual | | | V1.x | Needs web checkout (doc 07 §9); delivered as a code |
| Quiet-season downgrade | ~CA$2.99/mo | | | V1.x | Offered once, on the way to cancel (§7) |
| Lifetime | Not at launch | | | Revisit after 6 months of usage data | AI cost runs for life |

Prices include VAT in the EU, so net revenue is lower there. In lower-income markets added later, use the stores' lower tiers and consider fewer notes per day for those regions.

## 5. Unit economics (per paying user per month)

| Line | Monthly | Annual (per month) |
|---|---|---|
| Gross price (US) | $7.99 | $3.75 |
| Store fee (15% via the Small Business Program, which you must enrol in; 30% otherwise) | −$1.20 | −$0.56 |
| Net revenue | $6.79 | $3.19 |
| AI cost (3 notes/day, replies; ceiling on Opus 5 pricing, ≈ $0.8 on Opus 5.5, $0.3–0.5 on Haiku/Sonnet; doc 08 §9) | −$1.00 | −$1.00 |
| Infra per user | −$0.10 | −$0.10 |
| **Contribution margin** | **$5.69 (84%)** | **$2.09 (65%)** |

**Welcome-week cost:** ≈ $0.03–0.10 per install, once (seven days of notes and replies; Haiku at the low end, Opus at the high end). At the base case's 200k installs that's under $20k over the year, or about $1.50 per paying user acquired. It's the cheapest acquisition spend in the plan.

**Door-open subsidy:** one weekly presence note + key-date notes + one note back a week + memory extraction on Haiku ≈ **$0.05–0.12 per door-open MAU per month**. At a 5:1 door-open-to-paid ratio that's about −$0.25–0.60 per payer per month. **The ratio, not the model, is the number to watch.**

**Hardship offer:** at half price, net revenue per month is still ~$3.40 (monthly) against ~$1.00 AI cost. Watch its share of new subscriptions; above 25% something else is wrong with the price.

**Annual plans with heavy users on Opus are the thin margin.** Levers: the note cap (5/day), the model blind test (doc 08 §2, including Opus 5.5), prompt caching, the Batch API, and the **seasons model** (doc 01 §5.6), which naturally lowers volume for users whose situation has resolved.

## 6. Revenue scenarios (month 12 after launch)

Assumptions: paying by day 14 across all paths 4–7% of installs (minute-3 trial start 6–12% × trial → paid 35–45%, plus welcome week → paid 8–15%), door-open → paid 1.5–3% over 90 days, blended ARPPU ~$4.20/month (70% annual mix), paid churn ~6%/month (lower for annual). These give the same ranges as before; the paths differ, the totals don't.

| Scenario | Cumulative installs (12 mo) | Paying subs at M12 | MRR at M12 | ARR run-rate |
|---|---|---|---|---|
| Conservative (organic only) | 40k | ~1,500 | ~$6k | ~$75k |
| Base (1–2 TikTok hits, steady content, small paid UA) | 200k | ~7,000 | ~$30k | ~$360k |
| Upside (viral warm-note loop, press, a store feature) | 800k | ~25,000 | ~$105k | ~$1.3M |

Context: only about 4.6% of new subscription apps reach $10k MRR within 2 years (RevenueCat 2026). The base case depends on distribution.

**Decision metric for fundraising (D38):** CAC payback in months at the base case, read at month 6. Under 6 → keep bootstrapping; over 12 → raise or cut paid acquisition.

## 7. Future revenue streams and the B2B2C channel

- **Chapter pass** (V1.1) and **gifting** (V1.x): above.
- **Quiet-season downgrade at cancellation** (V1.x): when a subscriber opens the cancel entry in Settings, one calm screen offers *"Want me to write less often instead?"* at ~CA$2.99/mo: a few notes a week and note backs, memory intact. Never a guilt screen. A user who downgrades comes back at the next hard moment; a user who churns starts over with a competitor. Build it once cancellation reasons are known.
- **B2B2C** (V3 delivery, month-3 conversations): universities (exam season, wellbeing offices), outplacement firms, employers and EAP platforms, family mediators, patient-support organisations.
  - **Pricing:** employers and outplacement about **$2–4 per seat per month** on annual contracts; universities a **flat per-campus fee** (typically per 1,000 students) with a **free pilot semester** in exchange for a case study; NGOs subsidised or free.
  - **Mechanism:** access codes (§9) in bulk, `partner_id` on each grant, a redemption page. No SSO, no rosters, no employee emails: the partner hands out codes, the user stays anonymous to the partner.
  - **What the partner sees:** aggregated, anonymous usage above a **minimum cohort of 20** (activations, weekly active, the recap "did it help" answers). Never individuals, never content, never safety events per person. This is written into every contract and into the DPIA.
  - **Timing:** procurement takes 6–12 months, so conversations start at month 3 after launch with beta testimonials; a full sales brief is written then (D40).
  - **France:** B2B deals with health or insurance partners may pull Rustle into HDS hosting scope (doc 11 §4.2); check before signing.
- **Printed "Year with Rustle" book** from recaps and the user's own notes.
- ❌ **No ads, and never sell data.** ❌ No weekly SKU (the category's highest-revenue trick and its worst reviews). ❌ No Family Sharing on the subscription at launch: intimate notes and shared entitlements don't mix.

## 8. What to measure and test

**Measure:** paywall view → trial start % at the first and the day-7 paywall, welcome week → paid, trial → paid, refund rate, revenue per install at D14/D30/D60, churn by plan, door-open → paid over 90 days, hardship-offer share, warm notes sent per door-open MAU, AI cost per state, and one-star reviews mentioning price or "paywall".

**Experiments, once there's volume** (each needs roughly 1,000+ installs per arm):
1. **Welcome week (default) vs card-first** with a thin door-open mode. Decision metric: revenue per install at D60 plus estimated viral value, weighed against refund rate and one-star reviews.
2. **Trial length 7 vs 14 days**, and the 14-day product (`rustle_premium_annual_14d`) offered when a key date falls 8–14 days out so the trial covers the exam.
3. Contextual moment 1 on the second door-open note (current) vs the third.
4. Paywall headline and benefit order; the day-7 headline with vs without the "what it saw" line.
5. Annual price CA$59.99 vs CA$49.99 **and** vs CA$69.99.
6. Door-open note back: one a week (current) vs one a fortnight.

Everything above is switchable with RevenueCat Offerings and remote paywall config plus a PostHog flag; no app release needed.

## 9. Access codes: one mechanism, many doors

An `entitlement_grants` row (doc 07 §3) holds a code, a kind, a duration and a redemption limit. Redeeming it in Settings calls an Edge Function that grants the `premium` entitlement through RevenueCat's granted-entitlements API, so the app, the webhook and the planner see one truth.

| Kind | Who | Duration | When |
|---|---|---|---|
| `beta` | closed-beta testers | through launch + 3 months | MVP |
| `creator` | the 200 seeded creators | lifetime, revocable | MVP |
| `support` | a user who had a bad experience | 1–3 months | MVP |
| `hardship` | if the store promotional offer isn't available in a region | 3 months at half price is not expressible as a grant, so this is a fallback: 1 free month | MVP |
| `student` | school-email magic link | 1 year at 40% off (the code unlocks the discounted offering) | V1.x |
| `gift` | web checkout buyer → recipient | 1 year | V1.x |
| `partner` | B2B2C seats, `partner_id` set | contract length | V3 |

Cheap in migration 1, painful to bolt on later. Never printed in analytics; the `entitlement_granted` event carries only the kind.
