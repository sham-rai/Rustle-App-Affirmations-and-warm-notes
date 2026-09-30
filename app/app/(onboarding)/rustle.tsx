import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamily, Text } from '../../components/Text';
import { FoldedNoteMark } from '../../features/intro/FoldedNoteMark';
import { markIntroSeen } from '../../features/intro/intro-seen';
import {
  CONTENT_DELAY_MS,
  CONTENT_FADE_MS,
  CONTENT_RISE,
  EASE,
  STAGE_FADE_MS,
} from '../../features/intro/timing';
import { Tree } from '../../features/intro/tree/Tree';
import { useReduceMotion } from '../../features/intro/useReduceMotion';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../i18n/useT';

const WORDMARK_SIZE = 44;
const WORDMARK_TRACKING = 1.5;
const PRIMARY_HEIGHT = 52;

/**
 * Beats 2 and 3 of the first launch (docs/05 §2, docs/21 §1.1). The tree, the mark and the
 * wordmark are there from the first frame (the whole stage fades in from the splash); after one
 * second the headline, sub, buttons and footer fade up together in one 400 ms fade.
 */
export default function RustleScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors, space, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const [stage] = useState(() => new Animated.Value(0));
  const [content] = useState(() => new Animated.Value(0));
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const sequence = Animated.parallel([
      Animated.timing(stage, { toValue: 1, duration: STAGE_FADE_MS, easing: EASE, useNativeDriver: true }),
      Animated.timing(content, {
        toValue: 1,
        duration: CONTENT_FADE_MS,
        delay: CONTENT_DELAY_MS,
        easing: EASE,
        useNativeDriver: true,
      }),
    ]);
    // Content becomes reachable (touch, screen reader) as its fade starts, not before.
    const reveal = setTimeout(() => setRevealed(true), CONTENT_DELAY_MS);
    sequence.start();
    return () => {
      clearTimeout(reveal);
      sequence.stop();
    };
  }, [stage, content]);

  const rise = content.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : CONTENT_RISE, 0] });

  const onBegin = () => {
    markIntroSeen();
    // TODO(M1-09): Begin leads to the 18+ gate and consent; until they exist it opens Today.
    router.replace('/today');
  };

  return (
    <Animated.View style={[styles.screen, { backgroundColor: colors.paper, opacity: stage }]}>
      <Tree intensity="full" reduceMotion={reduceMotion} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + space[6],
            paddingBottom: insets.bottom + space[4],
            paddingHorizontal: space[5],
          },
        ]}
      >
        <View style={[styles.stage, { gap: space[3] }]}>
          <FoldedNoteMark />
          <Text
            variant="noteHero"
            accessibilityRole="header"
            accessibilityLabel={t('intro.wordmarkLabel')}
            style={styles.wordmark}
          >
            {t('intro.wordmark')}
          </Text>
        </View>

        <Animated.View
          testID="intro-content"
          pointerEvents={revealed ? 'auto' : 'none'}
          accessibilityElementsHidden={!revealed}
          importantForAccessibility={revealed ? 'auto' : 'no-hide-descendants'}
          style={[styles.content, { opacity: content, transform: [{ translateY: rise }], gap: space[5] }]}
        >
          <View style={{ gap: space[2] }}>
            <Text variant="title" style={styles.centred}>
              {t('intro.headline')}
            </Text>
            <Text variant="body" color="ink2" style={styles.centred}>
              {t('intro.sub')}
            </Text>
          </View>

          <View style={{ gap: space[2] }}>
            <Pressable
              accessibilityRole="button"
              onPress={onBegin}
              style={({ pressed }) => [
                styles.primary,
                { backgroundColor: pressed ? colors.sageDeep : colors.sage, borderRadius: radius.chip },
              ]}
            >
              <Text variant="body" color="card" style={{ fontFamily: fontFamily.sansMedium }}>
                {t('common.begin')}
              </Text>
            </Pressable>
            {/* TODO(M2 account linking): "I already have an account" (intro.haveAccount) goes here. */}
          </View>

          <View style={{ gap: space[1] }}>
            {/* TODO(M1-09): the crisis line with its "get help now" link (intro.crisis, split with
                features/intro/link-text) replaces this sentence once the crisis resources exist. */}
            <Text variant="label" color="ink2" style={styles.centred}>
              {t('intro.notMedical')}
            </Text>
            <Text variant="label" color="ink2" style={styles.centred}>
              {t('intro.aiDisclosure')}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  wordmark: { fontSize: WORDMARK_SIZE, lineHeight: WORDMARK_SIZE * 1.25, letterSpacing: WORDMARK_TRACKING },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  centred: { textAlign: 'center' },
  primary: { minHeight: PRIMARY_HEIGHT, alignItems: 'center', justifyContent: 'center' },
});
