import { Canvas, Picture } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useFrameCallback, useSharedValue, type FrameInfo } from 'react-native-reanimated';

import { useTheme } from '../../../hooks/useTheme';
import { drawTree, makeTreeKit } from './draw';
import { buildTree, STILL_TIME, TREE_MOODS, type TreeIntensity } from './maths';

export type TreeProps = {
  /**
   * The system reduce-motion setting, from the screen's live hook (features/intro/useReduceMotion),
   * so the tree and the screen's fades always agree. True: the tree is drawn once, still.
   */
  reduceMotion: boolean;
  /** `full` on the Rustle screen; `quiet` behind the age gate and consent (M1-09). */
  intensity?: TreeIntensity;
  style?: StyleProp<ViewStyle>;
};

/**
 * The tree at the edge of the screen (docs/05 §2). Decorative: hidden from screen readers and
 * never takes touches. Fills its parent; lay it out with absolute fill behind the content.
 */
export function Tree({ reduceMotion, intensity = 'full', style }: TreeProps) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();

  const tree = useMemo(() => buildTree(width, height), [width, height]);
  const mood = TREE_MOODS[intensity];
  // Paints and the leaf path are made once per theme and mood, never per frame.
  const kit = useMemo(() => makeTreeKit({ ink: colors.ink, sage: colors.sage }, mood), [colors.ink, colors.sage, mood]);

  const time = useSharedValue(STILL_TIME);
  // Stable across renders, so useFrameCallback registers it once (it re-registers on a new identity).
  const tick = useCallback(
    (frame: FrameInfo) => {
      'worklet';
      time.set(STILL_TIME + frame.timeSinceFirstFrame / 1000);
    },
    [time],
  );
  const clock = useFrameCallback(tick, false);

  useEffect(() => {
    clock.setActive(!reduceMotion);
    return () => clock.setActive(false);
  }, [clock, reduceMotion]);

  const animate = !reduceMotion;
  const picture = useDerivedValue(() => drawTree(tree, time.get(), mood, kit, animate));

  return (
    <View
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}
