# Board

Updated by the lead on every state change. Weekly notes in `docs/status/`.

## M1 · Foundations

| ID | Ticket | State | Executor · model | Depends on | PR |
|---|---|---|---|---|---|
| M1-01 | Monorepo skeleton, CI, `packages/shared` | done | subagent · opus | — | merged 2026-09-30 |
| M1-02 | Migration 1: schema, RLS, pgcrypto + Vault + views, pgTAP | PR open (PO) | lead · fable | M1-01 | #2 `feat/M1-02-migration-1` (144 pgTAP in CI; D48 fixes pushed 2026-09-30, CI must be green; PO go/no-go) |
| M1-03 | Anonymous sign-in, Keychain / Block Store persistence, backup status | done | lead · fable | M1-01 | merged 2026-09-30 |
| M1-04 | i18n EN/FR, design tokens, ThemeProvider, tab skeleton | done | subagent · opus | M1-01 | merged 2026-09-30 |
| M1-05 | Sentry, PostHog, first events, cost-logging table | ready | subagent · sonnet | M1-01, M1-02 | |
| M1-06 | LLMClient: Messages, Batches, caching, structured output, cost logging, failover hooks | ready | lead · fable | M1-01 | |
| M1-07 | Rustle voice prompt v1 + test screen showing a real note | ready | lead drafts · subagent wires (opus) | M1-06 | |
| M1-08 | Offline outbox for notes and check-ins | ready | subagent · opus | M1-03 | |
| M1-09 | Consent screens, 18+ gate, `consents` rows | ready | subagent · opus | M1-02, M1-04 | |
| M1-10 | Device checklist v1 and the first status note | ready | lead · fable | all | |
| M1-11 | Migration 1 follow-ups from the D48 review (warm_notes.body encrypted, read/opened RPC split, catalog tests) | ready | lead · fable | M1-02 | |

## M2 · Splash, Rustle screen, onboarding, first note, Today

| ID | Ticket | State | Executor · model | Depends on | PR |
|---|---|---|---|---|---|
| M2-01 | Company splash and the Rustle screen with the Skia tree | PR open (PO) | subagent · opus | M1-01, M1-04 | #1 `feat/M2-01-splash-and-rustle-screen` (review fixes pushed 2026-09-30; rebase onto main after #2 merges) |
| M2-02 | Onboarding: five screens, answers held locally | ready | subagent · opus | M1-04, M1-09 | |
| M2-03 | Onboarding complete, first note screen, seed notes, permission | ready | lead · fable | M1-02, M1-06, M1-07, M2-02 | |
| M2-04 | Today with the first Rustle as hero, Notes board skeleton | ready | subagent · opus | M1-04, M1-08, M2-03 | |
| M2-05 | First paywall, welcome week, door-open state, code redemption | ready | lead · fable | M1-02, M2-03 | |
| M2-06 | The intro tree on a device: allocations, reduce-motion start, the seen flag before Begin | ready | subagent · opus | M2-01 | |

## Suggested order (docs/22 §9, revised 2026-09-29)

| Week | Run together |
|---|---|
| 1 | M1-01 → M1-04 + M1-03 |
| 2 | M2-01 + M1-09 + M1-02 → M2-02 |
| 3 | M1-06 + M1-07 (lead) · M1-08 + M1-05 (subagents) |
| 4 | M2-03 (lead) → M2-04 + M2-05 · M1-10 closes M1 |

## Docs

| Branch | What | State |
|---|---|---|
| `docs/d48-decisions` | The PO decisions of 2026-09-30 (D48) applied to docs 01, 05, 06, 07, 08, 11, 12, 13, 15, 17, 21, 22, CLAUDE.md and four tickets | PR to open (PO), merge after #2 and #1 |

## Blocked
none

## PO decisions pending
none (D48 closed the ten questions of 2026-09-30)

## Board rule (D48)
State changes are committed here directly on `main`; the branches no longer carry a copy of this file.
