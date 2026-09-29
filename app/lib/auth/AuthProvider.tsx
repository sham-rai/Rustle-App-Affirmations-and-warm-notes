import { createContext, use, type ReactNode } from 'react';

import { useAuthBootstrap, type AuthBootstrapState } from './useAuthBootstrap';

const AuthContext = createContext<AuthBootstrapState>({ status: 'loading' });

/** Runs the first-launch flow once for the whole app and shares its state (M1-03). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const state = useAuthBootstrap();
  return <AuthContext value={state}>{children}</AuthContext>;
}

export function useAuth(): AuthBootstrapState {
  return use(AuthContext);
}
