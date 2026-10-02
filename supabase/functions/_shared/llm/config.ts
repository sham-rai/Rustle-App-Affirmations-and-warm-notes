// The tier-to-model map (docs/07 §7, D46): the one place a model id lives. Verified against the
// current model list on 2026-10-01 (M1-06). The writer model is provisional until the blind test
// (docs/08 §2); the ids here are bare, never date-suffixed.

import type { LlmEffort, LlmTier } from '@rustle/shared/llm-types/index.ts';

export interface ModelConfig {
  readonly id: string;
  /**
   * Below this many tokens of static prefix the API silently creates no cache entry. Haiku 4.5 needs
   * 4 096; the newest models 512. LLMClient warns once per prompt that falls under it.
   */
  readonly minCacheableTokens: number;
  /** `output_config.effort` is accepted; Haiku 4.5 rejects it. */
  readonly supportsEffort: boolean;
  /** The effort LLMClient sends when the caller gives none. */
  readonly defaultEffort: LlmEffort | null;
  /**
   * Default `max_tokens` for this tier. Sonnet 5 and Opus 5.5 think adaptively whenever `thinking`
   * is omitted (which LLMClient never sends), and thinking tokens count against `max_tokens`, so
   * the writer and deep tiers get far more room than a note or a recap needs; a cut answer is a
   * `max_tokens` fallback, never a retry.
   */
  readonly defaultMaxTokens: number;
}

export const MODELS: Readonly<Record<LlmTier, ModelConfig>> = {
  // Safety classifier, extraction, the output guardrail: fast and cheap, structured output.
  fast: { id: 'claude-haiku-4-5', minCacheableTokens: 4096, supportsEffort: false, defaultEffort: null, defaultMaxTokens: 1024 },
  // Anything the user reads. Sonnet 5 until the blind test picks (docs/08 §2); Sonnet 5.5 is the
  // same price and belongs in that test.
  writer: { id: 'claude-sonnet-5', minCacheableTokens: 1024, supportsEffort: true, defaultEffort: 'low', defaultMaxTokens: 4096 },
  // The monthly recap: once a month, must be excellent.
  deep: { id: 'claude-opus-5-5', minCacheableTokens: 512, supportsEffort: true, defaultEffort: 'high', defaultMaxTokens: 16000 },
};

/** The API retries 429 and 5xx this many times by default; real-time paths pass fewer. */
export const DEFAULT_MAX_RETRIES = 2;

/** The real-time budget before the template fallback (docs/07 §4.1). */
export const REALTIME_TIMEOUT_MS = 8_000;

/** Background steps may wait longer; the SDK default is ten minutes, far past an Edge Function. */
export const BACKGROUND_TIMEOUT_MS = 60_000;

/** Rough tokens per character for the cache-minimum warning only; never used for billing. */
export const CHARS_PER_TOKEN_ESTIMATE = 4;
