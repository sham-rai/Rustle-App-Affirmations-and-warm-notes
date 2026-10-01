import type { AuthBootstrapState } from '../../lib/auth';

// Where a cold start at "/" goes (docs/05 §2, docs/21 §1.0–1.3, D46). Pure, so it is tested alone.

export const INTRO_ROUTE = '/splash';
/** The 18+ gate (and its block screen), followed by the three consents (M1-09). */
export const GATE_ROUTE = '/age';
export const HOME_ROUTE = '/today';
/** Not a route: "/" asks the server where onboarding stands (features/consent/onboarding-state). */
export const CHECK_SERVER = 'check-server';

export type LaunchRoute = typeof INTRO_ROUTE | typeof GATE_ROUTE | typeof HOME_ROUTE;
export type LaunchDecision = LaunchRoute | typeof CHECK_SERVER;

export type LaunchInput = {
  readonly auth: AuthBootstrapState;
  readonly introSeen: boolean;
  /** The local cache of "the server shows age confirmed and all three consents". */
  readonly consentsComplete: boolean;
  /** False when no Supabase project is configured: there is no account to create, so no intro. */
  readonly accountsConfigured: boolean;
  /** The 18+ gate blocked this install. */
  readonly blocked: boolean;
};

/**
 * - Blocked by the 18+ gate on this install → the gate, which shows the block screen.
 * - No Supabase project (tests, a build without app/.env.local) → Today.
 * - Both local flags set (the server said onboarding is done) → Today, straight away.
 * - The session is still being established → null: keep the native splash up and wait.
 * - A freshly created anonymous account → the intro, or the gate if the intro was already seen.
 * - Any other session (this install's cache, Keychain, Keystore, Block Store) → ask the server.
 * - No account and provably no stored token (a true first launch offline) → the intro.
 * - Any other failure (a stored token not refreshed yet, an unknown token state) → Today, without
 *   setting the flags, so the next launch that reaches the server checks again.
 */
export function launchRoute({ auth, introSeen, consentsComplete, accountsConfigured, blocked }: LaunchInput): LaunchDecision | null {
  if (blocked) return GATE_ROUTE;
  if (!accountsConfigured) return HOME_ROUTE;
  if (introSeen && consentsComplete) return HOME_ROUTE;
  switch (auth.status) {
    case 'loading':
      return null;
    case 'not_configured':
      return HOME_ROUTE;
    case 'ready':
      if (auth.restoredFrom === 'new') return introSeen ? GATE_ROUTE : INTRO_ROUTE;
      return CHECK_SERVER;
    case 'failed':
      if (auth.reason === 'blocked') return GATE_ROUTE;
      return auth.hasStoredToken === false ? INTRO_ROUTE : HOME_ROUTE;
  }
}
