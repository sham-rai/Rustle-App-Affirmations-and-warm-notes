import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { CompanySplashView } from '../features/intro/CompanySplashView';
import { isIntroSeen, markIntroSeen } from '../features/intro/intro-seen';
import { launchRoute, shouldMarkSeenOnLaunch } from '../features/intro/launch';
import { useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

// "/" opens on Today, or on the company splash and the Rustle screen for a freshly created
// account (docs/05 §2, D46). While the session is still being established the native splash stays
// up (see the root layout, capped at a few seconds); behind it, and after the cap, "/" shows the
// same paper and company name as the company splash, never a blank screen.
export default function Index() {
  const auth = useAuth();
  const route = launchRoute({ auth, introSeen: isIntroSeen(), accountsConfigured: isSupabaseConfigured() });

  useEffect(() => {
    if (shouldMarkSeenOnLaunch(auth)) markIntroSeen();
  }, [auth]);

  if (route === null) return <CompanySplashView />;
  return <Redirect href={route} />;
}
