import { LLM_PROVIDERS, LLM_STEPS, LLM_TIERS } from '../llm-types/index.ts';

describe('llm-types', () => {
  it('names the three tiers of docs/07 §7', () => {
    expect([...LLM_TIERS]).toEqual(['fast', 'writer', 'deep']);
  });
  it('matches the llm_calls.step values of migration 1', () => {
    expect([...LLM_STEPS]).toEqual(['safety', 'extract', 'daily', 'reply', 'recap', 'warm_note', 'guardrail', 'first', 'seed']);
  });
  it('lists anthropic first and the two failover hooks', () => {
    expect([...LLM_PROVIDERS]).toEqual(['anthropic', 'bedrock', 'vertex']);
  });
});
