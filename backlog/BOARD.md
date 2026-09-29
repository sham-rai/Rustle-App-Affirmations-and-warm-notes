# Board

Updated by the lead on every state change. Weekly notes in `docs/status/`.

## M1 · Foundations

| ID | Ticket | State | Executor · model | Depends on | PR |
|---|---|---|---|---|---|
| M1-01 | Monorepo skeleton, CI, `packages/shared` | PR open (PO) | subagent · opus | — | feat/M1-01-monorepo-skeleton |
| M1-02 | Migration 1: schema, RLS, pgcrypto + Vault + views, pgTAP | ready | lead · fable | M1-01 | |
| M1-03 | Anonymous sign-in, Keychain / Block Store persistence, backup status | ready | lead · fable | M1-01 | |
| M1-04 | i18n EN/FR, design tokens, ThemeProvider, tab skeleton | PR open (PO) | subagent · opus | M1-01 | feat/M1-04-i18n-tokens-navigation |
| M1-05 | Sentry, PostHog, first events, cost-logging table | ready | subagent · sonnet | M1-01, M1-02 | |
| M1-06 | LLMClient: Messages, Batches, caching, structured output, cost logging, failover hooks | ready | lead · fable | M1-01 | |
| M1-07 | Rustle voice prompt v1 + test screen showing a real note | ready | lead drafts · subagent wires (opus) | M1-06 | |
| M1-08 | Offline outbox for notes and check-ins | ready | subagent · opus | M1-03 | |
| M1-09 | Consent screens, 18+ gate, `consents` rows | ready | subagent · opus | M1-02, M1-04 | |
| M1-10 | Device checklist v1 and the first status note | ready | lead · fable | all | |

## M2 · Splash, Rustle screen, onboarding, first note, Today

| ID | Ticket | State | Executor · model | Depends on | PR |
|---|---|---|---|---|---|
| M2-01 | Company splash and the Rustle screen with the Skia tree | ready | subagent · opus | M1-01, M1-04 | |
| M2-02 | Onboarding: five screens, answers held locally | ready | subagent · opus | M1-04, M1-09 | |
| M2-03 | Onboarding complete, first note screen, seed notes, permission | ready | lead · fable | M1-02, M1-06, M1-07, M2-02 | |
| M2-04 | Today with the first Rustle as hero, Notes board skeleton | ready | subagent · opus | M1-04, M1-08, M2-03 | |
| M2-05 | First paywall, welcome week, door-open state, code redemption | ready | lead · fable | M1-02, M2-03 | |

## Suggested order (docs/22 §9, revised 2026-09-29)

| Week | Run together |
|---|---|
| 1 | M1-01 → M1-04 + M1-03 |
| 2 | M2-01 + M1-09 + M1-02 → M2-02 |
| 3 | M1-06 + M1-07 (lead) · M1-08 + M1-05 (subagents) |
| 4 | M2-03 (lead) → M2-04 + M2-05 · M1-10 closes M1 |

## Blocked
none

## PO decisions pending
none
