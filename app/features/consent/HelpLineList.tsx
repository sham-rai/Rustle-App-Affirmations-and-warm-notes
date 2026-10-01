import { getLocales } from 'expo-localization';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { fontFamily, Text } from '../../components/Text';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n/useT';
import { linesFor, type HelpLine } from './resources';

/** The device's country, used only to put its lines first; never stored or sent. */
function deviceRegion(): string | null {
  return getLocales()[0]?.regionCode ?? null;
}

/**
 * Opens the line, or resolves false when this device cannot (a tablet or a phone with no calling).
 * canOpenURL is asked on Android only: on iOS it answers false for any scheme missing from
 * LSApplicationQueriesSchemes, which would hide a call that works; there the openURL rejection
 * is the signal.
 */
async function openLine(href: string): Promise<boolean> {
  try {
    if (Platform.OS === 'android' && !(await Linking.canOpenURL(href))) return false;
    await Linking.openURL(href);
    return true;
  } catch {
    return false;
  }
}

/**
 * Help lines as tappable rows: the device's country first, each row dials (or opens) the line.
 * When the device cannot, the row says so and the number becomes selectable text to dial elsewhere.
 */
export function HelpLineList({ lines }: { lines: readonly HelpLine[] }) {
  const { t } = useT();
  const { colors, radius, space } = useTheme();
  const [unreachable, setUnreachable] = useState<ReadonlySet<string>>(() => new Set());

  const onPress = async (line: HelpLine) => {
    if (await openLine(line.href)) return;
    setUnreachable((current) => new Set(current).add(line.id));
  };

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
            onPress={() => void onPress(line)}
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
            <Text variant="body" color="sageDeep" style={styles.number} selectable={unreachable.has(line.id)}>
              {line.display}
            </Text>
            {unreachable.has(line.id) ? (
              <Text variant="label" color="ink2" testID={`help-line-${line.id}-fallback`}>
                {line.phone
                  ? t('resources.dialIt', { number: line.display })
                  : t('resources.visitIt', { address: line.display })}
              </Text>
            ) : null}
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
