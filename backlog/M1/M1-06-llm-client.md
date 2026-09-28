---
id: M1-06
title: LLMClient: Messages, Batches, prompt caching, structured output, cost logging, failover hooks
milestone: M1
state: ready
executor: lead
model: fable
owner_files: [supabase/functions/_shared/llm/**, supabase/functions/_shared/prompts/README.md, packages/shared/llm-types/**]
depends_on: [M1-01]
pr:
---

## Goal
One wrapper that every AI call goes through: Messages and Batches, cached system prompt, structured JSON output, retries, refusal handling, cost logging per call, and a failover hook (retry → template in the MVP; Bedrock/Vertex as a later provider).

## Spec
- docs/07 §7 (AI service design, failover), §2.1 (short, idempotent jobs)
- docs/08 §2 (implementation notes), §4 (prompt versioning)
- docs/21 §16 criteria 2–3
- CLAUDE.md rules on LLMClient and logging

## Out of scope
- Any composer or prompt content (M1-07 and M2); Bedrock/Vertex accounts

## Risks and notes
- Log cache_read_input_tokens from day one; zero on the daily composer means the prefix is being invalidated
- Handle stop_reason == 'refusal' → template, never an empty result
- Deno runtime: no Node built-ins; test with Deno's runner or Vitest via npm specifiers, decide and record

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary:
- Files touched:
- Commands run and results:
- Criteria met / not verified:
- Deviations and why:
