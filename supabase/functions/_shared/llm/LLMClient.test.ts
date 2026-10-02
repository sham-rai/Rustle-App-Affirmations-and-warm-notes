// LLMClient against a fake messages API: no network, no key. Run with `deno test _shared/llm/`.
import Anthropic from '@anthropic-ai/sdk';
import type { Message, MessageCreateParamsNonStreaming, MessageStreamEvent } from '@anthropic-ai/sdk/resources/messages';

import type { LlmCallsClient } from '../cost/log.ts';
import { MODELS } from './config.ts';
import type { RequestOptions } from '@anthropic-ai/sdk/internal/request-options';
import type { MessageBatch, MessageBatchIndividualResponse } from '@anthropic-ai/sdk/resources/messages/batches';

import { batchErrorReason, classifyError, LLMClient, type MessagesApi, type MessageStreamLike } from './LLMClient.ts';
import { loadPrompt, promptUrl, promptVersionOf } from './prompts.ts';

function assertEquals<T>(actual: T, expected: T, label = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label} expected ${b}, got ${a}`);
}
function assert(condition: unknown, label: string) {
  if (!condition) throw new Error(label);
}

const PROMPT_TEXT = 'You are Rustle. '.repeat(300); // about 1 200 tokens: above Sonnet 5's minimum, under Haiku's
const prompt = await loadPrompt('note_composer', 3, () => Promise.resolve(PROMPT_TEXT));

function message(partial: Partial<Message> & { text?: string }): Message {
  const { text, ...rest } = partial;
  return {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-5',
    content: text === undefined ? [] : [{ type: 'text', text, citations: null }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    stop_details: null,
    container: null,
    context_management: null,
    usage: {
      input_tokens: 100,
      output_tokens: 20,
      cache_read_input_tokens: 1100,
      cache_creation_input_tokens: 0,
      cache_creation: null,
      server_tool_use: null,
      service_tier: null,
      inference_geo: null,
      iterations: null,
      speed: null,
    },
    ...rest,
  } as Message;
}

interface Fake {
  api: MessagesApi;
  calls: Array<{ params: MessageCreateParamsNonStreaming; options?: RequestOptions }>;
  rows: Array<Record<string, unknown>>;
  costLog: LlmCallsClient;
  warnings: string[];
}

function fake(respond: (params: MessageCreateParamsNonStreaming) => Message | Promise<Message>, batch?: Partial<MessagesApi['batches']>): Fake {
  const calls: Fake['calls'] = [];
  const rows: Fake['rows'] = [];
  const api: MessagesApi = {
    async create(params, options) {
      calls.push({ params, options });
      return await respond(params);
    },
    stream(params, options): MessageStreamLike {
      calls.push({ params, options });
      const final = Promise.resolve(respond(params));
      const events: MessageStreamEvent[] = [];
      return {
        async *[Symbol.asyncIterator]() {
          const m = await final;
          for (const block of m.content) {
            if (block.type === 'text') {
              for (const word of block.text.split(' ')) {
                events.push({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: `${word} ` } });
              }
            }
          }
          for (const event of events) yield event;
        },
        finalMessage: () => final,
      };
    },
    batches: {
      create: () => Promise.reject(new Error('no batch fake')),
      retrieve: () => Promise.reject(new Error('no batch fake')),
      results: () => Promise.reject(new Error('no batch fake')),
      ...batch,
    },
  };
  const costLog: LlmCallsClient = {
    from: () => ({
      insert: (row) => {
        rows.push(row);
        return Promise.resolve({ error: null });
      },
    }),
  };
  return { api, calls, rows, costLog, warnings: [] };
}

function client(f: Fake, extra: Partial<ConstructorParameters<typeof LLMClient>[0]> = {}) {
  let t = 1_000;
  return new LLMClient({ messages: f.api, costLog: f.costLog, now: () => (t += 250), warn: (line) => f.warnings.push(line), ...extra });
}

Deno.test('generate: cached system prefix, user turn as data, effort by tier, a cost row with cache reads', async () => {
  const f = fake(() => message({ text: 'A short note.' }));
  const result = await client(f).generate({ step: 'daily', tier: 'writer', prompt, user: '<note>hello</note>', userId: 'u1' });
  assert(result.ok, 'ok');
  if (!result.ok) return;
  assertEquals(result.output, 'A short note.');
  assertEquals(result.usage.cache_read_input_tokens, 1100);
  assertEquals(result.promptVersion, 'note_composer@v3');
  assertEquals(result.latencyMs, 250);

  const { params, options } = f.calls[0]!;
  assertEquals(params.model, MODELS.writer.id);
  assertEquals(params.messages, [{ role: 'user', content: '<note>hello</note>' }]);
  const system = params.system as Array<{ text: string; cache_control?: unknown }>;
  assertEquals(system.length, 1);
  assertEquals(system[0]!.cache_control, { type: 'ephemeral' });
  assertEquals(params.output_config, { effort: 'low' });
  assertEquals(params.max_tokens, 4096);
  assertEquals(options?.maxRetries, 2);
  assertEquals(options?.timeout, 60_000);
  assert(options?.signal instanceof AbortSignal, 'the whole call is capped by an AbortSignal');

  assertEquals(f.rows.length, 1);
  const row = f.rows[0]!;
  assertEquals(row.step, 'daily');
  assertEquals(row.tier, 'writer');
  assertEquals(row.provider, 'anthropic');
  assertEquals(row.prompt_version, 'note_composer@v3');
  assertEquals(row.cache_read_input_tokens, 1100);
  assertEquals(row.status, 'ok');
  assertEquals(row.user_id, 'u1');
  assert(typeof row.cost_micros === 'number' && row.cost_micros > 0, 'cost computed');
  assertEquals(JSON.stringify(row).includes('hello'), false, 'no content in the row');
  assertEquals(f.warnings, []);
});

Deno.test('generate: the fast tier sends no effort and warns once that the prompt is under the cache minimum', async () => {
  const f = fake(() => message({ text: '{"level":"none"}', model: 'claude-haiku-4-5' }));
  const c = client(f);
  const schema = { jsonSchema: { type: 'object' }, parse: (v: unknown) => v as { level: string } };
  const first = await c.generate({ step: 'safety', tier: 'fast', prompt, user: 'x', schema });
  await c.generate({ step: 'safety', tier: 'fast', prompt, user: 'y', schema });
  assert(first.ok, 'ok');
  if (first.ok) assertEquals(first.output, { level: 'none' });
  assertEquals(f.calls[0]!.params.output_config, { format: { type: 'json_schema', schema: { type: 'object' } } });
  assertEquals(f.warnings.length, 1);
  assert(f.warnings[0]!.includes('4096'), 'names the minimum');
});

Deno.test('generate: a refusal, max_tokens, and invalid JSON each become a fallback with a logged row', async () => {
  const schema = { jsonSchema: {}, parse: (v: unknown) => v as { text: string } };
  const refused = fake(() => message({ stop_reason: 'refusal', text: '' }));
  const r1 = await client(refused).generate({ step: 'reply', tier: 'writer', prompt, user: 'x', schema });
  assertEquals(r1.ok, false);
  if (!r1.ok) assertEquals([r1.reason, r1.retryable], ['refusal', false]);
  assertEquals(refused.rows[0]!.status, 'fallback');

  const cut = fake(() => message({ stop_reason: 'max_tokens', text: '{"text":"a long' }));
  const r2 = await client(cut).generate({ step: 'reply', tier: 'writer', prompt, user: 'x', schema });
  if (!r2.ok) assertEquals(r2.reason, 'max_tokens');

  const bad = fake(() => message({ text: 'not json' }));
  const r3 = await client(bad).generate({ step: 'reply', tier: 'writer', prompt, user: 'x', schema });
  if (!r3.ok) assertEquals([r3.reason, r3.retryable], ['invalid_output', true]);

  const rejected = fake(() => message({ text: '{"text":"ok"}' }));
  const r4 = await client(rejected).generate({
    step: 'reply',
    tier: 'writer',
    prompt,
    user: 'x',
    schema: { jsonSchema: {}, parse: () => { throw new Error('nope'); } },
  });
  if (!r4.ok) assertEquals(r4.reason, 'invalid_output');

  const empty = fake(() => message({ text: '   ' }));
  const r5 = await client(empty).generate({ step: 'reply', tier: 'writer', prompt, user: 'x' });
  if (!r5.ok) assertEquals(r5.reason, 'invalid_output');
  assert(!r5.ok, 'an empty text is never ok');
});

Deno.test('generate: SDK errors map to reasons, log an error row, and never throw', async () => {
  const cases: Array<[unknown, string, boolean]> = [
    [new Anthropic.RateLimitError(429, { type: 'rate_limit_error' }, 'slow down', new Headers()), 'rate_limited', true],
    [new Anthropic.InternalServerError(500, { type: 'api_error' }, 'boom', new Headers()), 'server_error', true],
    [new Anthropic.InternalServerError(529, { type: 'overloaded_error' }, 'busy', new Headers()), 'overloaded', true],
    [new Anthropic.BadRequestError(400, { type: 'invalid_request_error' }, 'bad', new Headers()), 'bad_request', false],
    [new Anthropic.AuthenticationError(401, { type: 'authentication_error' }, 'key', new Headers()), 'auth', false],
    [new Anthropic.APIConnectionTimeoutError({ message: 'timed out' }), 'timeout', true],
    [new Anthropic.APIConnectionError({ message: 'offline' }), 'network', true],
    [new Error('something else'), 'unknown', true],
  ];
  for (const [error, reason, retryable] of cases) {
    assertEquals(classifyError(error), { reason, retryable }, String(reason));
    const f = fake(() => Promise.reject(error));
    const result = await client(f).generate({ step: 'first', tier: 'writer', prompt, user: 'x', timeoutMs: 8_000, maxRetries: 0 });
    assertEquals(result.ok, false, reason);
    if (!result.ok) assertEquals(result.reason, reason);
    assertEquals(f.rows[0]!.status, 'error');
    assertEquals([f.calls[0]!.options?.timeout, f.calls[0]!.options?.maxRetries], [8_000, 0]);
  }
  assertEquals(classifyError(new DOMException('timed out', 'TimeoutError')), { reason: 'timeout', retryable: true });
});

Deno.test('stream: deltas arrive in order and the result matches the final message', async () => {
  const f = fake(() => message({ text: 'one two three' }));
  const seen: string[] = [];
  const result = await client(f).stream({ step: 'first', tier: 'writer', prompt, user: 'x' }, (d) => seen.push(d));
  assertEquals(seen, ['one ', 'two ', 'three ']);
  assert(result.ok, 'ok');
  if (result.ok) assertEquals(result.output, 'one two three');
});

Deno.test('stream: a failure midway is a fallback, not a throw', async () => {
  const f = fake(() => Promise.reject(new Anthropic.InternalServerError(500, {}, 'boom', new Headers())));
  const result = await client(f).stream({ step: 'first', tier: 'writer', prompt, user: 'x' }, () => {});
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.reason, 'server_error');
});

Deno.test('cost logging never breaks a generation', async () => {
  const f = fake(() => message({ text: 'fine' }));
  const throwing: LlmCallsClient = { from: () => ({ insert: () => Promise.reject(new Error('db down')) }) };
  const result = await client(f, { costLog: throwing }).generate({ step: 'daily', tier: 'writer', prompt, user: 'x' });
  assert(result.ok, 'ok');
  assertEquals(f.warnings.some((w) => w.includes('cost logging')), true);
  const silent = await client(f, { costLog: null }).generate({ step: 'daily', tier: 'writer', prompt, user: 'x' });
  assert(silent.ok, 'ok without a log');
});

Deno.test('batches: create, poll, and ingest results with batch pricing and unknown ids skipped', async () => {
  let created: { requests: Array<{ custom_id: string; params: MessageCreateParamsNonStreaming }> } | null = null;
  const handle: MessageBatch = {
    id: 'msgbatch_1',
    type: 'message_batch',
    processing_status: 'in_progress',
    request_counts: { processing: 2, succeeded: 0, errored: 0, canceled: 0, expired: 0 },
    created_at: '2026-10-01T02:00:00Z',
    expires_at: '2026-10-02T02:00:00Z',
    ended_at: null,
    archived_at: null,
    cancel_initiated_at: null,
    results_url: null,
  };
  // The wire shape of an errored result: an ErrorResponse whose inner error carries the API type.
  const results: MessageBatchIndividualResponse[] = [
    { custom_id: 'b', result: { type: 'errored', error: { type: 'error', request_id: null, error: { type: 'rate_limit_error', message: 'slow down' } } } },
    { custom_id: 'a', result: { type: 'succeeded', message: message({ text: 'note for a' }) } },
    { custom_id: 'zzz', result: { type: 'expired' } },
  ];
  const f = fake(() => message({}), {
    create: (params) => {
      created = params;
      return Promise.resolve(handle);
    },
    retrieve: () => Promise.resolve({ ...handle, processing_status: 'ended' }),
    results: () =>
      Promise.resolve({
        async *[Symbol.asyncIterator]() {
          for (const r of results) yield r;
        },
      }),
  });
  const c = client(f);
  const items = [
    { customId: 'a', request: { step: 'daily' as const, tier: 'writer' as const, prompt, user: 'A' } },
    { customId: 'b', request: { step: 'daily' as const, tier: 'writer' as const, prompt, user: 'B' } },
  ];
  const submitted = await c.createBatch(items);
  assertEquals(submitted.id, 'msgbatch_1');
  assertEquals(created!.requests.map((r) => r.custom_id), ['a', 'b']);
  assertEquals(created!.requests[1]!.params.messages[0]!.content, 'B');

  assertEquals((await c.batch('msgbatch_1')).status, 'ended');

  const out: Array<[string, boolean, string?]> = [];
  for await (const item of c.batchResults('msgbatch_1', (id) => items.find((i) => i.customId === id)?.request)) {
    out.push([item.customId, item.result.ok, item.result.ok ? undefined : item.result.reason]);
  }
  assertEquals(out, [['b', false, 'rate_limited'], ['a', true, undefined]]);
  assertEquals(f.warnings.some((w) => w.includes('unknown custom_id')), true);
  assertEquals(f.rows.map((r) => r.batch_id), ['msgbatch_1', 'msgbatch_1']);
  assertEquals(f.rows.map((r) => r.latency_ms), [null, null], 'batch rows carry no latency');
  const okRow = f.rows[1]!;
  // 100 input at $2 + 20 output at $10 + 1100 cache reads at $0.20 = 620 micro-USD, halved for the batch.
  assertEquals(okRow.cost_micros, 310);

  let threw = false;
  try {
    await c.createBatch([items[0]!, items[0]!]);
  } catch {
    threw = true;
  }
  assert(threw, 'duplicate custom ids are refused');
  assertEquals(batchErrorReason('invalid_request_error'), { reason: 'bad_request', retryable: false });
  assertEquals(batchErrorReason('api_error'), { reason: 'server_error', retryable: true });
});

Deno.test('prompts: versioned path and name, empty or missing files throw', async () => {
  assertEquals(promptVersionOf('note_composer', 3), 'note_composer@v3');
  assert(promptUrl('rustle_voice', 1).pathname.endsWith('/_shared/prompts/rustle_voice/v1.md'), 'path');
  for (const bad of ['Note', 'note composer', '../x']) {
    let threw = false;
    try {
      promptUrl(bad, 1);
    } catch {
      threw = true;
    }
    assert(threw, `rejects ${bad}`);
  }
  let empty = false;
  try {
    await loadPrompt('note_composer', 1, () => Promise.resolve('  \n'));
  } catch {
    empty = true;
  }
  assert(empty, 'empty prompt throws');
});
