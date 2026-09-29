// Smoke test for docs/21 §0 criterion 6: Deno imports packages/shared through the import map
// in supabase/functions/deno.json, with no build step. Checked with `deno check`.
import { EVENT_PREFIXES, TABLES } from '@rustle/shared/glossary.ts';
import { color, typography } from '@rustle/shared/tokens.ts';

export const smoke = {
  tables: TABLES,
  eventPrefixes: EVENT_PREFIXES,
  paperLight: color.paper.light,
  serif: typography.serif,
} as const;
