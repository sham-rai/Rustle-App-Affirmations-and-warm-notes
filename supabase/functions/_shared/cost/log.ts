// Per-call cost logging (docs/07 §7, §10). The LLMClient (a separate ticket) calls logLlmCall
// after every generation. Never pass note text, replies or memory content here: the record has no
// free-text field, by design. Deno-compatible: no Node built-ins.

export type LlmStep = 'safety' | 'extract' | 'daily' | 'reply' | 'recap' | 'warm_note' | 'guardrail' | 'first' | 'seed';
export type LlmTier = 'fast' | 'writer' | 'deep';
export type LlmProvider = 'anthropic' | 'bedrock' | 'vertex';
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
  /** Null when the model has no price; the row then logs 0 and an error line names the model. */
  cost_micros: number | null;
  provider?: LlmProvider;
  latency_ms: number | null;
  batch_id: string | null;
  status: LlmStatus;
  user_id?: string | null;
}

/** USD per million tokens. Cache prices are per model, not a multiple of input. */
export interface ModelPrice {
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
}

/**
 * docs/08 §1 and the current price list (September 2026). Verify against the console at M1-06
 * (D46). The Batch API halves everything.
 */
export const PRICE_PER_MTOK: Readonly<Record<string, ModelPrice>> = {
  'claude-opus-5-5': { input: 4, output: 20, cache_read: 0.2, cache_write: 5 },
  'claude-opus-5': { input: 5, output: 25, cache_read: 0.5, cache_write: 6.25 },
  'claude-sonnet-5-5': { input: 2, output: 10, cache_read: 0.2, cache_write: 2.5 },
  'claude-sonnet-5': { input: 2, output: 10, cache_read: 0.2, cache_write: 2.5 },
  'claude-haiku-4-5': { input: 1, output: 5, cache_read: 0.1, cache_write: 1.25 },
};

export const BATCH_MULTIPLIER = 0.5;

/** The bare model id: a Bedrock `anthropic.` prefix and a Vertex or Bedrock `@version` or `:0` suffix removed. */
export function bareModelId(model: string): string {
  return model.replace(/^anthropic\./, '').replace(/@.*$/, '').replace(/-v\d+:\d+$/, '');
}

/** Real ids are dated or suffixed (claude-haiku-4-5-20251001): the longest key the id starts with wins. */
export function priceFor(model: string): ModelPrice | undefined {
  const id = bareModelId(model);
  let best: string | undefined;
  for (const key of Object.keys(PRICE_PER_MTOK)) {
    if (id.startsWith(key) && (best === undefined || key.length > best.length)) best = key;
  }
  return best === undefined ? undefined : PRICE_PER_MTOK[best];
}

/** Cost in millionths of a USD, rounded up to a whole micro. Null for an unknown model: never a silent zero. */
export function costMicros(model: string, usage: LlmUsage, opts: { batch?: boolean } = {}): number | null {
  const price = priceFor(model);
  if (!price) return null;
  // USD per Mtok equals micro-USD per token.
  const raw =
    usage.input_tokens * price.input +
    usage.output_tokens * price.output +
    usage.cache_read_input_tokens * price.cache_read +
    usage.cache_creation_input_tokens * price.cache_write;
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
  if (record.cost_micros === null) console.error(`llm_calls: no price for model ${record.model}`);
  const { error } = await client.from('llm_calls').insert({
    user_id: record.user_id ?? null,
    step: record.step,
    tier: record.tier,
    provider: record.provider ?? 'anthropic',
    model: record.model,
    prompt_version: record.prompt_version,
    input_tokens: record.input_tokens,
    output_tokens: record.output_tokens,
    cache_read_input_tokens: record.cache_read_input_tokens,
    cache_creation_input_tokens: record.cache_creation_input_tokens,
    cost_micros: record.cost_micros ?? 0,
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
