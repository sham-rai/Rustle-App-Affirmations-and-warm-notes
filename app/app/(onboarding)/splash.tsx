import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Text } from '../../components/Text';
import { EASE, SPLASH_FADE_MS, SPLASH_MS } from '../../features/intro/timing';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n/useT';

/**
 * Beat 1 of the first launch (docs/05 §2): the company name, small and centred on paper, for about
 * two seconds, then a fade into the Rustle screen. No other motion. The same fade under
 * reduce-motion (it is already only a fade).
 */
export default function CompanySplash() {
  const router = useRouter();
  const { t } = useT();
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const fade = Animated.timing(opacity, {
      toValue: 0,
      duration: SPLASH_FADE_MS,
      delay: SPLASH_MS - SPLASH_FADE_MS,
      easing: EASE,
      useNativeDriver: true,
    });
    fade.start();
    // The route change keeps its own clock, so it never depends on an animation finishing.
    const next = setTimeout(() => router.replace('/rustle'), SPLASH_MS);
    return () => {
      clearTimeout(next);
      fade.stop();
    };
  }, [opacity, router]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Animated.View style={{ opacity }}>
        <Text variant="label" color="ink2" accessibilityRole="header">
          {t('intro.company')}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
