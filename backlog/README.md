# Backlog

Tickets live here as markdown, one file per ticket, under the milestone folder. `BOARD.md` is the index. The working agreement is `docs/22-working-agreement.md`; acceptance criteria come from `docs/21-requirements.md`.

## Ticket template

```markdown
---
id: M1-03
title: Anonymous sign-in with reinstall-proof persistence
milestone: M1
state: ready            # ready | in progress | in review (lead) | PR open (PO) | done | blocked
executor: lead          # lead | subagent
model: fable            # fable | opus | sonnet
owner_files: [app/lib/supabase.ts, app/lib/secure-storage.ts, app/features/settings/backup-status.tsx]
depends_on: [M1-01]
pr: 
---

## Goal
One sentence.

## Spec
- docs/07 §5 (accounts), docs/21 §3 criteria 1–4

## Out of scope
- Account linking UI (M2)

## Risks
- iOS Keychain persistence is observed behaviour; test on the current iOS major.

## Questions for the PO
- none

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
```

## Conventions
- IDs: `<milestone>-<two digits>`; the branch is `feat/<id>-<slug>`.
- A ticket touches only its `owner_files`; shared files (migrations, `en.json`/`fr.json`, tokens, `CLAUDE.md`) are owned by one ticket at a time.
- The lead moves states and keeps `BOARD.md` current; the PO marks `done` by merging the PR.
