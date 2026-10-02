---
id: M1-06
title: LLMClient: Messages, Batches, prompt caching, structured output, cost logging, failover hooks
milestone: M1
state: PR open (PO)
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
- Failover before launch is templates only (D48): Bedrock/Vertex stays a provider hook in `LLMClient`, not built or tested until beta data shows outages are a problem

## Questions for the PO
- none yet

## Report (filled by the executor)
- Summary: `supabase/functions/_shared/llm/LLMClient.ts` is the one wrapper. `generate()` (Messages, waited for), `stream()` (text deltas for the first note, same result shape), `createBatch()` / `batch()` / `batchResults()` (Message Batches: submit, poll on later cron ticks, ingest in any order, matched by `customId`). The versioned prompt file is the cached system prefix with one `cache_control` breakpoint; the user turn is the caller's XML-delimited context pack and is never cached. Structured output goes through `output_config.format` with a JSON schema plus a validator the caller passes (`OutputSchema<T>`); the parsed JSON that fails validation is `invalid_output`. Every failure path returns `{ ok: false, reason, retryable }` so the caller shows its template, never an empty result: `refusal` (from `stop_reason`), `max_tokens`, `invalid_output`, `timeout`, `rate_limited`, `overloaded`, `server_error`, `bad_request`, `auth`, `network`, `unknown`. Retries for 429 and 5xx stay inside the SDK (`maxRetries`, default 2; real-time paths pass 0 or 1 with `REALTIME_TIMEOUT_MS`). One `llm_calls` row per call through M1-05's `logLlmCall` with model, provider, prompt_version, the four token counts including `cache_read_input_tokens`, cost (batch price for batch results), latency, batch id and status; a logging failure never touches the result. Providers are a slot: `anthropic` is built, `bedrock` and `vertex` throw "hook, not built (D48)". The tier-to-model map is `config.ts` (fast `claude-haiku-4-5`, writer `claude-sonnet-5`, deep `claude-opus-5-5`, ids verified 2026-10-01); it also carries each model's minimum cacheable prefix, and the client warns once per prompt and model when a prompt is under it (Haiku's is 4 096 tokens, so fast-tier prompts are expected not to cache). `prompts.ts` loads `_shared/prompts/<name>/v<n>.md` and produces `prompt_version` = `<name>@v<n>`; a missing or empty file throws. `packages/shared/llm-types/index.ts` holds the tiers, steps, providers, usage and result types with no zod, so the app can import them. `prompts/README.md` documents the layout, versioning, the cache minimums and the `static_files` entry a function needs.
- Files touched: `supabase/functions/_shared/llm/{LLMClient,config,prompts}.ts`, `supabase/functions/_shared/llm/LLMClient.test.ts`, `supabase/functions/_shared/prompts/README.md`, `supabase/functions/deno.json` (import map: the SDK at 0.131.0, zod and zod/v4 for the SDK's optional peer), `supabase/functions/deno.lock`, `packages/shared/llm-types/index.ts`, `packages/shared/index.ts`, `packages/shared/__tests__/llm-types.test.ts`, `.github/workflows/ci.yml` (Deno job checks and tests `_shared/llm` and `_shared/cost`), `docs/07` §7 (ids verified), `docs/08` §2 (cache minimums). `supabase/functions/_shared/cost/**` is copied unchanged from the M1-05 branch so this branch type-checks on its own; it merges cleanly once M1-05 is in.
- Commands run and results: `deno check` on every `_shared` module including the tests, 0 errors · `deno test _shared/llm/ _shared/cost/` 14 passed · `npm run lint` 0 · app and shared `tsc --noEmit` 0 · shared Jest `llm-types.test.ts` 3 passed.
- Criteria met / not verified: docs/21 §16.2 (model, provider, prompt_version, tokens, cost per call) met in code and tests; §16.3 (`cache_read_input_tokens` non-zero on the daily composer in staging) not verifiable without a key and a prompt above 1 024 tokens, which M1-07 brings. Not verified: a real call to the API (no `ANTHROPIC_API_KEY` in this environment), and the Supabase Edge runtime loading the SDK through the npm specifier (checked with Deno 2.9 locally; CI runs 2.1.4).
- Deviations and why: (1) Structured output takes a JSON schema plus a validator rather than the SDK's `zodOutputFormat`, so the schemas can be zod v4 or anything else and the wrapper has no zod dependency; the callers (M1-07, M2-03) build the JSON schema with `z.toJSONSchema`. (2) Tests use Deno's runner, not Vitest: no extra dependency, and the cost module already used it (decided and recorded here, as the ticket asked). (3) `metadata.user_id` is not sent to the API; the user id goes on the cost row only (docs/08 §8, no identifiers in prompts). (4) The thinking parameter is never sent: Sonnet 5 and Opus 5.5 run adaptive thinking by default and the client controls spend with `output_config.effort` (writer `low`, deep `high`); Haiku 4.5 rejects `effort`, so the fast tier sends neither.
- Open questions: none for the PO. For the lead at M1-07: keep the writer prompt above 1 024 tokens, and put Sonnet 5.5 in the blind test (same price as Sonnet 5, but it rejects `thinking: disabled`, which this client never sends).
