import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { isAgeBlocked, isConsentsComplete } from '../features/consent/onboarding-flags';
import { fetchOnboardingState, markOnboarded, onboardingRoute, type OnboardingRoute } from '../features/consent/onboarding-state';
import { CompanySplashView } from '../features/intro/CompanySplashView';
import { isIntroSeen } from '../features/intro/intro-seen';
import { CHECK_SERVER, HOME_ROUTE, launchRoute } from '../features/intro/launch';
import { useAuth } from '../lib/auth';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Asks the server where onboarding stands. Today caches "done" in the local flags; a failed read
 * goes to Today without setting them, so the next launch asks again.
 */
async function resolveFromServer(): Promise<OnboardingRoute> {
  const result = await fetchOnboardingState(getSupabase()).catch(() => null);
  if (!result?.ok || !result.state) return HOME_ROUTE;
  const route = onboardingRoute(result.state);
  if (route === HOME_ROUTE) markOnboarded();
  return route;
}

// "/" opens on Today, on the company splash and the Rustle screen for a freshly created account,
// on the 18+ block screen for a blocked install, or wherever the server says an unfinished
// onboarding stands (docs/05 §2, docs/21 §1.0–1.3, D46). While the session is still being
// established the native splash stays up (see the root layout, capped at a few seconds); behind
// it, after the cap and while the server is asked, "/" shows the same paper and company name as
// the company splash, never a blank screen.
export default function Index() {
  const auth = useAuth();
  const decision = launchRoute({
    auth,
    introSeen: isIntroSeen(),
    consentsComplete: isConsentsComplete(),
    accountsConfigured: isSupabaseConfigured(),
    blocked: isAgeBlocked(),
  });
  const [checked, setChecked] = useState<OnboardingRoute | null>(null);

  // Resolved once per launch: the decision only becomes CHECK_SERVER when the session is ready.
  useEffect(() => {
    if (decision !== CHECK_SERVER) return;
    let active = true;
    void resolveFromServer().then((route) => {
      if (active) setChecked(route);
    });
    return () => {
      active = false;
    };
  }, [decision]);

  if (decision === null) return <CompanySplashView />;
  if (decision === CHECK_SERVER) return checked === null ? <CompanySplashView /> : <Redirect href={checked} />;
  return <Redirect href={decision} />;
}
