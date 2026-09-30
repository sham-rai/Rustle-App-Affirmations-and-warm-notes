import {
  createPicture,
  PaintStyle,
  Skia,
  StrokeCap,
  type SkCanvas,
  type SkPaint,
  type SkPath,
  type SkPicture,
} from '@shopify/react-native-skia';

import {
  attachedLeafPresence,
  fallingLeaf,
  fallsAt,
  leafAtTime,
  leafPlacement,
  poseAt,
  type Tree,
  type TreeMood,
} from './maths';

// Records one frame of the tree as a single Skia Picture: trunk, branches and every leaf in one
// recording (never one component per leaf). Runs on the UI thread inside useDerivedValue.

const RAD_TO_DEG = 180 / Math.PI;

/** Colours arrive as token strings from the theme; this file never names a colour itself. */
export type TreeColors = { readonly ink: string; readonly sage: string };

/**
 * The Skia objects every frame reuses: made once per theme (makeTreeKit, JS thread) and only
 * mutated (stroke width, alpha) while recording on the UI thread. Nothing is allocated per frame
 * except the pose arrays.
 */
export type TreeKit = {
  readonly branchPaint: SkPaint;
  readonly layerPaint: SkPaint;
  readonly leafPaint: SkPaint;
  readonly leafPath: SkPath;
};

export function makeTreeKit(colors: TreeColors, mood: TreeMood): TreeKit {
  const branchPaint = Skia.Paint();
  branchPaint.setAntiAlias(true);
  branchPaint.setStyle(PaintStyle.Stroke);
  branchPaint.setStrokeCap(StrokeCap.Round);
  branchPaint.setColor(Skia.Color(colors.ink));

  const layerPaint = Skia.Paint();
  layerPaint.setAlphaf(mood.branchAlpha);

  const leafPaint = Skia.Paint();
  leafPaint.setAntiAlias(true);
  leafPaint.setColor(Skia.Color(colors.sage));

  // A leaf of length 1 pointing along +x from its stem: two soft curves.
  const leafPath = Skia.Path.Make();
  leafPath.moveTo(0, 0);
  leafPath.quadTo(0.45, -0.3, 1, 0);
  leafPath.quadTo(0.45, 0.3, 0, 0);
  leafPath.close();

  return { branchPaint, layerPaint, leafPaint, leafPath };
}

type LeafAt = { x: number; y: number; angle: number };

function drawLeaf(canvas: SkCanvas, path: SkPath, paint: SkPaint, at: LeafAt, size: number, twist: number) {
  'worklet';
  canvas.save();
  canvas.translate(at.x, at.y);
  canvas.rotate(at.angle * RAD_TO_DEG, 0, 0);
  // `twist` narrows the leaf a little as it turns in the wind, which reads as flutter.
  canvas.scale(size, size * twist);
  canvas.drawPath(path, paint);
  canvas.restore();
}

/** One frame of the tree at time `t`. `animate` false draws the still tree (no falling leaves). */
export function drawTree(tree: Tree, t: number, mood: TreeMood, kit: TreeKit, animate: boolean): SkPicture {
  'worklet';
  return createPicture((canvas) => {
    const motion = animate ? mood.motion : 0;
    const pose = poseAt(tree, t, motion);
    const { branchPaint, layerPaint, leafPaint, leafPath } = kit;

    // Branches: drawn opaque into a layer, then the whole layer is faded, so overlapping joints
    // do not darken. Round caps keep the ends soft.
    canvas.saveLayer(layerPaint);
    for (let i = 0; i < tree.branches.length; i++) {
      branchPaint.setStrokeWidth(Math.max(0.75, tree.branches[i]!.thickness));
      canvas.drawLine(pose.x0[i]!, pose.y0[i]!, pose.x1[i]!, pose.y1[i]!, branchPaint);
    }
    canvas.restore();

    const falls = animate && mood.falling ? fallsAt(t, tree.leaves.length) : [];

    for (let j = 0; j < tree.leaves.length; j++) {
      const leaf = tree.leaves[j]!;
      const presence = falls.length > 0 ? attachedLeafPresence(j, falls) : 1;
      if (presence <= 0) continue;
      const at = leafPlacement(tree, pose, leaf, t, motion);
      const twist = 1 - 0.25 * motion * (0.5 + 0.5 * Math.sin(Math.PI * 2 * leaf.freq * 1.3 * t + leaf.phase));
      leafPaint.setAlphaf(mood.leafAlpha * leaf.alpha * presence);
      drawLeaf(canvas, leafPath, leafPaint, at, leaf.size, twist);
    }

    // The one or two leaves in flight.
    for (const fall of falls) {
      if (fall.elapsed <= 0) continue;
      const leaf = tree.leaves[fall.leaf]!;
      const start = leafAtTime(tree, fall.leaf, fall.releasedAt, motion);
      const now = fallingLeaf(start, fall.elapsed, tree.fallDistance);
      if (now.opacity <= 0) continue;
      leafPaint.setAlphaf(mood.leafAlpha * leaf.alpha * now.opacity);
      drawLeaf(canvas, leafPath, leafPaint, now, leaf.size, 1);
    }
  });
}
