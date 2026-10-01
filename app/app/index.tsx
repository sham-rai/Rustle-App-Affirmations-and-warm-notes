import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { isAgeBlocked, isConsentsComplete, markConsentsComplete } from '../features/consent/onboarding-flags';
import { CompanySplashView } from '../features/intro/CompanySplashView';
import { isIntroSeen, markIntroSeen } from '../features/intro/intro-seen';
import { GATE_ROUTE, launchRoute, shouldMarkOnboardedOnLaunch } from '../features/intro/launch';
import { useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

// "/" opens on Today, on the company splash and the Rustle screen for a freshly created account,
// or on the 18+ gate for an install that stopped between Begin and the last consent (docs/05 §2,
// docs/21 §1.0–1.3, D46). While the session is still being established the native splash stays
// up (see the root layout, capped at a few seconds); behind it, and after the cap, "/" shows the
// same paper and company name as the company splash, never a blank screen.
export default function Index() {
  const auth = useAuth();
  const blocked = isAgeBlocked();
  const route = launchRoute({
    auth,
    introSeen: isIntroSeen(),
    consentsComplete: isConsentsComplete(),
    accountsConfigured: isSupabaseConfigured(),
  });

  useEffect(() => {
    if (!blocked && shouldMarkOnboardedOnLaunch(auth)) {
      markIntroSeen();
      markConsentsComplete();
    }
  }, [auth, blocked]);

  // An install the 18+ gate blocked goes back to the block screen before anything else.
  if (blocked) return <Redirect href={GATE_ROUTE} />;
  if (route === null) return <CompanySplashView />;
  return <Redirect href={route} />;
}
