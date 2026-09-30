import { Canvas, Picture } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { useTheme } from '../../../hooks/useTheme';
import { drawTree, type TreeColors } from './draw';
import { buildTree, STILL_TIME, TREE_MOODS, type TreeIntensity } from './maths';

export type TreeProps = {
  /** `full` on the Rustle screen; `quiet` behind the age gate and consent (M1-09). */
  intensity?: TreeIntensity;
  style?: StyleProp<ViewStyle>;
};

/**
 * The tree at the edge of the screen (docs/05 §2). Decorative: hidden from screen readers and
 * never takes touches. Fills its parent; lay it out with absolute fill behind the content.
 * With reduce-motion on, it is drawn once, still, and the frame callback never runs.
 */
export function Tree({ intensity = 'full', style }: TreeProps) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const tree = useMemo(() => buildTree(width, height), [width, height]);
  const mood = TREE_MOODS[intensity];
  const treeColors = useMemo<TreeColors>(() => ({ ink: colors.ink, sage: colors.sage }), [colors.ink, colors.sage]);

  const time = useSharedValue(STILL_TIME);
  const clock = useFrameCallback((frame) => {
    time.value = STILL_TIME + frame.timeSinceFirstFrame / 1000;
  }, false);

  useEffect(() => {
    clock.setActive(!reduceMotion);
    return () => clock.setActive(false);
  }, [clock, reduceMotion]);

  const animate = !reduceMotion;
  const picture = useDerivedValue(() => drawTree(tree, time.value, mood, treeColors, animate));

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
