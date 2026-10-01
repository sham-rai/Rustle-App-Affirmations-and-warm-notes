import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../../components/Text';
import { useTheme } from '../../hooks/useTheme';
import { Tree } from '../intro/tree/Tree';
import { useReduceMotion } from '../intro/useReduceMotion';

export type OnboardingPageProps = {
  title: string;
  /** A small line above the title, such as "Step 1 of 3". */
  eyebrow?: string;
  children?: ReactNode;
  /** Buttons, pinned under the content in the scroll so long French text never hides them. */
  actions?: ReactNode;
  /** Small print under the actions (the AI disclosure, docs/21 §1.4). */
  footer?: ReactNode;
  /** The quiet tree from the Rustle screen; off for the help pages, which stay plain. */
  tree?: boolean;
};

/** The page shared by the age gate, the consent steps and the help pages. */
export function OnboardingPage({ title, eyebrow, children, actions, footer, tree = true }: OnboardingPageProps) {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      {tree ? <Tree intensity="quiet" reduceMotion={reduceMotion} /> : null}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + space[6],
            paddingBottom: insets.bottom + space[4],
            paddingHorizontal: space[5],
          },
        ]}
      >
        <View style={[styles.column, { gap: space[5] }]}>
          <View style={{ gap: space[2] }}>
            {eyebrow ? (
              <Text variant="label" color="ink2">
                {eyebrow}
              </Text>
            ) : null}
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
          </View>
          {children}
        </View>
        <View style={[styles.column, styles.bottom, { gap: space[3], paddingTop: space[5] }]}>
          {actions}
          {footer}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  column: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  bottom: { marginTop: 'auto' },
});
