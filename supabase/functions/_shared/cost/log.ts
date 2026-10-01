// Per-call cost logging (docs/07 §7, §10). The LLMClient (a separate ticket) calls logLlmCall
// after every generation. Never pass note text, replies or memory content here: the record has no
// free-text field, by design. Deno-compatible: no Node built-ins.

export type LlmStep = 'safety' | 'extract' | 'daily' | 'reply' | 'recap' | 'warm_note' | 'guardrail' | 'first' | 'seed';
export type LlmTier = 'fast' | 'writer' | 'deep';
export type LlmStatus = 'ok' | 'error' | 'fallback';

export interface LlmUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

export interface LlmCallRecord extends LlmUsage {
  step: LlmStep;
  tier: LlmTier | null;
  model: string;
  prompt_version: string;
  cost_micros: number;
  latency_ms: number | null;
  batch_id: string | null;
  status: LlmStatus;
  user_id?: string | null;
}

/** USD per million tokens. */
export interface ModelPrice {
  input: number;
  output: number;
}

/**
 * docs/08 §1 (September 2026). Verify against the console at M1-06 (D46). Cache reads bill at
 * 10% of input and cache writes at 125% (5-minute cache); the Batch API halves everything.
 */
export const PRICE_PER_MTOK: Readonly<Record<string, ModelPrice>> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

export const CACHE_READ_MULTIPLIER = 0.1;
export const CACHE_WRITE_MULTIPLIER = 1.25;
export const BATCH_MULTIPLIER = 0.5;

/** Real ids are dated or suffixed (claude-haiku-4-5-20251001): the longest key the id starts with wins. */
export function priceFor(model: string): ModelPrice | undefined {
  let best: string | undefined;
  for (const key of Object.keys(PRICE_PER_MTOK)) {
    if (model.startsWith(key) && (best === undefined || key.length > best.length)) best = key;
  }
  return best === undefined ? undefined : PRICE_PER_MTOK[best];
}

/** Cost in millionths of a USD, rounded up to a whole micro. Unknown model: 0, and the caller should log it. */
export function costMicros(model: string, usage: LlmUsage, opts: { batch?: boolean } = {}): number {
  const price = priceFor(model);
  if (!price) return 0;
  // USD per Mtok equals micro-USD per token.
  const raw =
    usage.input_tokens * price.input +
    usage.output_tokens * price.output +
    usage.cache_read_input_tokens * price.input * CACHE_READ_MULTIPLIER +
    usage.cache_creation_input_tokens * price.input * CACHE_WRITE_MULTIPLIER;
  return Math.ceil(raw * (opts.batch ? BATCH_MULTIPLIER : 1));
}

/** The slice of the Supabase client this needs, so a test can pass a fake. */
export interface LlmCallsClient {
  from(table: 'llm_calls'): {
    insert(row: Record<string, unknown>): PromiseLike<{ error: { message: string } | null }>;
  };
}

/**
 * Inserts one `llm_calls` row. Logging never breaks a generation: a failed insert returns false
 * (the message goes to the function log, which carries no content).
 */
export async function logLlmCall(client: LlmCallsClient, record: LlmCallRecord): Promise<boolean> {
  const { error } = await client.from('llm_calls').insert({
    user_id: record.user_id ?? null,
    step: record.step,
    tier: record.tier,
    provider: 'anthropic',
    model: record.model,
    prompt_version: record.prompt_version,
    input_tokens: record.input_tokens,
    output_tokens: record.output_tokens,
    cache_read_input_tokens: record.cache_read_input_tokens,
    cache_creation_input_tokens: record.cache_creation_input_tokens,
    cost_micros: record.cost_micros,
    latency_ms: record.latency_ms,
    batch_id: record.batch_id,
    status: record.status,
  });
  if (error) {
    console.error(`llm_calls insert failed: ${error.message}`);
    return false;
  }
  return true;
}
