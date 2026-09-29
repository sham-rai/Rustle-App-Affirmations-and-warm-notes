import { EVENT_PREFIXES, TABLES, color } from '@rustle/shared';

// Proves the app resolves packages/shared through the workspace path alias, no build step.
describe('@rustle/shared from the app', () => {
  it('exposes the glossary and the tokens', () => {
    expect(TABLES.delivery).toBe('deliveries');
    expect(EVENT_PREFIXES.warmNote).toBe('warm_note_');
    expect(Object.keys(color.paper)).toEqual(['light', 'dark']);
  });
});
