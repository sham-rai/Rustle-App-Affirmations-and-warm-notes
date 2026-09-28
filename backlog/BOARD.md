# Board

Updated by the lead on every state change. Weekly notes in `docs/status/`.

## M1 · Foundations

| ID | Ticket | State | Executor · model | Depends on | PR |
|---|---|---|---|---|---|
| M1-01 | Monorepo skeleton, CI, `packages/shared` | ready | subagent · opus | — | |
| M1-02 | Migration 1: schema, RLS, pgcrypto + Vault + views, pgTAP | ready | lead · fable | M1-01 | |
| M1-03 | Anonymous sign-in, Keychain / Block Store persistence, backup status | ready | lead · fable | M1-01 | |
| M1-04 | i18n EN/FR, design tokens, ThemeProvider, tab skeleton | ready | subagent · opus | M1-01 | |
| M1-05 | Sentry, PostHog, first events, cost-logging table | ready | subagent · sonnet | M1-01, M1-02 | |
| M1-06 | LLMClient: Messages, Batches, caching, structured output, cost logging, failover hooks | ready | lead · fable | M1-01 | |
| M1-07 | Rustle voice prompt v1 + test screen showing a real note | ready | lead drafts · subagent wires (opus) | M1-06 | |
| M1-08 | Offline outbox for notes and check-ins | ready | subagent · opus | M1-03 | |
| M1-09 | Consent screens, 18+ gate, `consents` rows | ready | subagent · opus | M1-02, M1-04 | |
| M1-10 | Device checklist v1 and the first status note | ready | lead · fable | all | |

## Blocked
none

## PO decisions pending
none
