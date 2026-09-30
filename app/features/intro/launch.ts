import type { AuthBootstrapState } from '../../lib/auth';

// Where a cold start at "/" goes (docs/05 §2, docs/21 §1.0, D46). Pure, so it is tested alone.

export const INTRO_ROUTE = '/splash';
export const HOME_ROUTE = '/today';

export type LaunchRoute = typeof INTRO_ROUTE | typeof HOME_ROUTE;

export type LaunchInput = {
  readonly auth: AuthBootstrapState;
  readonly introSeen: boolean;
  /** False when no Supabase project is configured: there is no account to create, so no intro. */
  readonly accountsConfigured: boolean;
};

/**
 * - The intro was already passed on this install → Today, straight away.
 * - No Supabase project (tests, a build without app/.env.local) → Today.
 * - The session is still being established → null: keep the native splash up and wait.
 * - A session that was restored (cache, Keychain, Keystore, Block Store) → Today.
 * - A freshly created anonymous account → the intro.
 * - No account could be established but a refresh token is stored (a reinstall opened offline
 *   or during a server error: Keychain / Block Store survive, MMKV does not) → Today; the app runs
 *   in its cached or empty state until the refresh succeeds.
 * - No account and no stored token (a true first launch offline) → the intro.
 */
export function launchRoute({ auth, introSeen, accountsConfigured }: LaunchInput): LaunchRoute | null {
  if (introSeen || !accountsConfigured) return HOME_ROUTE;
  switch (auth.status) {
    case 'loading':
      return null;
    case 'not_configured':
      return HOME_ROUTE;
    case 'ready':
      return auth.restoredFrom === 'new' ? INTRO_ROUTE : HOME_ROUTE;
    case 'failed':
      return auth.hasStoredToken === true ? HOME_ROUTE : INTRO_ROUTE;
  }
}

/** A restored session counts as "seen", so a later launch never shows the intro to this user. */
export function shouldMarkSeenOnLaunch(auth: AuthBootstrapState): boolean {
  return auth.status === 'ready' && auth.restoredFrom !== 'new';
}
