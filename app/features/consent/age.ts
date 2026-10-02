// The neutral date-of-birth gate (docs/05 §3, docs/11 §5, D46). Pure, so it is tested alone.
// The date the user picks lives only in component state: it is never stored, sent or logged.
// Only the outcome reaches the server, as `users.age_confirmed_at`.

export const ADULT_AGE = 18;

/** Oldest year the entry accepts; anything earlier is a typo, not a birth year. */
export const EARLIEST_BIRTH_YEAR = 1900;

export type DateOfBirth = { readonly year: number; readonly month: number; readonly day: number };

export type DateOfBirthEntry = { readonly year: string; readonly month: string; readonly day: string };

function toWhole(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{1,4}$/.test(trimmed)) return null;
  return Number(trimmed);
}

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one (UTC, so no time zone can shift it).
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * A real calendar date that is not in the future, or null. Two-digit years are refused rather
 * than guessed (is "08" 1908 or 2008?), so the gate never decides an age from a guess.
 */
export function parseDateOfBirth(entry: DateOfBirthEntry, today: Date): DateOfBirth | null {
  const year = toWhole(entry.year);
  const month = toWhole(entry.month);
  const day = toWhole(entry.day);
  if (year === null || month === null || day === null) return null;
  if (entry.year.trim().length !== 4 || year < EARLIEST_BIRTH_YEAR) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  const date = { year, month, day };
  if (compareDates(date, localDate(today)) > 0) return null;
  return date;
}

/** Today's calendar date on the phone (the user's own day, not UTC). */
export function localDate(now: Date): DateOfBirth {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function compareDates(a: DateOfBirth, b: DateOfBirth): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** Whole years lived on `today`. A 29 February birthday turns a year older on 1 March in common years. */
export function ageOn(dateOfBirth: DateOfBirth, today: DateOfBirth): number {
  const years = today.year - dateOfBirth.year;
  const hadBirthday =
    today.month > dateOfBirth.month || (today.month === dateOfBirth.month && today.day >= dateOfBirth.day);
  return hadBirthday ? years : years - 1;
}

export function isAdult(dateOfBirth: DateOfBirth, now: Date): boolean {
  return ageOn(dateOfBirth, localDate(now)) >= ADULT_AGE;
}
