// docs/00 (D46): LIFE_AREAS and DELIVERY_INTENTS are defined once in packages/shared/enums.ts.
// The check constraints in supabase/migrations must carry the same values, so this script reads
// the array that follows each `-- enum:<name>` marker in the migrations and compares it.
// The input limits (D49) work the same way: `-- limit:<name> <value>` markers against
// packages/shared/limits.ts. Run with `npm run check:enums` (tsx); part of `npm run lint`.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DELIVERY_INTENTS, LIFE_AREAS } from '../packages/shared/enums.ts';
import { INPUT_LIMITS } from '../packages/shared/limits.ts';

const MIGRATIONS = join(import.meta.dirname, '..', 'supabase', 'migrations');

/** The values of the SQL `array[...]` literal on the line after `-- enum:<marker>`. */
export function sqlEnum(sql: string, marker: string): readonly string[] {
  const match = new RegExp(`-- enum:${marker}\\s*\\n[^\\n]*array\\[([^\\]]+)\\]`).exec(sql);
  if (!match?.[1]) throw new Error(`no "-- enum:${marker}" array literal in supabase/migrations`);
  return match[1]
    .split(',')
    .map((v) => v.trim().replace(/^'|'$/g, ''))
    .filter((v) => v.length > 0);
}

/** The number after `-- limit:<marker>`; every occurrence must agree. */
export function sqlLimit(sql: string, marker: string): number {
  const values = [...sql.matchAll(new RegExp(`-- limit:${marker} (\\d+)`, 'g'))].map((m) => Number(m[1]));
  if (values.length === 0) throw new Error(`no "-- limit:${marker}" marker in supabase/migrations`);
  if (new Set(values).size > 1) throw new Error(`"-- limit:${marker}" markers disagree: ${values.join(', ')}`);
  return values[0] as number;
}

function same(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

const sql = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'))
  .join('\n');

const checks: ReadonlyArray<[string, readonly string[]]> = [
  ['life_areas', LIFE_AREAS],
  ['delivery_intents', DELIVERY_INTENTS],
];

let failed = false;
for (const [marker, expected] of checks) {
  const actual = sqlEnum(sql, marker);
  if (same(actual, expected)) {
    console.log(`ok   ${marker}: ${expected.length} values match packages/shared/enums.ts`);
  } else {
    failed = true;
    console.error(`FAIL ${marker}: migration has [${actual.join(', ')}], enums.ts has [${expected.join(', ')}]`);
  }
}
for (const [marker, expected] of Object.entries(INPUT_LIMITS)) {
  const actual = sqlLimit(sql, marker);
  if (actual === expected) {
    console.log(`ok   ${marker}: ${expected} matches packages/shared/limits.ts`);
  } else {
    failed = true;
    console.error(`FAIL ${marker}: migration has ${actual}, limits.ts has ${expected}`);
  }
}
if (failed) process.exit(1);
console.log('check-enums: migrations match packages/shared/enums.ts and limits.ts');
