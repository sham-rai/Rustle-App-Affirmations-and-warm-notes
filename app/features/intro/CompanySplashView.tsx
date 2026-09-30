import { Animated, StyleSheet } from 'react-native';

import { Text } from '../../components/Text';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n/useT';

/**
 * The company name, small and centred on paper (docs/05 §2, beat 1). Used by the company splash
 * (with `opacity` for its fade out) and by "/" while the session is still being established, so
 * the hand-off from the native splash is never a blank screen.
 */
export function CompanySplashView({ opacity }: { opacity?: Animated.Value }) {
  const { t } = useT();
  const { colors } = useTheme();
  return (
    <Animated.View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Animated.View style={opacity ? { opacity } : undefined}>
        <Text variant="label" color="ink2" accessibilityRole="header">
          {t('intro.company')}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
