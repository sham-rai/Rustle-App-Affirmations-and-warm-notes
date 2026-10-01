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
  assertEquals(costMicros('unknown', usage), 0);
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
  const bad = await logLlmCall({ from: () => ({ insert: () => Promise.resolve({ error: { message: 'x' } }) }) }, record);
  assertEquals(bad, false);
});
