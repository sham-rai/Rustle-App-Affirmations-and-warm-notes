import { DELIVERY_INTENTS, LIFE_AREAS, PRIVATE_BY_DEFAULT_LIFE_AREAS } from '../index.ts';

describe('shared enums (docs/00, D46)', () => {
  it('lists the eleven life areas in the glossary order', () => {
    expect(LIFE_AREAS).toEqual([
      'exams',
      'breakup',
      'divorce',
      'health',
      'caregiving',
      'work',
      'grief',
      'change',
      'loneliness',
      'hard_time',
      'other',
    ]);
  });

  it('lists the nine delivery intents', () => {
    expect(DELIVERY_INTENTS).toEqual([
      'daily',
      'date_eve',
      'date_day',
      'follow_up',
      'quiet_presence',
      'win_celebration',
      'first',
      'seed',
      'reengage',
    ]);
  });

  it('keeps the private-by-default areas inside LIFE_AREAS', () => {
    for (const area of PRIVATE_BY_DEFAULT_LIFE_AREAS) expect(LIFE_AREAS).toContain(area);
  });

  // The check constraints in supabase/migrations are compared in scripts/check-enums.ts (npm run lint).
});
