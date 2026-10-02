// The one wrapper every AI call goes through (CLAUDE.md, docs/07 §7, docs/08 §2, M1-06).
//
// - Messages (with the static prompt cached), streaming, and Message Batches.
// - Structured output through `output_config.format` with a JSON schema, parsed and validated.
// - Retries for 429 and 5xx inside the SDK; a timeout per call; every failure, refusal or bad
//   output becomes `{ ok: false, reason }` so the caller shows its template. Never an empty result.
// - A cost row per call (`_shared/cost/log.ts`): model, provider, prompt_version, tokens, cost,
//   `cache_read_input_tokens`. Never the prompt, the context or the output.
// - Providers are a slot: only `anthropic` is built; Bedrock and Vertex are hooks (D48).
//
// Prompt injection: the system prefix is the versioned prompt file; everything user-generated goes
// in the user turn as XML-delimited data (docs/08 §4). This module never puts user text in the
// system prompt, and never logs or throws with any of it.

import Anthropic from '@anthropic-ai/sdk';
import type {
  Message,
  MessageCreateParamsNonStreaming,
  MessageStreamEvent,
  TextBlockParam,
} from '@anthropic-ai/sdk/resources/messages';
import type {
  BatchCounts,
  BatchStatus,
  LlmEffort,
  LlmFallbackReason,
  LlmProvider,
  LlmResult,
  LlmStep,
  LlmTier,
  LlmUsage,
} from '@rustle/shared/llm-types/index.ts';

import { costMicros, logLlmCall, type LlmCallsClient } from '../cost/log.ts';
import { BACKGROUND_TIMEOUT_MS, CHARS_PER_TOKEN_ESTIMATE, DEFAULT_MAX_RETRIES, MODELS, type ModelConfig } from './config.ts';
import type { LoadedPrompt } from './prompts.ts';

/** A JSON schema for `output_config.format` plus the validator that turns the parsed JSON into `T`. */
export interface OutputSchema<T> {
  readonly jsonSchema: Record<string, unknown>;
  /** Throws on a value that does not fit; the throw becomes `reason: 'invalid_output'`. */
  parse(value: unknown): T;
}

export interface GenerateRequest<T = string> {
  readonly step: LlmStep;
  readonly tier: LlmTier;
  readonly prompt: LoadedPrompt;
  /**
   * The user turn: the context pack and the task, with every user-written piece inside XML tags
   * the prompt names (docs/08 §4). Built by the caller; this module sends it as is.
   */
  readonly user: string;
  readonly schema?: OutputSchema<T>;
  readonly maxTokens?: number;
  /** Wall-clock budget for the call including retries; real-time paths pass REALTIME_TIMEOUT_MS. */
  readonly timeoutMs?: number;
  /** Retries inside the SDK for 429 and 5xx; real-time paths pass 0 or 1. */
  readonly maxRetries?: number;
  readonly effort?: LlmEffort;
  /** Logged on the cost row only; never sent to the API (docs/08 §8: no identifiers in prompts). */
  readonly userId?: string | null;
}

export interface BatchItem<T = string> {
  /** Unique within the batch; results come back in any order and are matched by it. */
  readonly customId: string;
  readonly request: Omit<GenerateRequest<T>, 'timeoutMs' | 'maxRetries'>;
}

export interface BatchHandle {
  readonly id: string;
  readonly status: BatchStatus;
  readonly counts: BatchCounts;
}

export interface BatchResultItem<T> {
  readonly customId: string;
  readonly result: LlmResult<T>;
}

/** The slice of the SDK this module uses, so tests can pass a fake. The real client satisfies it. */
export interface MessagesApi {
  create(params: MessageCreateParamsNonStreaming, options?: RequestOptions): Promise<Message>;
  stream(params: MessageCreateParamsNonStreaming, options?: RequestOptions): MessageStreamLike;
  batches: {
    create(params: { requests: Array<{ custom_id: string; params: MessageCreateParamsNonStreaming }> }): Promise<BatchLike>;
    retrieve(id: string): Promise<BatchLike>;
    results(id: string): Promise<AsyncIterable<BatchResultLike>>;
  };
}
export interface RequestOptions {
  readonly timeout?: number;
  readonly maxRetries?: number;
}
export interface MessageStreamLike extends AsyncIterable<MessageStreamEvent> {
  finalMessage(): Promise<Message>;
}
export interface BatchLike {
  readonly id: string;
  readonly processing_status: BatchStatus;
  readonly request_counts: BatchCounts;
}
export type BatchResultLike = {
  readonly custom_id: string;
  readonly result:
    | { readonly type: 'succeeded'; readonly message: Message }
    | { readonly type: 'errored'; readonly error: { readonly type: string } }
    | { readonly type: 'canceled' }
    | { readonly type: 'expired' };
};

export interface LLMClientOptions {
  /** The messages API to call; defaults to the Anthropic SDK with `ANTHROPIC_API_KEY`. */
  readonly messages?: MessagesApi;
  readonly provider?: LlmProvider;
  /** Where cost rows go (the service-role Supabase client); null disables logging (tests, the prompt lab). */
  readonly costLog: LlmCallsClient | null;
  readonly models?: Readonly<Record<LlmTier, ModelConfig>>;
  readonly now?: () => number;
  /** One line per event, never content. Defaults to console.warn. */
  readonly warn?: (line: string) => void;
}

/**
 * Builds the SDK messages API for a provider. Only `anthropic` exists; the other two are the
 * failover slot of D48, kept here so turning one on is one factory, not a rewrite.
 */
export function messagesApiFor(provider: LlmProvider): MessagesApi {
  switch (provider) {
    case 'anthropic': {
      const client = new Anthropic({ maxRetries: DEFAULT_MAX_RETRIES });
      return client.messages as unknown as MessagesApi;
    }
    case 'bedrock':
    case 'vertex':
      throw new Error(`provider ${provider} is a hook, not built (D48)`);
  }
}

export class LLMClient {
  private readonly messages: MessagesApi;
  private readonly provider: LlmProvider;
  private readonly costLog: LlmCallsClient | null;
  private readonly models: Readonly<Record<LlmTier, ModelConfig>>;
  private readonly now: () => number;
  private readonly warn: (line: string) => void;
  private readonly warnedPrompts = new Set<string>();

  constructor(options: LLMClientOptions) {
    this.provider = options.provider ?? 'anthropic';
    this.messages = options.messages ?? messagesApiFor(this.provider);
    this.costLog = options.costLog;
    this.models = options.models ?? MODELS;
    this.now = options.now ?? Date.now;
    this.warn = options.warn ?? ((line) => console.warn(line));
  }

  /** One generation, waited for. The caller shows its template on `ok: false`. */
  async generate<T = string>(request: GenerateRequest<T>): Promise<LlmResult<T>> {
    const model = this.models[request.tier];
    const params = this.buildParams(request, model);
    const started = this.now();
    let message: Message;
    try {
      message = await this.messages.create(params, {
        timeout: request.timeoutMs ?? BACKGROUND_TIMEOUT_MS,
        maxRetries: request.maxRetries ?? DEFAULT_MAX_RETRIES,
      });
    } catch (error) {
      return this.failed(request, model, started, classifyError(error), null);
    }
    return this.finish(request, model, started, message, null);
  }

  /**
   * One generation, streamed: `onText` receives each text delta as it arrives (the first note,
   * docs/07 §4.1). The result is the same shape as `generate`; a stream that fails or is refused
   * midway returns `ok: false`, and the caller replaces whatever it showed with its template.
   */
  async stream<T = string>(request: GenerateRequest<T>, onText: (delta: string) => void): Promise<LlmResult<T>> {
    const model = this.models[request.tier];
    const params = this.buildParams(request, model);
    const started = this.now();
    let message: Message;
    try {
      const stream = this.messages.stream(params, {
        timeout: request.timeoutMs ?? BACKGROUND_TIMEOUT_MS,
        maxRetries: request.maxRetries ?? DEFAULT_MAX_RETRIES,
      });
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') onText(event.delta.text);
      }
      message = await stream.finalMessage();
    } catch (error) {
      return this.failed(request, model, started, classifyError(error), null);
    }
    return this.finish(request, model, started, message, null);
  }

  /** Submits a Message Batch (the nightly notes, docs/07 §2.1). Returns at once; poll with `batch()`. */
  async createBatch<T = string>(items: ReadonlyArray<BatchItem<T>>): Promise<BatchHandle> {
    if (items.length === 0) throw new Error('a batch needs at least one item');
    const ids = new Set<string>();
    for (const item of items) {
      if (ids.has(item.customId)) throw new Error(`duplicate customId in batch: ${item.customId}`);
      ids.add(item.customId);
    }
    const batch = await this.messages.batches.create({
      requests: items.map((item) => ({
        custom_id: item.customId,
        params: this.buildParams(item.request, this.models[item.request.tier]),
      })),
    });
    return toHandle(batch);
  }

  /** The batch's status and counts; a job polls this on later cron ticks, never in a loop. */
  async batch(id: string): Promise<BatchHandle> {
    return toHandle(await this.messages.batches.retrieve(id));
  }

  /**
   * The results of an ended batch, each matched to its request by `customId` through `lookup`
   * (a result for an unknown id is skipped with a warning). Logs one cost row per result at the
   * batch price. Results arrive in any order.
   */
  async *batchResults<T = string>(
    id: string,
    lookup: (customId: string) => BatchItem<T>['request'] | undefined,
  ): AsyncGenerator<BatchResultItem<T>> {
    const results = await this.messages.batches.results(id);
    for await (const entry of results) {
      const request = lookup(entry.custom_id);
      if (!request) {
        this.warn(`llm: batch ${id} returned an unknown custom_id`);
        continue;
      }
      const model = this.models[request.tier];
      const started = this.now();
      const r = entry.result;
      let result: LlmResult<T>;
      if (r.type === 'succeeded') result = await this.finish(request, model, started, r.message, id);
      else if (r.type === 'errored') result = await this.failed(request, model, started, batchErrorReason(r.error.type), id);
      else result = await this.failed(request, model, started, { reason: 'unknown', retryable: true }, id);
      yield { customId: entry.custom_id, result };
    }
  }

  // --- request building ---------------------------------------------------------------------

  private buildParams<T>(request: Omit<GenerateRequest<T>, 'timeoutMs' | 'maxRetries'>, model: ModelConfig): MessageCreateParamsNonStreaming {
    this.warnIfBelowCacheMinimum(request.prompt, model);
    const system: TextBlockParam[] = [
      // The static prefix: identity, rules, style, examples. One breakpoint on its last block;
      // the user turn after it varies per call and is never cached (docs/08 §2).
      { type: 'text', text: request.prompt.system, cache_control: { type: 'ephemeral' } },
    ];
    const params: MessageCreateParamsNonStreaming = {
      model: model.id,
      max_tokens: request.maxTokens ?? model.defaultMaxTokens,
      system,
      messages: [{ role: 'user', content: request.user }],
    };
    const effort = request.effort ?? model.defaultEffort;
    const format = request.schema ? { type: 'json_schema' as const, schema: request.schema.jsonSchema } : undefined;
    if ((effort && model.supportsEffort) || format) {
      params.output_config = {
        ...(effort && model.supportsEffort ? { effort } : {}),
        ...(format ? { format } : {}),
      };
    }
    return params;
  }

  private warnIfBelowCacheMinimum(prompt: LoadedPrompt, model: ModelConfig): void {
    const key = `${prompt.promptVersion}:${model.id}`;
    if (this.warnedPrompts.has(key)) return;
    this.warnedPrompts.add(key);
    const estimate = Math.round(prompt.system.length / CHARS_PER_TOKEN_ESTIMATE);
    if (estimate < model.minCacheableTokens) {
      this.warn(
        `llm: prompt ${prompt.promptVersion} is about ${estimate} tokens, under the ${model.minCacheableTokens}-token cache minimum of ${model.id}; its prefix will not be cached`,
      );
    }
  }

  // --- result handling ----------------------------------------------------------------------

  private async finish<T>(
    request: Omit<GenerateRequest<T>, 'timeoutMs' | 'maxRetries'>,
    model: ModelConfig,
    started: number,
    message: Message,
    batchId: string | null,
  ): Promise<LlmResult<T>> {
    const usage = normaliseUsage(message.usage);
    const latencyMs = this.now() - started;
    const info = { provider: this.provider, model: message.model || model.id, promptVersion: request.prompt.promptVersion, latencyMs, usage };

    if (message.stop_reason === 'refusal') {
      await this.log(request, info, usage, batchId, 'fallback');
      return { ok: false, reason: 'refusal', retryable: false, ...info };
    }
    if (message.stop_reason === 'max_tokens') {
      await this.log(request, info, usage, batchId, 'fallback');
      return { ok: false, reason: 'max_tokens', retryable: false, ...info };
    }

    const text = message.content
      .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    let output: T;
    try {
      output = request.schema ? request.schema.parse(JSON.parse(text)) : (text as unknown as T);
      if (!request.schema && text.length === 0) throw new Error('empty');
    } catch {
      await this.log(request, info, usage, batchId, 'fallback');
      return { ok: false, reason: 'invalid_output', retryable: true, ...info };
    }
    await this.log(request, info, usage, batchId, 'ok');
    return { ok: true, output, text, ...info, usage };
  }

  private async failed<T>(
    request: Omit<GenerateRequest<T>, 'timeoutMs' | 'maxRetries'>,
    model: ModelConfig,
    started: number,
    failure: { reason: LlmFallbackReason; retryable: boolean },
    batchId: string | null,
  ): Promise<LlmResult<T>> {
    const info = { provider: this.provider, model: model.id, promptVersion: request.prompt.promptVersion, latencyMs: this.now() - started, usage: null };
    await this.log(request, info, EMPTY_USAGE, batchId, 'error');
    return { ok: false, ...failure, ...info };
  }

  private async log<T>(
    request: Omit<GenerateRequest<T>, 'timeoutMs' | 'maxRetries'>,
    info: { model: string; promptVersion: string; latencyMs: number },
    usage: LlmUsage,
    batchId: string | null,
    status: 'ok' | 'error' | 'fallback',
  ): Promise<void> {
    if (!this.costLog) return;
    try {
      await logLlmCall(this.costLog, {
        step: request.step,
        tier: request.tier,
        provider: this.provider,
        model: info.model,
        prompt_version: info.promptVersion,
        ...usage,
        cost_micros: costMicros(info.model, usage, { batch: batchId !== null }),
        latency_ms: info.latencyMs,
        batch_id: batchId,
        status,
        user_id: request.userId ?? null,
      });
    } catch {
      this.warn('llm: cost logging threw; the generation result is unaffected');
    }
  }
}

// --- helpers --------------------------------------------------------------------------------

const EMPTY_USAGE: LlmUsage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };

export function normaliseUsage(usage: Message['usage']): LlmUsage {
  return {
    input_tokens: usage.input_tokens ?? 0,
    output_tokens: usage.output_tokens ?? 0,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
  };
}

function toHandle(batch: BatchLike): BatchHandle {
  return { id: batch.id, status: batch.processing_status, counts: batch.request_counts };
}

/** Maps an SDK error to a fallback reason. Never includes the error message: it can quote the request. */
export function classifyError(error: unknown): { reason: LlmFallbackReason; retryable: boolean } {
  if (error instanceof Anthropic.APIConnectionTimeoutError) return { reason: 'timeout', retryable: true };
  if (error instanceof Anthropic.APIConnectionError) return { reason: 'network', retryable: true };
  if (error instanceof Anthropic.APIError) {
    const status = error.status;
    if (status === 429) return { reason: 'rate_limited', retryable: true };
    if (status === 529) return { reason: 'overloaded', retryable: true };
    if (status === 401 || status === 403) return { reason: 'auth', retryable: false };
    if (status !== undefined && status >= 500) return { reason: 'server_error', retryable: true };
    if (status !== undefined && status >= 400) return { reason: 'bad_request', retryable: false };
  }
  if (error instanceof Error && error.name === 'AbortError') return { reason: 'timeout', retryable: true };
  return { reason: 'unknown', retryable: true };
}

/** Batch results carry an error type string rather than an exception. */
export function batchErrorReason(type: string): { reason: LlmFallbackReason; retryable: boolean } {
  switch (type) {
    case 'invalid_request':
      return { reason: 'bad_request', retryable: false };
    case 'rate_limit':
      return { reason: 'rate_limited', retryable: true };
    case 'overloaded':
      return { reason: 'overloaded', retryable: true };
    case 'authentication':
    case 'permission':
    case 'billing':
      return { reason: 'auth', retryable: false };
    case 'server_error':
    case 'api_error':
      return { reason: 'server_error', retryable: true };
    default:
      return { reason: 'unknown', retryable: true };
  }
}
