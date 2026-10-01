import type { SupabaseClient } from '@supabase/supabase-js';

import type { Language } from '../../i18n';

// The consent records (docs/11 §4.2, docs/21 §1.2–1.3), written client-side through PostgREST under
// RLS. `/onboarding/complete` (M2-03) checks that the three rows exist. Nothing here logs: a failure
// is returned as a bare code, never with the user's answers.

export const CONSENT_KINDS = ['terms', 'ai_processing', 'special_category'] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

/**
 * The version of the copy the user agreed to. Bump a kind's version whenever its screen text in
 * en.json / fr.json changes meaning, and whenever the purpose changes (re-consent, docs/11 §4.2).
 */
export const CONSENT_VERSIONS: Readonly<Record<ConsentKind, string>> = {
  terms: '2026-10-01',
  ai_processing: '2026-10-01',
  special_category: '2026-10-01',
};

/**
 * The locale of the copy that was shown. The French strings are written in Canadian French first
 * (D25), so a French consent records `fr-CA` until a France-French variant exists.
 */
export const CONSENT_COPY_LOCALE: Readonly<Record<Language, string>> = { en: 'en', fr: 'fr-CA' };

export type WriteResult =
  | { readonly ok: true; readonly skipped: boolean }
  | { readonly ok: false; readonly reason: 'no_session' | 'write_failed' };

/** The surface the writes need; the real client satisfies it, tests pass a fake. */
export type ConsentClient = Pick<SupabaseClient, 'auth' | 'from'>;

/**
 * `null` means no Supabase project is configured (tests, a build without app/.env.local): there is
 * no account to write to, so the flow goes on and the write is reported as skipped.
 */
export async function recordConsent(
  client: ConsentClient | null,
  kind: ConsentKind,
  language: Language,
): Promise<WriteResult> {
  if (!client) return { ok: true, skipped: true };
  const { data } = await client.auth.getSession();
  if (!data.session) return { ok: false, reason: 'no_session' };
  // user_id defaults to auth.uid() and granted_at to now(); RLS checks the row is the user's own.
  const { error } = await client
    .from('consents')
    .insert({ kind, version: CONSENT_VERSIONS[kind], locale: CONSENT_COPY_LOCALE[language] });
  return error ? { ok: false, reason: 'write_failed' } : { ok: true, skipped: false };
}

/**
 * Records that the gate passed. Only the time of the confirmation is stored (D46); the date of
 * birth never leaves the screen.
 */
export async function confirmAge(client: ConsentClient | null, now: Date): Promise<WriteResult> {
  if (!client) return { ok: true, skipped: true };
  const { data } = await client.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return { ok: false, reason: 'no_session' };
  const { data: rows, error } = await client
    .from('users')
    .update({ age_confirmed_at: now.toISOString() })
    .eq('id', userId)
    .select('id');
  // Under RLS a missing row is not an error, just an empty result: treat it as a failed write.
  if (error || !rows || rows.length !== 1) return { ok: false, reason: 'write_failed' };
  return { ok: true, skipped: false };
}
