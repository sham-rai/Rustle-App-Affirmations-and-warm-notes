import { markIntroSeen } from '../intro/intro-seen';
import { markConsentsComplete } from './onboarding-flags';
import { CONSENT_KINDS, type ConsentClient, type ConsentKind } from './records';

// Where onboarding stands, from the server rather than from local guesses (M1-09). Two RLS-scoped
// reads: the user's `age_confirmed_at`, and the kinds of their non-withdrawn consents. Nothing
// read here is logged.

export type OnboardingState = { readonly ageConfirmed: boolean; readonly consentKinds: readonly ConsentKind[] };

export type OnboardingStateResult =
  | { readonly ok: true; readonly state: OnboardingState }
  /** No Supabase project configured: there is no server to ask. */
  | { readonly ok: true; readonly state: null }
  | { readonly ok: false; readonly reason: 'no_session' | 'read_failed' };

export const AGE_ROUTE = '/age';
export const DONE_ROUTE = '/today';
export const CONSENT_ROUTES = {
  terms: '/consent/terms',
  ai_processing: '/consent/ai',
  special_category: '/consent/special-category',
} as const satisfies Record<ConsentKind, string>;

export type OnboardingRoute = typeof AGE_ROUTE | (typeof CONSENT_ROUTES)[ConsentKind] | typeof DONE_ROUTE;

function isConsentKind(value: unknown): value is ConsentKind {
  return CONSENT_KINDS.some((kind) => kind === value);
}

export async function fetchOnboardingState(client: ConsentClient | null): Promise<OnboardingStateResult> {
  if (!client) return { ok: true, state: null };
  const { data } = await client.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return { ok: false, reason: 'no_session' };

  const [user, consents] = await Promise.all([
    client.from('users').select('age_confirmed_at').eq('id', userId).maybeSingle(),
    client.from('consents').select('kind').eq('user_id', userId).is('withdrawn_at', null),
  ]);
  if (user.error || consents.error || !user.data) return { ok: false, reason: 'read_failed' };

  const ageConfirmed = (user.data as { age_confirmed_at: string | null }).age_confirmed_at !== null;
  const rows = (consents.data ?? []) as { kind: unknown }[];
  const consentKinds = CONSENT_KINDS.filter((kind) => rows.some((row) => isConsentKind(row.kind) && row.kind === kind));
  return { ok: true, state: { ageConfirmed, consentKinds } };
}

/** The gate if age is not confirmed, else the first consent still missing, else Today. Pure. */
export function onboardingRoute({ ageConfirmed, consentKinds }: OnboardingState): OnboardingRoute {
  if (!ageConfirmed) return AGE_ROUTE;
  const missing = CONSENT_KINDS.find((kind) => !consentKinds.includes(kind));
  return missing ? CONSENT_ROUTES[missing] : DONE_ROUTE;
}

/** Caches "onboarding is done" locally once the server has said so. */
export function markOnboarded(): void {
  markIntroSeen();
  markConsentsComplete();
}

/**
 * Where to go next, asking the server. `fallback` is used when there is no server to ask, or the
 * read fails (the write before it succeeded, so the static next screen is a fair guess). Reaching
 * Today caches the result in the local flags.
 */
export async function nextOnboardingRoute(
  client: ConsentClient | null,
  fallback: OnboardingRoute,
): Promise<OnboardingRoute> {
  const result = await fetchOnboardingState(client);
  const route = result.ok && result.state ? onboardingRoute(result.state) : fallback;
  if (route === DONE_ROUTE) markOnboarded();
  return route;
}
