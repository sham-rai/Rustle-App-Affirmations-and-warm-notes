import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { fontFamily, Text } from '../../components/Text';
import { useTheme } from '../../hooks/useTheme';

// docs/20 §7.5: the primary is sage with white text; the secondary is ink on paper with a line
// border. Both are 52 pt tall, full width, in the same type: "Not now" is never the smaller choice.
const BUTTON_HEIGHT = 52;

export type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary';
  /** Shows a spinner and ignores presses while the action runs. */
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
};

export function Button({ label, onPress, kind = 'primary', busy = false, disabled = false, testID }: ButtonProps) {
  const { colors, radius, space } = useTheme();
  const primary = kind === 'primary';
  const inactive = busy || disabled;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderRadius: radius.chip,
          paddingHorizontal: space[4],
          backgroundColor: primary ? (pressed ? colors.sageDeep : colors.sage) : pressed ? colors.card : colors.paper,
          borderColor: primary ? colors.sage : colors.line,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? colors.card : colors.ink} />
      ) : (
        <Text variant="body" color={primary ? 'card' : 'ink'} style={styles.label}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: BUTTON_HEIGHT,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  label: { fontFamily: fontFamily.sansMedium, textAlign: 'center' },
});
