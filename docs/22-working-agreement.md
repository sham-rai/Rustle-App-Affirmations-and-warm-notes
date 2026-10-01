# 22 · Working Agreement: How We Build Rustle

> **Roles:** Daria is the **product manager and product owner**: she sets goals, decides priorities and trade-offs, accepts work, tests on devices and merges. Claude (Fable 5.1, in Claude Code) is the **team lead**: it plans, splits work into tickets, delegates tickets to subagents, reviews every line before it reaches a pull request, integrates, and keeps the docs true. Subagents are **engineers on one ticket each**. Paid humans (designer, security reviewer, clinical advisor, French reviewer, and a lawyer before public launch if budget allows) come in at the points doc 06 §3 names.
> **One rule above the others:** nothing reaches `main` that the PO hasn't accepted and the lead hasn't run. The one exception is a board-only commit to `backlog/BOARD.md` (§5, D48).

---

## 1. The unit of work: a ticket

A ticket is one markdown file in `backlog/<milestone>/<ID>-<slug>.md` (template in `backlog/README.md`). It is small enough for one subagent in one session (half a day of work at most) and points at the docs instead of restating them.

**Definition of ready** (the lead checks before delegating):
- Goal in one sentence, and the milestone it belongs to.
- Links to the exact doc sections and the doc 21 acceptance criteria it satisfies.
- File ownership: which folders or files this ticket may touch. Shared files (migrations, `en.json`/`fr.json`, tokens, `CLAUDE.md`) are owned by one ticket at a time.
- Model and executor named (§6).
- Known risks and what is explicitly out of scope.

**Definition of done** (doc 21, cross-cutting): typecheck, unit and RLS tests pass; `npm run eval` passes for prompt changes; runs on a real phone in EN and FR; no note content in analytics, logs or payloads; edge cases from doc 11 §2 listed as handled, deferred or n/a; docs and `CLAUDE.md` updated in the same branch.

**Ticket states:** `ready` → `in progress` → `in review (lead)` → `PR open (PO)` → `done` · plus `blocked` (with the question that blocks it). `backlog/BOARD.md` is the index; the lead keeps it current.

## 2. Cadence: a weekly rhythm around one milestone slice

| When | Who | What |
|---|---|---|
| **Monday, 30 min** | PO + lead | PO states the goal for the week (a slice of the current milestone, doc 06 §4). Lead proposes the tickets in **plan mode**; PO edits, reorders, approves. Nothing is built before approval. |
| **Tuesday–Thursday** | Lead + subagents | PO says which tickets to run ("run M1-03 and M1-04"). Lead delegates, reviews, integrates, opens one PR per ticket. PO reviews PRs, tests on the phone, merges or sends back. |
| **Friday, 1 h** | PO + lead | Prompt review (30 notes from the golden set), the weekly status note (§5), docs updated, next week's candidates listed. |

One milestone per Claude Code session start; a fresh session per week at least. The PO can run a ticket at any time by naming it; the cadence is a default, not a gate.

## 3. Delegation protocol (lead → subagent)

**What a subagent receives:** the ticket file, `CLAUDE.md`, the doc sections the ticket links, the acceptance criteria, and its own **git worktree** on a branch named `feat/<ID>-<slug>`. Nothing else: the subagent does not read the whole docs folder.

**What a subagent may not do:** change prompts, the safety gate, RLS policies, encryption, the paywall state machine or any schema outside its ticket; touch shared files it doesn't own; install a dependency not named in the ticket; mark itself done without running typecheck and tests.

**What a subagent returns:** a summary of the change, the list of files touched, the commands it ran and their results, the acceptance criteria it believes are met and the ones it couldn't verify, any deviation from the ticket with the reason, and open questions. This report is for the lead; the PO sees the PR.

**Parallelism:** at most **three** subagents at once, only on tickets with disjoint file ownership. The lead never runs the same search or build a subagent is already running.

**Multi-agent workflows:** for fan-out work (three independent screens, a review across several dimensions, a red-team over the golden set) the PO can opt in by saying **"use a workflow"**; the lead then orchestrates a workflow script instead of ad-hoc subagents. Without those words, the lead uses single subagents.

## 4. The review ladder

1. **Subagent self-check:** typecheck, tests, the ticket's criteria.
2. **Lead review** (always, on every ticket): reads the whole diff; runs typecheck, tests and RLS tests; runs `/code-review`; runs `/security-review` for anything touching auth, RLS, encryption, export, delete, payments or push; runs `npm run eval` for prompts; checks the diff for note content reaching analytics, logs or payloads; checks the docs were updated. Fails go back to the subagent once; a second failure and the lead takes the ticket over.
3. **PR to the PO:** the description lists the ticket, what to test on the phone (three to five steps), the criteria met, deviations, and anything the PO must decide. Screenshots or a screen recording when the change is visual.
4. **PO acceptance:** run it on the iPhone (and Android where the ticket says), walk the listed steps, spot-check the criteria, read the "decide" items. Merge, or send back with one comment per problem.
5. **`main` is always green.** Squash merge; the commit message carries the ticket ID.

**Human reviews on the calendar:** one-hour RLS and Edge Function auth check before the first real beta tester; full security review before beta and before launch; legal review before public launch if budget allows, with no legal review before then (the lead drafts the privacy policy, terms and consent copy from the real data flows, the founder reads and owns them as privacy officer, and the closed beta is invite-only, Canada only, under a short beta agreement, D48); clinical review of crisis copy before beta; French review weekly in beta (doc 06 §3, doc 17 §6.4).

## 5. How the PO monitors without reading code

- **`backlog/BOARD.md`:** every ticket, its state, owner, model and PR link. The lead updates it with every state change, committing board-only changes directly on `main` so the board never lags behind a branch; everything else still goes through a PR (D48).
- **Pull requests:** the review queue. Each PR is one ticket, testable in under fifteen minutes.
- **`docs/status/<week>.md`:** written by the lead every Friday: done, in progress, blocked, decisions needed, spend (LLM API and Claude usage), next week's candidates. Two hundred words, never more.
- **On demand:** "status" at any time makes the lead read the board and the git log and answer in five lines.
- **Decisions:** anything touching safety, privacy, money or scope is a PO decision, asked in the ticket's "questions" section and in the PR, never assumed. The lead continues on other work while waiting.
- **Escalation from the PO side:** if a PR has been sent back twice for the same reason, the ticket is re-planned on Monday rather than patched.

## 6. Model routing: who writes what

The honest picture: **Fable 5.1** is the strongest model available for reasoning across files, catching the mistakes that matter (a missing RLS policy, a race in the first-note state machine, a prompt that quietly starts giving advice), and reviewing. **Opus 5.5** is the best implementation model for well-specified work and is what Claude Code's fast mode uses. **Sonnet 5** is fast and reliable for mechanical work. Cost and speed favour the smaller models; correctness on the pieces that hold intimate data favours Fable. Route by risk, not by habit.

| Work | Executor | Model | Why |
|---|---|---|---|
| Planning, ticket splitting, integration, every review, the weekly status | Lead | **Fable 5.1** | Judgment across the whole codebase and the docs |
| Migration 1 (RLS, pgcrypto + Vault + views), `LLMClient`, the safety gate, the slot planner and entitlement states, the paywall and welcome-week state machine, the first-note streaming state machine, the Notification Service Extension, account linking and merge | Lead writes it directly | **Fable 5.1** | The pieces where a subtle mistake leaks data, charges someone wrongly or reaches a vulnerable user |
| Screens and components from the design tokens, navigation, i18n wiring, settings, export, share cards, warm-note flow and web page, the widget, the landing page, analytics events | Subagent | **Opus 5.5** | Well-specified from docs 05, 20 and 21; benefits from a strong model at lower cost than Fable |
| Tests written from acceptance criteria, `en.json`/`fr.json` from approved copy, refactors with no behaviour change, the eval harness plumbing, CI config | Subagent | **Sonnet 5** | Mechanical, verifiable, cheap |
| Anything touching notes, memory, safety or money, even a test fixture with realistic note text | never Haiku | — | Not for product code on this app |
| Prompts and prompt changes | Lead drafts; PO rates; eval decides | **Fable 5.1** for drafting, the blind test for the *production* model (doc 08 §2) | The writing model is chosen by data, not by the lead |

**Mechanics in Claude Code:** a *fork* subagent always runs on the lead's model (Fable) and inherits the whole conversation, so use it for a review pass or a second opinion, not for cheap implementation. A *general-purpose* subagent takes a model override (`opus`, `sonnet`), starts fresh, and gets exactly the ticket and the docs it needs. Fast mode switches the lead itself to Opus; use it for long mechanical sessions, never for review.

**Calibrate in M1:** run sessions 1–5 (doc 15 §4) with Opus subagents and count rework (tickets sent back by the lead or the PO). If rework on Opus tickets stays under one in five, keep the table. If not, move that ticket class up to Fable. Write the result in doc 13 §D.

## 7. Branching, commits, environments

- `main` protected; `feat/<ID>-<slug>` per ticket; `docs/<topic>` for doc-only changes; squash merge.
- Commit messages: imperative, one line, the ticket ID at the end (`Add anonymous sign-in with Keychain persistence (M1-03)`).
- Claude works against the `dev` Supabase project only; staging and prod are the PO's to promote to (doc 17 §7).
- Prompts are promoted from staging to prod by tag, never edited in place.
- Secrets never enter a ticket, a subagent prompt, a commit or a chat message.

## 8. Session hygiene

- Start a session by naming the milestone and, if there is one, the ticket: "M1, run M1-03". The lead reads `CLAUDE.md`, the board and the ticket, nothing more, before acting.
- Plan mode for any ticket over half a day and for anything that touches schema, prompts or money.
- When the docs and the code disagree, the lead stops and asks which is right, then fixes both in the same branch.
- The lead says when it is unsure. "I couldn't verify criterion 5 on a device" is a normal sentence in a PR.

## 9. The first milestone, as tickets

M1 Foundations (doc 06 §4, doc 17 §5, doc 15 §4 sessions 1–5) is already split in `backlog/M1/`. The PO approves the split on the first Monday; the lead then runs the tickets in the order of their dependencies, two or three at a time.

| ID | Ticket | Executor · model | Depends on |
|---|---|---|---|
| M1-01 | Monorepo skeleton, CI, `packages/shared` | Subagent · Opus | — |
| M1-02 | Migration 1: schema, RLS, pgcrypto + Vault + views, pgTAP | **Lead · Fable** | M1-01 |
| M1-03 | Anonymous sign-in, Keychain and Block Store persistence, backup status | **Lead · Fable** | M1-01 |
| M1-04 | i18n EN/FR, design tokens, ThemeProvider, tab skeleton | Subagent · Opus | M1-01 |
| M1-05 | Sentry, PostHog, first events, cost-logging table | Subagent · Sonnet | M1-01, M1-02 |
| M1-06 | `LLMClient`: Messages, Batches, caching, structured output, cost logging, failover hooks | **Lead · Fable** | M1-01 |
| M1-07 | Rustle voice prompt v1 + a test screen that shows a real note | Lead drafts · Subagent wires (Opus) | M1-06 |
| M1-08 | Offline outbox for notes and check-ins | Subagent · Opus | M1-03 |
| M1-09 | Consent screens, 18+ gate, `consents` rows | Subagent · Opus | M1-02, M1-04 |
| M1-10 | Device checklist v1 and the first status note | Lead | all |

What the PO does in M1 personally: the accounts and secrets (doc 15 §2), the first development build on her iPhone, the reinstall test on two Android phones, the day-3 "same account after reinstall" check, and the go/no-go on M1-02 before it merges.
