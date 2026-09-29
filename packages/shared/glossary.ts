// One name per thing, in UI, schema, events and docs (docs/00-glossary.md).
// Change docs/00 first, then this file.

/** Schema table name for each kind of note. */
export const TABLES = {
  /** What the user writes on the board. UI: "note". */
  note: 'notes',
  /** What Rustle sends. UI: "a Rustle" / "a note from Rustle". */
  delivery: 'deliveries',
  /** Rustle's reply on a user's note. UI: "note back". */
  reply: 'replies',
  /** A note the user sends to a friend. UI: "warm note". */
  warmNote: 'warm_notes',
} as const;

/** Analytics event prefix for each kind of note. Events never carry note text. */
export const EVENT_PREFIXES = {
  note: 'board_note_',
  delivery: 'delivery_',
  reply: 'reply_',
  warmNote: 'warm_note_',
} as const;

export type NoteKind = keyof typeof TABLES;
export type NoteTable = (typeof TABLES)[NoteKind];
export type EventPrefix = (typeof EVENT_PREFIXES)[NoteKind];
