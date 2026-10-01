import { Stack } from 'expo-router';

import { useTheme } from '../../hooks/useTheme';

// The first-launch sequence (docs/05 §2). The screens run their own fades, so the stack adds no
// transition of its own, and there is no swipe back to the splash.
export default function OnboardingLayout() {
  const { colors } = useTheme();
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
