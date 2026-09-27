# 09 · Monetization, Paywall & Unit Economics

## 0. Definitions (plain language)

> **Hard paywall:** after onboarding, the app **can't be used without starting a subscription** (usually through a free trial). The user sees the paywall and has only two choices: *start the 7-day free trial* (payment details go to Apple/Google and are charged automatically on day 8 unless cancelled) or *leave*. There's no "continue for free" button. Example: many Health & Fitness apps (Calm-style onboarding → "Start your free trial").
>
> **Soft paywall:** the paywall appears at the same moment, but it has an **✕ / "Continue with free"** option. The user can keep a limited free version and upgrade later.
>
> **Freemium:** most of the app is free forever, and premium features are sold separately (e.g. Finch).
>
> **Trial:** a period (for us, 7 days) of full premium access before the first charge. The user can cancel in their App Store / Google Play settings at any time during the trial and pay nothing.

**Decision (updated):** we'll **run a hard-paywall vs soft-paywall A/B test at launch** (see §1b).

## 1. The decision: freemium vs "7-day trial then pay"

| | **Hard paywall + 7-day trial** | **Freemium (free tier forever + premium)** | **Hybrid: meaningful free tier + trial on annual** ✅ |
|---|---|---|---|
| Revenue per install (early) | Highest. RevenueCat data consistently shows hard-paywall apps earn more per install | Lower; most free users never pay | High (the trial is offered right after the "wow" moment) |
| Growth / virality | Weak: people who don't pay leave, so there are fewer senders of warm notes and recap shares | Strong | Strong |
| Fit with the product promise ("I'm here for you") | ❌ Cutting off someone mid-breakup because they didn't pay feels cruel, and it gets 1★ reviews | ✅ | ✅ |
| Memory moat | Weak: data doesn't build up for non-payers | ✅ Memory builds up and later becomes the reason to upgrade | ✅ |
| AI cost of free users | None | Must be capped | Capped (~$0.15–0.25 per free MAU per month) |

**Recommendation: the hybrid model.**
- After onboarding and the first note, show the paywall with a **7-day free trial on the annual plan** (the monthly plan without a trial). The paywall is **dismissable**.
- Users who dismiss it stay on a **real but limited free tier** (see §2). It's generous enough to keep them attached and build memory, but limited where it matters most.
- Show **contextual upsells** at moments when premium is obviously valuable (see §4).
- **Test it:** the hard vs soft paywall A/B test in §1b decides. *Let the data decide; don't argue about it.*

## 1b. The hard-paywall test: design ✅

**Setup:** new installs are split 50/50 by a PostHog feature flag (or RevenueCat Experiments).

| | **Variant A: Hard paywall** | **Variant B: Soft paywall (hybrid)** |
|---|---|---|
| When it appears | After onboarding **and after the first personal note is shown** (the user always sees the "wow" moment first) | Same moment |
| Options | Start 7-day free trial (annual $44.99 or monthly $7.99) · Restore purchases | Same + **"Continue with free"** (1 note/day, 3 replies/month, and so on) |
| If the user closes the app without subscribing | Next open shows the paywall again (their first note and onboarding data are kept) | Free tier |

**Rules that apply in both variants (non-negotiable)**
- **Safety is never behind a paywall.** Crisis resources, the Help screen and a crisis-level response are always available.
- **Never show the paywall right after a heavy or crisis note.** If onboarding text is `elevated` or `crisis`, the user gets the free experience for that session, with no paywall.
- **Data is never held hostage.** A user who doesn't subscribe can still export or delete their data.
- **Clear trial terms:** the price, the date of the first charge, "cancel anytime in Settings", and a reminder notification on day 5 of the trial.

**What we measure (after at least 2–4 weeks and ~1,000+ installs per variant)**
| Metric | Why |
|---|---|
| Install → trial start | A hard paywall usually gets more trials |
| Trial → paid | Does forcing people into a trial produce worse-quality trials? |
| **Revenue per install at D14 / D30 / D60** | **The main decision metric** |
| Refund rate + 1★ reviews mentioning "paywall"/"scam" | Brand damage |
| D30 retention of all installs | Soft keeps more users alive (more memory, more warm notes) |
| Warm notes sent + shares per install | Viral value the hard paywall may lose |

**Decision rule:** choose the variant with higher **revenue per install at D60 plus the estimated viral value** (≈ extra installs from warm notes and shares × revenue per install). If the hard paywall wins on revenue by < 20% but loses clearly on reviews or virality, choose soft.

**Note for this category:** RevenueCat data shows Health & Fitness apps convert trials well (median ~40% trial → paid), and hard paywalls often earn more per install. But Rustle's brand promise ("I'm here for you") and its warm-note loop depend on free users, so the test is essential. Don't decide on opinion.

## 2. Free vs Premium

| Feature | Free | Premium |
|---|---|---|
| Onboarding + personalised first note | ✅ | ✅ |
| Personalised daily notes | **1 per day** | **Up to 5 per day**, custom times |
| Notes board (write unlimited, all remembered) | ✅ | ✅ |
| **Rustle replies to your notes** | 3 per month ("taste") | ✅ unlimited (fair use) |
| Date-aware notes (exam day, anniversary) | ✅ (key dates are core to the magic) | ✅ |
| Check-ins | ✅ | ✅ |
| Widget | 1 basic style | All styles |
| Themes | 2 | All (10+) + seasonal |
| "Look how far you've come" monthly recap | Preview (first 2 cards) | Full recap + shareable |
| "What Rustle remembers" view/edit | ✅ (a trust feature, never paywalled) | ✅ |
| Send a warm note to a friend | 3 per month | Unlimited |
| Share cards | With watermark | Watermark optional |
| Export / delete data | ✅ (legal requirement, never paywalled) | ✅ |
| Voice in/out (V2) | — | ✅ |
| Crisis resources | ✅ always | ✅ always |

**Never paywall:** safety resources, data export/delete, memory visibility, or the ability to write notes.

## 3. Pricing

Benchmarks from the research: ThinkUp $7.99/mo · $39.99/yr; Finch Plus $9.99/mo · $69.99/yr; Rosebud ~$9.99–12.99/mo; Mindsera $14.99/mo; Daylio $4.99/mo · $35.99/yr; Calm $14.99/mo · $69.99/yr; Wysa ~$74.99/yr. RevenueCat: Health & Fitness skews to about 68% annual plans, and 5–9-day trials are the most common.

**Recommended launch prices (US; use App Store / Play regional price tiers elsewhere):**

| Plan | Price | Notes |
|---|---|---|
| Monthly | **$7.99** | No trial (to anchor the annual plan) |
| Annual | **$44.99** (~$3.75/mo, "save 53%") | **7-day free trial**. The default selection. |
| Lifetime (optional, later) | $99.99 | Good for older users who dislike subscriptions. Risk: AI costs keep running for life. Price it at ≥ 2.2× annual and cap it with fair use. |
| Student offer | 40% off annual | Pairs with the student-focused launch; verify via UNiDAYS / Student Beans later |
| Gift a year | $44.99 | "Give Rustle to someone going through something." A great fit for the brand. V1.x. |

**Euro & CAD pricing:** France/Belgium: **€7.99/mo, €44.99/yr** (prices include VAT in the EU, so net revenue is lower than in the US); Switzerland: CHF 7.99 / 44.99; Canada: CA$10.99 / CA$59.99. **Regional pricing:** in lower-income markets added later (LATAM, CEE, India), use the store's lower price tiers (for example the equivalent of $2.99/mo / $19.99/yr). The AI cost per user stays the same, so watch margins and consider Sonnet-tier models or fewer notes per day for low-price regions.

## 4. Paywall moments (contextual upsells)

1. **After the first note** (main paywall): headline *"Let me be there more often."* Benefits: more notes a day, replies to your notes, your monthly story. Social proof (after launch). Trial timeline graphic: "Today: full access · Day 5: reminder · Day 7: trial ends". Trial reminders reduce refund anger and are good practice.
2. **When a free user writes a heavy note and has used their 3 replies:** *"I read what you wrote. Want me to reply to every note?"* Handle this carefully: **never paywall a reply to an elevated or crisis note.** Those always get the safety response for free.
3. **Day-30 recap preview:** they see 2 cards, then "See your whole month."
4. **Changing the notes-per-day stepper above 1.**
5. **Theme and widget gallery.**
6. **Win-back:** a lapsed subscriber gets an offer code 30 days after churn.

**Rules:** no dark patterns, clear pricing, easy cancellation guidance, and no guilt copy ("Don't abandon your healing" ❌).

## 5. Unit economics (per paying user per month, base case)

| Line | Monthly plan | Annual plan (per month) |
|---|---|---|
| Gross price | $7.99 | $3.75 |
| Store fee (15% via Small Business Program / 2nd-year subscriptions; 30% otherwise) | −$1.20 | −$0.56 |
| Net revenue | $6.79 | $3.19 |
| AI cost (~3 notes/day; worst case Opus 5, ≈ $0.3–0.5 on Haiku/Sonnet, doc 08 §9) | −$1.00 | −$1.00 |
| Infra (Supabase, push, analytics, per user) | −$0.10 | −$0.10 |
| **Contribution margin** | **$5.69 (84%)** | **$2.09 (65%)** |

Plus free-user subsidy: ~$0.20 per free MAU. With a 5:1 free-to-paid MAU ratio, that's about −$1.00 per payer per month.

⚠️ **Annual plans with heavy users on Opus are the thinnest margin.** Levers: note cap (5/day), the model blind test (doc 08 §2) picking a cheaper tier if quality holds, prompt caching, the Batch API, and summarised rather than raw context.

## 6. Revenue model scenarios (month 12 after launch)

Assumptions: install → trial start 12–18%, trial → paid 35–45% (the RevenueCat H&F median is ~40%), plus 2–3% of free users converting later; blended ARPPU ~$4.20/month (70% annual mix); monthly churn of paid users ~6%.

| Scenario | Cumulative installs (12 mo) | Paying subs at M12 | MRR at M12 | ARR run-rate |
|---|---|---|---|---|
| Conservative (organic only, slow) | 40k | ~1,500 | ~$6k | ~$75k |
| Base (1–2 TikTok hits + steady content + small paid user acquisition) | 200k | ~7,000 | ~$30k | ~$360k |
| Upside (viral warm-note loop + press + App Store feature) | 800k | ~25,000 | ~$105k | ~$1.3M |

Context: RevenueCat 2026 says only about **4.6% of new subscription apps reach $10k MRR within 2 years**. The base case is ambitious and depends on excellent execution in distribution.

## 7. Future revenue streams

- **Gifting** (gift subscriptions, "send a year of Rustle"). Very on-brand.
- **B2B2C:** universities (exam season), outplacement firms (layoffs), employers, divorce lawyers/mediators and patient-support organisations offering Rustle as a benefit. Priced at about $2–4 per seat per month.
- **Printed "Year with Rustle" book** from recaps and your own notes (like Day One's printed journals).
- ❌ **No ads, and never sell data.** It would destroy trust in an emotionally sensitive product.

## 8. Metrics to watch (monetization)

Paywall view → trial start %, trial → paid %, refund rate, ARPU per install at D7/D30/D60, churn by plan, free → paid conversion over 90 days, AI cost per MAU (free and paid), and gross margin per cohort.
