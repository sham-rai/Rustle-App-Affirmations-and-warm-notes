// Run with `deno test supabase/functions/_shared/cost/` (also loadable by Jest-free CI later).
import { costMicros, logLlmCall, type LlmCallRecord } from './log.ts';

function assertEquals<T>(a: T, b: T) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

Deno.test('costMicros prices tokens, cache reads and batch', () => {
  const usage = { input_tokens: 1_000_000, output_tokens: 100_000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  assertEquals(costMicros('claude-sonnet-5', usage), 3_000_000);
  assertEquals(costMicros('claude-sonnet-5', usage, { batch: true }), 1_500_000);
  assertEquals(costMicros('claude-haiku-4-5', { ...usage, input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000 }), 100_000);
  assertEquals(costMicros('unknown', usage), null);
});

Deno.test('costMicros uses per-model cache prices (Opus 5.5 cache read is 5% of input)', () => {
  const read = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 0 };
  assertEquals(costMicros('claude-opus-5-5', read), 200_000);
  assertEquals(costMicros('claude-opus-5', read), 500_000);
  assertEquals(costMicros('claude-opus-5-5', { ...read, cache_read_input_tokens: 0, cache_creation_input_tokens: 1_000_000 }), 5_000_000);
});

Deno.test('costMicros strips Bedrock and Vertex decorations', () => {
  const usage = { input_tokens: 1_000_000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  assertEquals(costMicros('anthropic.claude-haiku-4-5-20251001-v1:0', usage), 1_000_000);
  assertEquals(costMicros('claude-sonnet-5@20260101', usage), 2_000_000);
});

Deno.test('costMicros resolves dated model ids by the longest matching key', () => {
  const usage = { input_tokens: 1_000_000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  assertEquals(costMicros('claude-haiku-4-5-20251001', usage), 1_000_000);
  assertEquals(costMicros('claude-opus-5-5-20260101', usage), 4_000_000);
  assertEquals(costMicros('claude-opus-5-20260101', usage), 5_000_000);
});

Deno.test('logLlmCall inserts one row and survives an error', async () => {
  const rows: Record<string, unknown>[] = [];
  const record: LlmCallRecord = {
    step: 'daily', tier: 'writer', model: 'claude-sonnet-5', prompt_version: 'daily@1', input_tokens: 1, output_tokens: 1,
    cache_read_input_tokens: 0, cache_creation_input_tokens: 0, cost_micros: 12, latency_ms: 300, batch_id: null, status: 'ok',
  };
  const ok = await logLlmCall({ from: () => ({ insert: (r) => { rows.push(r); return Promise.resolve({ error: null }); } }) }, record);
  assertEquals(ok, true);
  assertEquals(rows[0]?.step, 'daily');
  assertEquals(rows[0]?.provider, 'anthropic');
  await logLlmCall({ from: () => ({ insert: (r) => { rows.push(r); return Promise.resolve({ error: null }); } }) }, { ...record, provider: 'bedrock', cost_micros: null });
  assertEquals(rows[1]?.provider, 'bedrock');
  assertEquals(rows[1]?.cost_micros, 0);
  const bad = await logLlmCall({ from: () => ({ insert: () => Promise.resolve({ error: { message: 'x' } }) }) }, record);
  assertEquals(bad, false);
});
