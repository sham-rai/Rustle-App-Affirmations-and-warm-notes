import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getRefreshTokenStore } from '../secure-storage/refresh-token-store';
import { getSupabase } from '../supabase';
import { ensureSession, type AuthBootstrapResult } from './bootstrap';

export type AuthBootstrapState = { status: 'loading' } | AuthBootstrapResult;

/**
 * Runs the first-launch flow once, and again each time the app comes to the foreground while the
 * last attempt failed (for example a reinstall on a plane). Mount it once, in the root layout.
 */
export function useAuthBootstrap(): AuthBootstrapState {
  const [state, setState] = useState<AuthBootstrapState>({ status: 'loading' });
  const running = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      if (running.current) return;
      running.current = true;
      try {
        const result = await ensureSession(getSupabase(), getRefreshTokenStore());
        if (!cancelled) setState(result);
      } finally {
        running.current = false;
      }
    };

    void run();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        setState((previous) => {
          if (previous.status === 'failed') void run();
          return previous;
        });
      }
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return state;
}
