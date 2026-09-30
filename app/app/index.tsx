import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { isIntroSeen, markIntroSeen } from '../features/intro/intro-seen';
import { launchRoute, shouldMarkSeenOnLaunch } from '../features/intro/launch';
import { useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

// "/" opens on Today, or on the company splash and the Rustle screen for a freshly created
// account (docs/05 §2, D46). While the session is still being established it renders nothing:
// the native splash stays up (see the root layout).
export default function Index() {
  const auth = useAuth();
  const route = launchRoute({ auth, introSeen: isIntroSeen(), accountsConfigured: isSupabaseConfigured() });

  useEffect(() => {
    if (shouldMarkSeenOnLaunch(auth)) markIntroSeen();
  }, [auth]);

  if (route === null) return null;
  return <Redirect href={route} />;
}
