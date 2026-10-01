import { getLocales } from 'expo-localization';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { fontFamily, Text } from '../../components/Text';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n/useT';
import { linesFor, type HelpLine } from './resources';

/** The device's country, used only to put its lines first; never stored or sent. */
function deviceRegion(): string | null {
  return getLocales()[0]?.regionCode ?? null;
}

/** Help lines as tappable rows: the device's country first, each row dials (or opens) the line. */
export function HelpLineList({ lines }: { lines: readonly HelpLine[] }) {
  const { t } = useT();
  const { colors, radius, space } = useTheme();

  return (
    <View style={{ gap: space[2] }}>
      {linesFor(lines, deviceRegion()).map((line) => {
        const name = t(`resources.lines.${line.id}`);
        const countries = line.countries.map((country) => t(`resources.countries.${country}`)).join(', ');
        const label = line.phone
          ? t('resources.call', { name, number: line.display })
          : t('resources.open', { name });
        return (
          <Pressable
            key={line.id}
            testID={`help-line-${line.id}`}
            accessibilityRole="link"
            accessibilityLabel={label}
            onPress={() => void Linking.openURL(line.href).catch(() => undefined)}
            style={({ pressed }) => [
              styles.row,
              {
                gap: space[1],
                padding: space[3],
                borderRadius: radius.chip,
                borderColor: colors.line,
                backgroundColor: pressed ? colors.sageWash : colors.card,
              },
            ]}
          >
            <Text variant="body">{name}</Text>
            <Text variant="label" color="ink2">
              {countries}
            </Text>
            <Text variant="body" color="sageDeep" style={styles.number}>
              {line.display}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: StyleSheet.hairlineWidth * 2 },
  number: { fontFamily: fontFamily.sansMedium },
});
