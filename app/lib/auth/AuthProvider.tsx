import { createContext, use, type ReactNode } from 'react';

import { useAuthBootstrap, type AuthBootstrapState } from './useAuthBootstrap';

const AuthContext = createContext<AuthBootstrapState>({ status: 'loading' });
const AuthRetryContext = createContext<() => Promise<void>>(() => Promise.resolve());

/** Runs the first-launch flow once for the whole app and shares its state (M1-03). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { state, retry } = useAuthBootstrap();
  return (
    <AuthRetryContext value={retry}>
      <AuthContext value={state}>{children}</AuthContext>
    </AuthRetryContext>
  );
}

export function useAuth(): AuthBootstrapState {
  return use(AuthContext);
}

/**
 * Re-runs the bootstrap, for a screen that found no session (offline at first launch, M1-09).
 * Kept apart from useAuth() so the state's consumers do not change.
 */
export function useAuthRetry(): () => Promise<void> {
  return use(AuthRetryContext);
}
