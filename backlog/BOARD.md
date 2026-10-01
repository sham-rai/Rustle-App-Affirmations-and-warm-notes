# Board

Updated by the lead on every state change. Weekly notes in `docs/status/`.

## M1 · Foundations

| ID | Ticket | State | Executor · model | Depends on | PR |
|---|---|---|---|---|---|
| M1-01 | Monorepo skeleton, CI, `packages/shared` | done | subagent · opus | — | merged 2026-09-30 |
| M1-02 | Migration 1: schema, RLS, pgcrypto + Vault + views, pgTAP | done | lead · fable | M1-01 | #2, merged 2026-09-30 (144 pgTAP green in CI) |
| M1-03 | Anonymous sign-in, Keychain / Block Store persistence, backup status | done | lead · fable | M1-01 | merged 2026-09-30 |
| M1-04 | i18n EN/FR, design tokens, ThemeProvider, tab skeleton | done | subagent · opus | M1-01 | merged 2026-09-30 |
| M1-05 | Sentry, PostHog, first events, cost-logging table | in progress | subagent · sonnet | M1-01, M1-02 | |
| M1-06 | LLMClient: Messages, Batches, caching, structured output, cost logging, failover hooks | ready | lead · fable | M1-01 | |
| M1-07 | Rustle voice prompt v1 + test screen showing a real note | ready | lead drafts · subagent wires (opus) | M1-06 | |
| M1-08 | Offline outbox for notes and check-ins | in progress | subagent · opus | M1-03 | |
| M1-09 | Consent screens, 18+ gate, `consents` rows | in progress | subagent · opus | M1-02, M1-04 | |
| M1-10 | Device checklist v1 and the first status note | ready | lead · fable | all | |
| M1-11 | Migration 1 follow-ups from the D48 review (warm_notes.body encrypted, read/opened RPC split, catalog tests) | PR open (PO) | lead · fable | M1-02 | `feat/M1-11-migration-1-follow-ups` pushed 2026-10-01; PO opens the PR, CI `db` job runs the 7 pgTAP files |

## M2 · Splash, Rustle screen, onboarding, first note, Today

| ID | Ticket | State | Executor · model | Depends on | PR |
|---|---|---|---|---|---|
| M2-01 | Company splash and the Rustle screen with the Skia tree | done | subagent · opus | M1-01, M1-04 | #1, merged 2026-09-30 (not yet seen on a device: M2-06) |
| M2-02 | Onboarding: five screens, answers held locally | ready | subagent · opus | M1-04, M1-09 | |
| M2-03 | Onboarding complete, first note screen, seed notes, permission | ready | lead · fable | M1-02, M1-06, M1-07, M2-02 | |
| M2-04 | Today with the first Rustle as hero, Notes board skeleton | ready | subagent · opus | M1-04, M1-08, M2-03 | |
| M2-05 | First paywall, welcome week, door-open state, code redemption | ready | lead · fable | M1-02, M2-03 | |
| M2-06 | The intro tree on a device: allocations, reduce-motion start, the seen flag before Begin | ready | subagent · opus | M2-01 | |

## Suggested order (docs/22 §9, revised 2026-09-29)

| Week | Run together |
|---|---|
| 1 | M1-01 → M1-04 + M1-03 |
| 2 | M2-01 + M1-02 (done) · wave A, started 2026-10-01: M1-09 + M1-05 + M1-08 (subagents) · M1-11 then M1-06 (lead) |
| 3 | Wave B: M2-02 (after M1-09) · M1-07 (after M1-06) · M2-06 (after the first device build) |
| 4 | Wave C: M2-03 (lead) → M2-04 + M2-05 · M1-10 closes M1 |

## Docs

| Branch | What | State |
|---|---|---|
| `docs/d48-decisions` | The PO decisions of 2026-09-30 (D48) applied to docs 01, 05, 06, 07, 08, 11, 12, 13, 15, 17, 21, 22, CLAUDE.md and four tickets | merged, PR #3, 2026-09-30 |

## Blocked
none

## PO decisions pending
none (D48 closed the ten questions of 2026-09-30)

## Board rule (D48)
State changes are committed here directly on `main`; the branches no longer carry a copy of this file.
