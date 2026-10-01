import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { isAgeBlocked } from '../../features/consent/block-flag';
import { getRefreshTokenStore } from '../secure-storage/refresh-token-store';
import { getSupabase } from '../supabase';
import { ensureSession, type AuthBootstrapResult } from './bootstrap';

export type AuthBootstrapState = { status: 'loading' } | AuthBootstrapResult;

/**
 * Runs the first-launch flow once, and again each time the app comes to the foreground while the
 * last attempt failed (for example a reinstall on a plane). Mount it once, in the root layout.
 * One attempt is in flight at a time; a remount (Fast Refresh, StrictMode) joins it instead of
 * starting another or dropping its result.
 */
export function useAuthBootstrap(): AuthBootstrapState {
  const [state, setState] = useState<AuthBootstrapState>({ status: 'loading' });
  const latest = useRef<AuthBootstrapState>({ status: 'loading' });
  const mounted = useRef(false);
  const inFlight = useRef<Promise<AuthBootstrapResult> | null>(null);

  const run = useCallback(async (): Promise<void> => {
    // An install the 18+ gate blocked never gets an account (docs/11 §5, D46): no ensureSession,
    // so no anonymous sign-up, and no retry on the next foreground.
    if (isAgeBlocked()) {
      const blocked: AuthBootstrapResult = { status: 'failed', reason: 'blocked' };
      if (mounted.current) {
        latest.current = blocked;
        setState(blocked);
      }
      return;
    }
    inFlight.current ??= ensureSession(getSupabase(), getRefreshTokenStore())
      // A thrown error (a Keystore that cannot encrypt, a bug) must never leave the app on "loading".
      // Whether a token is stored is then unknown, so the field stays absent (never `false`): the
      // launch route treats unknown as an existing account and never replays the intro (M2-01).
      .catch((): AuthBootstrapResult => ({ status: 'failed', reason: 'server' }))
      .finally(() => {
        inFlight.current = null;
      });
    const result = await inFlight.current;
    if (mounted.current) {
      latest.current = result;
      setState(result);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void run();
    const subscription = AppState.addEventListener('change', (next) => {
      const last = latest.current;
      if (next === 'active' && last.status === 'failed' && last.reason !== 'blocked') void run();
    });
    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, [run]);

  return state;
}
