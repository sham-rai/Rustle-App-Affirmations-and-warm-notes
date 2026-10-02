// The contract between everything that asks for text and the one wrapper that talks to Claude
// (`supabase/functions/_shared/llm/LLMClient.ts`, docs/07 §7, docs/08 §2). Pure types and
// constants: no zod here, so the Expo app and the Edge Functions can both import it without a
// build step. Output schemas live next to their prompts, not here.

/** Model tiers (docs/07 §7). The tier-to-model map is `_shared/llm/config.ts`, read by LLMClient. */
export const LLM_TIERS = ['fast', 'writer', 'deep'] as const satisfies readonly string[];
export type LlmTier = (typeof LLM_TIERS)[number];

/** Pipeline steps, the `llm_calls.step` values (migration 1). */
export const LLM_STEPS = [
  'safety',
  'extract',
  'daily',
  'reply',
  'recap',
  'warm_note',
  'guardrail',
  'first',
  'seed',
] as const satisfies readonly string[];
export type LlmStep = (typeof LLM_STEPS)[number];

/** Providers. Only `anthropic` is built; the other two are the failover hook (D48). */
export const LLM_PROVIDERS = ['anthropic', 'bedrock', 'vertex'] as const satisfies readonly string[];
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

/** Token counts for one call, nulls from the API normalised to 0. */
export interface LlmUsage {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly cache_read_input_tokens: number;
  readonly cache_creation_input_tokens: number;
}

/**
 * Why a generation did not produce usable output. The caller shows a template instead (docs/08 §2:
 * "never an empty push"). `retryable` says whether a later attempt may succeed on its own.
 */
export type LlmFallbackReason =
  | 'refusal'
  | 'max_tokens'
  | 'invalid_output'
  | 'timeout'
  | 'rate_limited'
  | 'overloaded'
  | 'server_error'
  | 'bad_request'
  | 'auth'
  | 'network'
  | 'unknown';

export interface LlmCallInfo {
  readonly provider: LlmProvider;
  readonly model: string;
  /** `<prompt name>@v<n>`, stored with every generation (docs/08 §4). */
  readonly promptVersion: string;
  /** Null for a batch result: the batch ran hours earlier and its duration is not a call latency. */
  readonly latencyMs: number | null;
  readonly usage: LlmUsage | null;
}

export type LlmResult<T> =
  | ({ readonly ok: true; readonly output: T; readonly text: string; readonly usage: LlmUsage } & LlmCallInfo)
  | ({ readonly ok: false; readonly reason: LlmFallbackReason; readonly retryable: boolean } & LlmCallInfo);

/** `output_config.effort` on the models that take it (docs/08 §2: the recap runs at `high`). */
export type LlmEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export const BATCH_STATUSES = ['in_progress', 'canceling', 'ended'] as const satisfies readonly string[];
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export interface BatchCounts {
  readonly processing: number;
  readonly succeeded: number;
  readonly errored: number;
  readonly canceled: number;
  readonly expired: number;
}
