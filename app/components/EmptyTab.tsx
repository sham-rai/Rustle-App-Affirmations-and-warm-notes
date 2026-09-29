import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';
import { useT } from '../i18n/useT';
import { Text } from './Text';

export type TabName = 'today' | 'notes' | 'you';

/** A tab with nothing in it yet: its title and one line of empty-state copy (M1-04). */
export function EmptyTab({ tab }: { tab: TabName }) {
  const { t } = useT();
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space[5], paddingHorizontal: space[4], gap: space[2] },
      ]}
    >
      <Text variant="title" accessibilityRole="header">
        {t(`tabs.${tab}.title`)}
      </Text>
      <Text variant="body" color="ink2">
        {t(`tabs.${tab}.empty`)}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
});
