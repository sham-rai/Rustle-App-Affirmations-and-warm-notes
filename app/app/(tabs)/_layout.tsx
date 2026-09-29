import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { textStyleFor } from '../../components/Text';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n/useT';

// Three tabs (docs/05 §1). No icon set is installed yet, so the bar is labels only.
// The bar grows with the system font scale so French labels never truncate (docs/21 §17.4).

const UIKIT_TAB_BAR_HEIGHT = 49;

export default function TabLayout() {
  const { t } = useT();
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();

  const label = textStyleFor('label');
  const labelHeight = Math.ceil((label.lineHeight ?? 0) * fontScale) + space[2] * 2;
  const barHeight = Math.max(UIKIT_TAB_BAR_HEIGHT, labelHeight) + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.paper },
        tabBarActiveTintColor: colors.sage,
        tabBarInactiveTintColor: colors.ink2,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: barHeight,
        },
        tabBarAllowFontScaling: true,
        tabBarLabelStyle: label,
        tabBarItemStyle: { justifyContent: 'center' },
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="today" options={{ title: t('tabs.today.title') }} />
      <Tabs.Screen name="notes" options={{ title: t('tabs.notes.title') }} />
      <Tabs.Screen name="you" options={{ title: t('tabs.you.title') }} />
    </Tabs>
  );
}
