import { Redirect, Stack, useSegments } from 'expo-router';

import { isConsentsComplete } from '../../features/consent/onboarding-flags';
import { useTheme } from '../../hooks/useTheme';

/** Reachable whatever the onboarding state: crisis resources are never conditional (CLAUDE.md). */
const ALWAYS_OPEN = new Set(['help']);

// The first-launch sequence (docs/05 §2). The screens run their own fades, so the stack adds no
// transition of its own, and there is no swipe back to the splash.
// Every route here also opens from a rustle:// deep link: once onboarding is done on this install,
// the intro, the gate and the consent screens redirect to Today, so a link can never re-run them
// (or reach the decline path that deletes the account).
export default function OnboardingLayout() {
  const { colors } = useTheme();
  const segments: readonly string[] = useSegments();
  const screen = segments[1];
  if (isConsentsComplete() && !(screen !== undefined && ALWAYS_OPEN.has(screen))) {
    return <Redirect href="/today" />;
  }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        gestureEnabled: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    />
  );
}
