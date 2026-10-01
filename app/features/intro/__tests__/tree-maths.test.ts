import {
  attachedLeafPresence,
  branchSway,
  buildTree,
  FALL,
  fallingLeaf,
  fallsAt,
  gust,
  leafAtTime,
  leafPlacement,
  poseAt,
  STILL_TIME,
  TREE_MOODS,
  TREE_SHAPE,
} from '../tree/maths';

const W = 390;
const H = 844;
const tree = buildTree(W, H);
const FULL = TREE_MOODS.full.motion;

describe('buildTree', () => {
  it('is deterministic: the same tree on every launch', () => {
    expect(buildTree(W, H)).toEqual(tree);
  });

  it('puts parents before children and keeps flex in [0, 1]', () => {
    tree.branches.forEach((branch, i) => {
      expect(branch.parent).toBeLessThan(i);
      expect(branch.flex).toBeGreaterThanOrEqual(0);
      expect(branch.flex).toBeLessThanOrEqual(1);
    });
    expect(tree.branches[0]?.parent).toBe(-1);
  });

  it('has a canopy, capped for the per-frame cost', () => {
    expect(tree.leaves.length).toBeGreaterThan(60);
    expect(tree.leaves.length).toBeLessThanOrEqual(TREE_SHAPE.maxLeaves);
    for (const leaf of tree.leaves) expect(tree.branches[leaf.branch]).toBeDefined();
  });

  it('stands at the right edge of the screen', () => {
    expect(tree.rootX).toBeGreaterThan(W * 0.85);
    const pose = poseAt(tree, STILL_TIME, 0);
    const tips = pose.x1.filter((_, i) => tree.branches[i]?.depth === TREE_SHAPE.maxDepth);
    // Most of the canopy reaches into the screen but none of it wanders past the far edge.
    expect(Math.min(...tips)).toBeGreaterThan(-W * 0.1);
  });
});

describe('wind and sway', () => {
  it('stays gentle: the gust never exceeds 1', () => {
    for (let t = 0; t < 120; t += 0.25) expect(Math.abs(gust(t))).toBeLessThanOrEqual(1);
  });

  it('moves the tips more than the trunk', () => {
    const trunk = tree.branches[0]!;
    const tip = tree.branches.find((b) => b.depth === TREE_SHAPE.maxDepth)!;
    let trunkMax = 0;
    let tipMax = 0;
    for (let t = 0; t < 60; t += 0.5) {
      trunkMax = Math.max(trunkMax, Math.abs(branchSway(trunk, t, FULL)));
      tipMax = Math.max(tipMax, Math.abs(branchSway(tip, t, FULL)));
    }
    expect(trunkMax).toBe(0);
    expect(tipMax).toBeGreaterThan(0.01);
    expect(tipMax).toBeLessThan(0.1); // slow and small, never sharp
  });

  it('holds still with no motion (reduce-motion)', () => {
    expect(poseAt(tree, 0, 0)).toEqual(poseAt(tree, 37.5, 0));
  });

  it('moves smoothly from one frame to the next', () => {
    const dt = 1 / 60;
    for (let t = 0; t < 30; t += 1.7) {
      const a = poseAt(tree, t, FULL);
      const b = poseAt(tree, t + dt, FULL);
      a.x1.forEach((x, i) => expect(Math.abs(x - b.x1[i]!)).toBeLessThan(1.5));
    }
  });
});

describe('a leaf letting go', () => {
  const minute = Array.from({ length: 600 }, (_, i) => i / 10);

  it('happens now and then, never in the first cycle, one or two at a time', () => {
    const releases = new Set<number>();
    for (const t of minute) {
      const falls = fallsAt(t, tree.leaves.length);
      expect(falls.length).toBeLessThanOrEqual(3);
      for (const fall of falls) releases.add(fall.releasedAt);
      if (t < FALL.cycle * FALL.firstCycle) expect(falls).toEqual([]);
    }
    expect(releases.size).toBeGreaterThanOrEqual(3);
    expect(releases.size).toBeLessThanOrEqual(10);
  });

  it('leaves an empty spot that fills in again', () => {
    const t = minute.find((time) => fallsAt(time, tree.leaves.length).some((f) => f.elapsed < 1))!;
    const fall = fallsAt(t, tree.leaves.length).find((f) => f.elapsed < 1)!;
    expect(attachedLeafPresence(fall.leaf, [fall])).toBe(0);
    const later = { ...fall, elapsed: FALL.duration + FALL.regrow };
    expect(attachedLeafPresence(fall.leaf, [later])).toBe(1);
  });

  it('starts where the leaf was, drifts down and fades out', () => {
    const start = leafAtTime(tree, 0, 10, FULL);
    const pose = poseAt(tree, 10, FULL);
    const placed = leafPlacement(tree, pose, tree.leaves[0]!, 10, FULL);
    expect(start.x).toBeCloseTo(placed.x, 6);
    expect(start.y).toBeCloseTo(placed.y, 6);
    expect(start.angle).toBeCloseTo(placed.angle, 6);

    const begin = fallingLeaf(start, 0, tree.fallDistance);
    const mid = fallingLeaf(start, FALL.duration / 2, tree.fallDistance);
    const end = fallingLeaf(start, FALL.duration, tree.fallDistance);
    expect(begin.y).toBeCloseTo(start.y, 6);
    expect(begin.opacity).toBe(1);
    expect(mid.y).toBeGreaterThan(start.y);
    expect(end.y).toBeCloseTo(start.y + tree.fallDistance, 3);
    expect(end.opacity).toBe(0);
  });
});
