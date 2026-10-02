import { CHECKIN_LINE_MAX_CHARS, INPUT_LIMITS, NOTE_BODY_MAX_CHARS, NOTE_COUNTER_FROM_CHARS, WARM_NOTE_BODY_MAX_CHARS } from '../limits.ts';

describe('input limits (D49)', () => {
  it('holds the decided values', () => {
    expect(NOTE_BODY_MAX_CHARS).toBe(2000);
    expect(CHECKIN_LINE_MAX_CHARS).toBe(280);
    expect(WARM_NOTE_BODY_MAX_CHARS).toBe(220);
  });
  it('shows the counter before the limit, not at it', () => {
    expect(NOTE_COUNTER_FROM_CHARS).toBeLessThan(NOTE_BODY_MAX_CHARS);
    expect(NOTE_BODY_MAX_CHARS - NOTE_COUNTER_FROM_CHARS).toBeGreaterThanOrEqual(100);
  });
  it('maps every limit to a migration marker name', () => {
    expect(Object.keys(INPUT_LIMITS).sort()).toEqual(['checkins_line_max_chars', 'notes_body_max_chars', 'warm_notes_body_max_chars']);
  });
});
