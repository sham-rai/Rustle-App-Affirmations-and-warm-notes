import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View } from 'react-native';

import { useTheme } from '../../hooks/useTheme';

// The house mark (docs/20 §2.1): a folded note whose open corner reads as a leaf.
// PLACEHOLDER drawing until the designer's mark exists (docs/20 §14); the shapes are in a 40 × 40
// box so the real artwork can replace them one for one. Decorative: the wordmark carries the name.

const BOX = 40;
// The note: a sheet with its top-right corner folded down.
const NOTE = 'M7 5 H25 L35 15 V33 Q35 35 33 35 H7 Q5 35 5 33 V7 Q5 5 7 5 Z';
// The fold, shaped as a leaf: two soft curves from the corner of the fold to the note's edge.
const FOLD = 'M25 5 C23.5 10 26.5 15.5 35 15 C31.5 12.5 28 9 25 5 Z';
// The leaf's midrib.
const RIB = 'M25.8 6.5 Q28.5 12 33.5 14.6';

export function FoldedNoteMark({ size = 44 }: { size?: number }) {
  const { colors } = useTheme();
  const paths = useMemo(
    () => ({
      note: Skia.Path.MakeFromSVGString(NOTE),
      fold: Skia.Path.MakeFromSVGString(FOLD),
      rib: Skia.Path.MakeFromSVGString(RIB),
    }),
    [],
  );
  const scale = size / BOX;

  return (
    <View
      style={{ width: size, height: size }}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Canvas style={{ width: size, height: size }}>
        {paths.note && (
          <Path path={paths.note} transform={[{ scale }]} color={colors.card} style="fill" />
        )}
        {paths.note && (
          <Path
            path={paths.note}
            transform={[{ scale }]}
            color={colors.sage}
            style="stroke"
            strokeWidth={1.75}
            strokeJoin="round"
          />
        )}
        {paths.fold && <Path path={paths.fold} transform={[{ scale }]} color={colors.sage} style="fill" />}
        {paths.rib && (
          <Path
            path={paths.rib}
            transform={[{ scale }]}
            color={colors.sageWash}
            style="stroke"
            strokeWidth={0.8}
            strokeCap="round"
          />
        )}
      </Canvas>
    </View>
  );
}
