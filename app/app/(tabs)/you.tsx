import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../../components/Text';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n/useT';

// Empty for now: the title and one line of empty-state copy (M1-04).
export default function YouScreen() {
  const { t } = useT();
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space[5], paddingHorizontal: space[4], gap: space[2] }]}
    >
      <Text variant="title" accessibilityRole="header">
        {t('tabs.you.title')}
      </Text>
      <Text variant="body" color="ink2">
        {t('tabs.you.empty')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
});
