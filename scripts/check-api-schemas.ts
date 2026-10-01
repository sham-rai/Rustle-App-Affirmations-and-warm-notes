// Migration 1 keeps the six encrypted base tables in the `enc` schema with full column rights for
// users (the INSTEAD OF triggers on the views run as the caller). What a user may change is enforced
// by the column grants on the public views, so `enc` must never be reachable through PostgREST.
// This fails `npm run lint` if supabase/config.toml ever lists it under [api] schemas.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG = join(import.meta.dirname, '..', 'supabase', 'config.toml');
const FORBIDDEN = ['enc', 'vault', 'auth'] as const;

/** The schema names in the `[api]` section's `schemas = [...]` line. */
export function exposedSchemas(toml: string): readonly string[] {
  const api = /\[api\]([\s\S]*?)(?:\n\[|$)/.exec(toml)?.[1] ?? '';
  const list = /schemas\s*=\s*\[([^\]]*)\]/.exec(api)?.[1] ?? '';
  return list
    .split(',')
    .map((v) => v.trim().replace(/^"|"$/g, ''))
    .filter((v) => v.length > 0);
}

const schemas = exposedSchemas(readFileSync(CONFIG, 'utf8'));
const leaked = FORBIDDEN.filter((name) => schemas.includes(name));
if (leaked.length > 0) {
  console.error(`FAIL check-api-schemas: supabase/config.toml exposes ${leaked.join(', ')} through PostgREST`);
  process.exit(1);
}
console.log(`check-api-schemas: PostgREST exposes [${schemas.join(', ')}]; enc, vault and auth stay private`);
