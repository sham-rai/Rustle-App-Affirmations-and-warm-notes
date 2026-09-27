# 18 · Why This Tech? (plain-language explanation)

> The full architecture is in [07-technical-architecture.md](07-technical-architecture.md); its §1 table is the source of truth for the stack. This page explains **why** each piece was chosen, what the alternatives were, and what we give up, in non-technical language.

## The four questions behind every choice

1. **Can one founder build it with Claude?** One language, popular tools, little infrastructure.
2. **Does it protect intimate data?** Security built in, EU hosting, fine-grained access rules.
3. **Is it cheap until it succeeds?** Free or low tiers at the start, costs that grow with users.
4. **Can we change our mind later?** Open standards, no lock-in where it matters.

---

## 1. The app: **React Native with Expo** (TypeScript)

**What it is:** a way to write **one app that runs on both iPhone and Android**, using TypeScript (a safer version of JavaScript). Expo is a toolkit on top that handles building, testing on your phone, and publishing.

**Why**
- **One codebase, two platforms.** Without it you'd build the app twice (Swift for iPhone, Kotlin for Android).
- **Claude is excellent at it.** React Native and TypeScript are among the most common languages and frameworks in the world, so Claude writes it fluently. TypeScript's strict types also catch many mistakes automatically.
- **Same language as the backend.** Everything is TypeScript (app, server functions, AI pipeline, website), so there's one language to learn and maintain.
- **Expo's cloud builds and updates:** build iOS apps in the cloud, test on your phone in minutes, and push small fixes without waiting for App Store review.
- **Mature ecosystem:** ready-made pieces for notifications, secure storage, purchases (RevenueCat) and analytics.

**Alternatives**
| Option | Why not (for us) |
|---|---|
| **Flutter** (Dart) | **Rejected.** Technically good, but it's a second language (Dart vs TypeScript everywhere) and has slightly less AI training data. |
| **Native Swift + Kotlin** | The best possible feel, but 2× the work and two languages. Too much for a solo founder. |
| **Web app / PWA** | Weak notifications and no real widgets on iPhone, and those are core to Rustle. |

**Trade-off:** widgets must still be written natively (small Swift and Kotlin pieces). Claude can write them; you'll just use Xcode to run them.

---

## 2. Backend & database: **Supabase** (Postgres)

**What it is:** a hosted backend that gives you a **database (Postgres)**, **user accounts**, **file storage**, **server functions** and **security rules** in one service. Think of it as "the back office of the app, rented, not built".

**Why**
- **Postgres is a proper relational database.** Rustle's heart is *memory*: people, dates, situations, notes and their links. That's structured, connected data, which relational databases handle best.
- **Anonymous accounts built in.** Our "no sign-up, but never lose your notes" design (doc 07 §5) needs anonymous sign-in that can later be linked to Apple/Google, and Supabase supports exactly that.
- **Row Level Security (RLS):** security rules *inside the database*, so user A can never read user B's notes, even if the app code has a bug. For intimate data, this is a huge safety net.
- **pgvector:** lets the database find *similar* memories (by meaning, not just keywords), which is useful for picking the right memories for each note, without adding another service.
- **EU hosting** (Frankfurt), which matters for GDPR and for French users' trust.
- **Open source:** if Supabase ever becomes a problem, it's standard Postgres and can be moved elsewhere.
- **Cheap start:** a free tier for development and ~$25/month in production at the start.
- **Schema as text files (SQL migrations),** so Claude can read, write and review database changes like code.

**Alternatives**
| Option | Why not (for us) |
|---|---|
| **Firebase** (Google) | **Rejected.** Great for simple apps and very popular, but its database (Firestore) is document-based, which makes connected memory data and "find similar memories" harder. Security rules are less powerful for this, and lock-in is stronger. |
| **Build your own server** (Node/Express + Postgres on AWS or a VPS) | **Rejected.** Total control, but you'd spend weeks on servers, backups, auth and security instead of the product. |

---

## 3. The AI "engine room": **Supabase Edge Functions** (no separate server)

**What it is:** small TypeScript programs that run inside Supabase, on demand. They do the AI jobs: safety checks, extracting memories, writing daily notes overnight, writing replies after a delay, and monthly recaps. A scheduler in the database (`pg_cron`) wakes them up every minute to pick up waiting jobs.

**Why here and not in the app**
- **Secrets stay secret.** The AI API key never goes inside the app, where it could be stolen.
- **Background jobs.** Daily notes are generated at night for each timezone, and replies are scheduled for later. That needs something that runs on its own, not only when the user opens the app.
- **Control.** One place to check safety, log costs, retry failures and switch AI models.

**Why no separate server:** one less thing to host, patch, pay for and monitor. The catch: each Edge Function run has a time limit, so big jobs (like the nightly batch) are cut into small steps that pick up where the last one stopped (doc 07 §2.1).

**When we'd change this:** if jobs keep hitting the time limit, we add one small worker just for the nightly batch. The prompts and database stay the same, so it's a move, not a rewrite.

---

## 4. The AI: **the Claude API**

**Why Claude**
- **Writing quality and warmth.** Rustle's notes must sound like a kind human, not a machine. This is the product, so we pick a model family known for nuanced, emotionally careful writing.
- **Safety behaviour.** Strong, built-in care around self-harm and vulnerable users, which is essential for this app (plus our own safety layer on top).
- **Structured outputs:** the AI can return exact JSON (e.g. the memory items), which makes the pipeline reliable.
- **Cost tools that fit our design perfectly:**
  - **Batch API (50% cheaper):** daily notes don't need an instant answer, so we generate them overnight in bulk at half price.
  - **Prompt caching:** the long "Rustle voice" instructions are the same for everyone, and cached reads cost a fraction of the normal price.
- **The right model for each job:** a small, fast, cheap model (Haiku) for background checks (safety, extraction). For what users read (notes, replies, warm notes) we **test Haiku, Sonnet and Opus blind** and pick the cheapest one people can't tell apart from the best.
- **A backup route:** if Anthropic's API is down, the same Claude model is called through Amazon or Google's cloud (EU region), so notes sound exactly the same. If that fails too, a hand-written template note goes out, never an empty notification.
- **Your notes aren't used to train models** under the API terms. We state this in our privacy policy.

**How we avoid lock-in:** all AI calls go through one small wrapper (`LLMClient`), so another provider could be added or tested later without rewriting the app. A different company's model is possible but off by default: it would need its own privacy agreement and its own quality tests, because it would sound different.

**Result:** about **$0.3–1 per paying user per month** in AI cost, depending on which model wins the test (doc 08 §9).

---

## 5. Payments: **RevenueCat**

**What it is:** a service that sits between the app and Apple/Google's payment systems.

**Why**
- Apple and Google subscriptions are **complex** (trials, renewals, refunds, grace periods, family sharing, receipts). RevenueCat handles all of it for both stores with one SDK.
- **Paywall experiments built in**, which is exactly what we need for the **hard vs soft paywall test**. You can change prices and paywall designs remotely without releasing a new app version.
- **Revenue dashboards** (trial conversion, churn, MRR) out of the box.
- **Free until $2.5k monthly revenue**, then about 1%.

**Alternatives:** Adapty and Superwall are similar and good. Building it yourself (direct StoreKit) is weeks of fragile work, so it's rejected.

**Later: buying on the web.** Apple and Google don't allow card payments (e.g. Stripe) *inside* the app for subscriptions, but in some countries apps may now link to a web checkout. RevenueCat can handle that too, so a web purchase and an App Store purchase unlock the same Premium. We'll check the rules per country when we build it.

---

## 6. Notifications: **Expo Notifications (push) + local notifications**

**Why both**
- **Push** (sent from our server through Apple/Google) delivers the note written overnight, even if the app hasn't been opened.
- **Local backup:** the app also keeps the next 1–2 days of notes on the phone and schedules them itself. This works **offline** and on Android phones that aggressively kill background apps. The notification is Rustle's heartbeat, so it gets two independent paths to arrive.

## 7. Widgets: **native (SwiftUI on iOS, Jetpack Glance on Android)**

Widgets can only be built with each platform's own tools, and React Native can't draw them. They're small, and the app simply shares "the latest note" with the widget through shared storage.

## 8. Analytics & errors: **PostHog** and **Sentry**

- **PostHog:** understand what users do (funnels, retention) plus **feature flags** (turn features on or off remotely) and **A/B tests**. There's an **EU cloud**, and it's privacy-friendly. **We never send note content, only events like "note created".**
- **No tracking across other apps.** Rustle never shows Apple's "Allow this app to track you?" prompt. Ad results are measured with Apple's and Google's privacy-friendly tools instead. The data is less detailed, and that's a deliberate trade for trust.
- **Sentry:** tells you when and where the app crashes, with the exact line of code, so Claude can fix it quickly.
- Both have generous free tiers.

## 9. Website & warm-note pages: **Next.js on Vercel**

The landing page, privacy pages and the **warm-note pages that friends open** (no app needed) must load fast and look beautiful in WhatsApp and iMessage previews. Next.js does this well, it's TypeScript again, and Vercel hosts it for free at the start.

## 10. Security choices (summary)

| Choice | Why |
|---|---|
| EU data region | GDPR, French and Quebec trust |
| RLS on every table | A bug in the app can't leak another user's notes |
| Extra encryption of note text | Protects notes even if a database backup leaked |
| AI keys only on the server | They can't be extracted from the app |
| Anonymous account + Keychain / Block Store | No sign-up friction, and notes survive a reinstall (on Android, Block Store is what survives; the phone's regular key store is wiped on uninstall) |
| No cross-app tracking | No "allow tracking" prompt; nothing to explain to worried users |
| No note content in analytics or logs | Staff and tools never see intimate text |

---

## 11. What it costs to run (early stage)

| Service | Cost at the start |
|---|---|
| Supabase | Free in dev · ~$25/month in production |
| Claude API | Pay per use: ~$0.05–0.25 per free user, ~$0.3–1 per paying user per month (depends on the model test) |
| RevenueCat | Free up to $2.5k monthly revenue |
| PostHog, Sentry, Vercel | Free tiers |
| Expo (EAS) | Free tier; ~$19–99/month for more builds |
| Apple / Google | $99/year · $25 once |
| **Total before real traction** | **≈ $100–300/month** plus your Claude subscription |

## 12. When we'd revisit these choices

- **Supabase hits limits** (rare below 1M users) → move Postgres to a dedicated host. The schema stays the same.
- **AI costs grow fast** → re-run the model test, shorten context, use the Batch API more.
- **Edge Function time limits get in the way** → add one small worker for the nightly batch (doc 07 §2.1).
- **Heavy native features** (e.g. advanced Live Activities) → more native modules, still inside the Expo app.
- **B2B deals with French health organisations** → consider HDS-certified hosting (doc 11).
