import type { AuthBootstrapState } from '../../lib/auth';

// Where a cold start at "/" goes (docs/05 §2, docs/21 §1.0–1.3, D46). Pure, so it is tested alone.

export const INTRO_ROUTE = '/splash';
/** The 18+ gate, followed by the three consents (M1-09). */
export const GATE_ROUTE = '/age';
export const HOME_ROUTE = '/today';

export type LaunchRoute = typeof INTRO_ROUTE | typeof GATE_ROUTE | typeof HOME_ROUTE;

export type LaunchInput = {
  readonly auth: AuthBootstrapState;
  readonly introSeen: boolean;
  /** The local flag set once the third consent's row is written (features/consent). */
  readonly consentsComplete: boolean;
  /** False when no Supabase project is configured: there is no account to create, so no intro. */
  readonly accountsConfigured: boolean;
};

/** Where an account on this install's own flags stands: intro, then gate and consents, then Today. */
function byLocalFlags(introSeen: boolean, consentsComplete: boolean): LaunchRoute {
  if (!introSeen) return INTRO_ROUTE;
  return consentsComplete ? HOME_ROUTE : GATE_ROUTE;
}

/**
 * - No Supabase project (tests, a build without app/.env.local) → Today.
 * - Intro seen and consents complete on this install → Today, straight away.
 * - The session is still being established → null: keep the native splash up and wait.
 * - A freshly created anonymous account → the intro (or the gate if the intro was already seen,
 *   for example after a first launch that never reached the server).
 * - A session restored from this install's cache → its local flags decide: the intro if it was
 *   never passed (the app was killed before Begin), the gate if the consents are not complete
 *   (killed between Begin and the last consent), else Today.
 * - A session restored from a reinstall-proof store (Keychain, Keystore, Block Store) → Today: an
 *   existing account whose MMKV flags were lost with the reinstall.
 * - No account and provably no stored token (a true first launch offline) → as a new account.
 * - No account but a stored token, or no answer about the token (the store threw) → Today: an
 *   existing account must never see the intro again, so unknown is treated as existing.
 * - Blocked by the 18+ gate on this install → the gate, which shows the block screen ("/" also
 *   checks the flag before anything else).
 */
export function launchRoute({ auth, introSeen, consentsComplete, accountsConfigured }: LaunchInput): LaunchRoute | null {
  if (!accountsConfigured) return HOME_ROUTE;
  if (introSeen && consentsComplete) return HOME_ROUTE;
  switch (auth.status) {
    case 'loading':
      return null;
    case 'not_configured':
      return HOME_ROUTE;
    case 'ready':
      if (auth.restoredFrom === 'new' || auth.restoredFrom === 'session') {
        return byLocalFlags(introSeen, consentsComplete);
      }
      return HOME_ROUTE;
    case 'failed':
      if (auth.reason === 'blocked') return GATE_ROUTE;
      return auth.hasStoredToken === false ? byLocalFlags(introSeen, consentsComplete) : HOME_ROUTE;
  }
}

/**
 * An existing account whose local flags may have been lost (a reinstall, or no account system):
 * mark the intro seen and the consents complete, so no later launch sends it back through them.
 * A session restored from this install's own cache keeps its flags as they are.
 */
export function shouldMarkOnboardedOnLaunch(auth: AuthBootstrapState): boolean {
  switch (auth.status) {
    case 'loading':
      return false;
    case 'not_configured':
      return true;
    case 'ready':
      return auth.restoredFrom !== 'new' && auth.restoredFrom !== 'session';
    case 'failed':
      return auth.reason !== 'blocked' && auth.hasStoredToken !== false;
  }
}
