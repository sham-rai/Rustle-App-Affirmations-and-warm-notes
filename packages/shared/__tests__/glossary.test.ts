import { EVENT_PREFIXES, TABLES } from '../index.ts';

describe('glossary constants (docs/00)', () => {
  it('names the four schema tables', () => {
    expect(TABLES).toEqual({
      note: 'notes',
      delivery: 'deliveries',
      reply: 'replies',
      warmNote: 'warm_notes',
    });
  });

  it('names the four event prefixes', () => {
    expect(EVENT_PREFIXES).toEqual({
      note: 'board_note_',
      delivery: 'delivery_',
      reply: 'reply_',
      warmNote: 'warm_note_',
    });
  });
});
