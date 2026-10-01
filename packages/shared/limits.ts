// Input limits the client, the migrations and the prompts share (D49). Defined once here; the
// triggers and check constraints in supabase/migrations carry the same numbers after a
// `-- limit:<name> <value>` marker, and scripts/check-enums.ts fails if the two drift apart.
// Output lengths per note kind are a different table: docs/08 §5.8.

/** A board note, in characters. Soft in the app: a quiet counter from NOTE_COUNTER_FROM_CHARS. */
export const NOTE_BODY_MAX_CHARS = 2000;
/** The counter under the note field appears from here, never a red error. */
export const NOTE_COUNTER_FROM_CHARS = 1800;
/** The optional line on a check-in. */
export const CHECKIN_LINE_MAX_CHARS = 280;
/** A warm note's body, after the user's edit. */
export const WARM_NOTE_BODY_MAX_CHARS = 220;

export const INPUT_LIMITS = {
  notes_body_max_chars: NOTE_BODY_MAX_CHARS,
  checkins_line_max_chars: CHECKIN_LINE_MAX_CHARS,
  warm_notes_body_max_chars: WARM_NOTE_BODY_MAX_CHARS,
} as const satisfies Readonly<Record<string, number>>;
