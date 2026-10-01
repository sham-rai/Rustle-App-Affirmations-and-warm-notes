// The two enums the schema, the prompts and the app share (docs/00-glossary.md, D46).
// Defined once here; the check constraints in supabase/migrations use the same values,
// and packages/shared/__tests__/enums.test.ts fails if the two drift apart.

/** Life areas: onboarding chips map one to one; the extractor uses the same list. */
export const LIFE_AREAS = [
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
] as const satisfies readonly string[];
export type LifeArea = (typeof LIFE_AREAS)[number];

/** Why a given Rustle exists (`deliveries.kind`). The door-open weekly note is a `quiet_presence`. */
export const DELIVERY_INTENTS = [
  'daily',
  'date_eve',
  'date_day',
  'follow_up',
  'quiet_presence',
  'win_celebration',
  'first',
  'seed',
  'reengage',
] as const satisfies readonly string[];
export type DeliveryIntent = (typeof DELIVERY_INTENTS)[number];

/** Life areas whose lock-screen privacy defaults to on (docs/07 §6, D46). */
export const PRIVATE_BY_DEFAULT_LIFE_AREAS = ['divorce', 'health', 'grief'] as const satisfies readonly LifeArea[];
