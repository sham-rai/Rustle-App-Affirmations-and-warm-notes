// The tree behind the Rustle screen: all of its maths in one place (docs/05 §2, docs/20 §6).
//
// DEVIATION (M2-01): the ticket names the style board's live intro example as the source of truth
// for these numbers, but that example is not in the repository. Everything below is written from
// the prose in docs/05 §2 and docs/20 §6 ("a tree at the edge of the screen: trunk and branches in
// soft ink, a canopy of small leaves in sage, all at low opacity; the leaves sway in slow,
// overlapping gusts and flutter on their own; the branches move a little more toward the tips;
// now and then a single leaf lets go and drifts down; nothing sharp or fast"). When the board's
// example lands, align the constants in TREE_SHAPE, WIND and FALL with it; the structure should
// not need to change.
//
// Two halves:
// 1. buildTree() runs once on the JS thread. It grows a deterministic tree (seeded, so every launch
//    shows the same tree) as flat arrays of numbers, which are cheap to share with a worklet.
// 2. Everything else is a pure function of time, marked 'worklet', and runs on the UI thread every
//    frame. Nothing keeps state between frames: the pose, the gusts and the falling leaves are all
//    computed from `t` (seconds). That makes the motion resumable, testable and identical on every
//    device, and it means reduce-motion is simply "draw t = STILL_TIME once".
//
// Coordinates are screen points, y pointing down. Angles are radians, 0 = pointing right,
// -PI/2 = pointing straight up.

/** One branch. Parents always come before their children in `branches`. */
export type Branch = {
  /** Index of the parent branch, or -1 for the trunk. */
  readonly parent: number;
  /** Where along the parent (0 = its base, 1 = its tip) this branch starts. */
  readonly along: number;
  /** Rest angle relative to the parent's angle (the trunk: absolute). */
  readonly relAngle: number;
  readonly length: number;
  /** Stroke width in points. */
  readonly thickness: number;
  readonly depth: number;
  /** 0 at the trunk, 1 at the outermost twigs: how much this branch feels the wind. */
  readonly flex: number;
  /** Seconds the gust takes to reach this branch from the trunk (gusts travel outward). */
  readonly delay: number;
  /** Phase of the branch's own slow sway, so neighbours never move in lockstep. */
  readonly phase: number;
};

/** One leaf, attached to a branch. */
export type Leaf = {
  readonly branch: number;
  /** Where along the branch the leaf sits (0..1). */
  readonly along: number;
  /** Rest angle relative to the branch. */
  readonly relAngle: number;
  /** Leaf length in points. */
  readonly size: number;
  /** Multiplier on the leaf opacity (0..1), so the canopy has depth. */
  readonly alpha: number;
  /** Flutter frequency in Hz (slow: 0.2–0.5 Hz, so nothing looks fast). */
  readonly freq: number;
  readonly phase: number;
};

export type Tree = {
  readonly rootX: number;
  readonly rootY: number;
  readonly branches: readonly Branch[];
  readonly leaves: readonly Leaf[];
  /** Vertical distance a falling leaf covers before it has faded out. */
  readonly fallDistance: number;
};

/** How loud the tree is. `full` on the Rustle screen, `quiet` behind the age gate and consent (M1-09). */
export type TreeMood = {
  /** Opacity of trunk and branches (ink). */
  readonly branchAlpha: number;
  /** Opacity of the leaves (sage). */
  readonly leafAlpha: number;
  /** Multiplier on every sway and flutter amplitude. */
  readonly motion: number;
  /** Whether leaves let go now and then. */
  readonly falling: boolean;
};

export const TREE_MOODS = {
  full: { branchAlpha: 0.16, leafAlpha: 0.3, motion: 1, falling: true },
  quiet: { branchAlpha: 0.09, leafAlpha: 0.17, motion: 0.55, falling: false },
} as const satisfies Record<string, TreeMood>;

export type TreeIntensity = keyof typeof TREE_MOODS;

/** The instant drawn when reduce-motion is on (and the tree's first frame otherwise). */
export const STILL_TIME = 0;

// ---------------------------------------------------------------------------------------------
// 1. Growing the tree (JS thread, once per screen size)
// ---------------------------------------------------------------------------------------------

export const TREE_SHAPE = {
  /** Same seed, same tree, on every launch. */
  seed: 20260929,
  /** Trunk base as a fraction of the screen: near the right edge, just below the bottom. */
  rootX: 0.99,
  rootY: 1.01,
  /** The trunk leans a little into the screen (left of straight up). */
  trunkAngle: -Math.PI / 2 - 0.13,
  /** Trunk length as a fraction of the screen height. */
  trunkLength: 0.35,
  /** Trunk width as a fraction of the screen width. */
  trunkThickness: 0.045,
  /** Where the trunk splits (fraction of its length), how far each limb turns, and its length (× trunk). */
  trunkLimbs: [
    { at: 0.45, turn: -0.6, length: 0.55 },
    { at: 0.7, turn: 0.16, length: 0.66 },
    { at: 1, turn: -0.24, length: 0.74 },
  ],
  /** Levels of branching below the trunk. */
  maxDepth: 5,
  /** Each generation is this much shorter / thinner (a random value between the two). */
  lengthDecay: [0.54, 0.68],
  thicknessDecay: 0.66,
  /** Angle between a child and its parent (radians, random within the range). */
  spread: [0.25, 0.55],
  /** Extra turn toward the left on every split, so the canopy grows into the screen, not off it. */
  inwardBias: 0.1,
  /** Branches of this depth and deeper carry leaves. */
  leafFromDepth: 2,
  /** Leaves per leafy branch (tips carry one or two more). */
  leavesPerBranch: 5,
  /** Leaf length as a fraction of the screen width. */
  leafSize: [0.032, 0.048],
  /** Hard cap, to keep the per-frame cost flat on small phones. */
  maxLeaves: 240,
} as const;

/** Small, fast, seeded PRNG (mulberry32). Deterministic on every platform. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

/** Grows the tree for a screen of `width` × `height` points. Pure and deterministic. */
export function buildTree(width: number, height: number, seed: number = TREE_SHAPE.seed): Tree {
  const rand = seededRandom(seed);
  const between = ([lo, hi]: readonly [number, number]) => lerp(lo, hi, rand());
  const s = TREE_SHAPE;
  const branches: Branch[] = [];
  const leaves: Leaf[] = [];

  // Depth-first, so a parent is always pushed before its children (the pose relies on it).
  const grow = (parent: number, along: number, relAngle: number, length: number, thickness: number, depth: number) => {
    const flex = depth / s.maxDepth;
    const index = branches.length;
    branches.push({
      parent,
      along,
      relAngle,
      length,
      thickness,
      depth,
      flex,
      // A gust reaches the outer twigs about a second after it moves the trunk.
      delay: flex * 1.1,
      phase: rand() * Math.PI * 2,
    });

    if (depth >= s.leafFromDepth) {
      const isTip = depth === s.maxDepth;
      // Inner branches carry a few leaves, outer ones more, tips a small cluster.
      const count = depth === s.leafFromDepth ? 2 : s.leavesPerBranch + (isTip ? 1 + Math.round(rand()) : 0);
      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        leaves.push({
          branch: index,
          // Leaves gather toward the end of a branch, like a real canopy.
          along: isTip && i === count - 1 ? 1 : lerp(0.35, 1, rand()),
          relAngle: side * lerp(0.45, 1.15, rand()),
          size: between(s.leafSize) * width,
          alpha: lerp(0.55, 1, rand()),
          freq: lerp(0.2, 0.5, rand()),
          phase: rand() * Math.PI * 2,
        });
      }
    }

    if (depth === s.maxDepth) return;
    const children = depth === 0 ? 3 : rand() < 0.3 ? 3 : 2;
    for (let c = 0; c < children; c++) {
      // The trunk splits at fixed heights into three limbs (two reaching into the screen, one up
      // along the edge); other branches split in their outer third, alternating sides.
      const limb = s.trunkLimbs[c];
      const at = depth === 0 && limb ? limb.at : lerp(0.62, 1, rand());
      const side = c % 2 === 0 ? -1 : 1; // -1 = turn left (into the screen)
      const turn = depth === 0 && limb ? limb.turn : side * between(s.spread) - s.inwardBias;
      const childLength = length * (depth === 0 && limb ? limb.length : between(s.lengthDecay));
      grow(index, at, turn, childLength, thickness * s.thicknessDecay, depth + 1);
    }
  };

  grow(-1, 0, s.trunkAngle, height * s.trunkLength, width * s.trunkThickness, 0);

  // Keep the cap without favouring one side of the tree: sample the leaves evenly.
  const kept =
    leaves.length <= s.maxLeaves
      ? leaves
      : Array.from({ length: s.maxLeaves }, (_, i) => leaves[Math.floor((i * leaves.length) / s.maxLeaves)]!);

  return {
    rootX: width * s.rootX,
    rootY: height * s.rootY,
    branches,
    leaves: kept,
    fallDistance: height * 0.34,
  };
}

// ---------------------------------------------------------------------------------------------
// 2. Wind (UI thread, every frame)
// ---------------------------------------------------------------------------------------------

export const WIND = {
  /**
   * Three slow waves with periods that never line up (13 s, 7.7 s, 4.3 s), so the gusts overlap
   * and the pattern does not visibly repeat. Weights sum to 1.
   */
  waves: [
    { period: 13, weight: 0.55, phase: 0.3 },
    { period: 7.7, weight: 0.3, phase: 1.9 },
    { period: 4.3, weight: 0.15, phase: 4.2 },
  ],
  /** A 23 s swell that makes some gusts stronger than others. */
  swellPeriod: 23,
  /** Branch sway at full flex, in radians per level (it accumulates toward the tips). */
  branchSway: 0.03,
  /** Each branch's own idle sway, independent of the gusts. */
  idleSway: 0.008,
  idleFreq: 0.17,
  /** Leaf flutter amplitude in radians, and how much a gust adds to it. */
  flutter: 0.16,
  flutterGust: 0.14,
} as const;

/** The wind at time `t`, roughly in [-1, 1]. Smooth, slow, never sharp. */
export function gust(t: number): number {
  'worklet';
  const TAU = Math.PI * 2;
  let sum = 0;
  for (const wave of WIND.waves) sum += wave.weight * Math.sin((TAU * t) / wave.period + wave.phase);
  const swell = 0.7 + 0.3 * Math.sin((TAU * t) / WIND.swellPeriod);
  return sum * swell;
}

/** How far branch `b` is bent away from rest at time `t` (radians, relative to its parent). */
export function branchSway(branch: Branch, t: number, motion: number): number {
  'worklet';
  // Bend grows with flex^1.4, so the trunk barely moves and the twigs move most.
  const weight = Math.pow(branch.flex, 1.4);
  const gustBend = WIND.branchSway * weight * gust(t - branch.delay);
  const idle = WIND.idleSway * branch.flex * Math.sin(Math.PI * 2 * WIND.idleFreq * t + branch.phase);
  return (gustBend + idle) * motion;
}

/** A leaf's own flutter at time `t` (radians). Stronger while a gust is blowing. */
export function leafFlutter(leaf: Leaf, t: number, motion: number): number {
  'worklet';
  const strength = WIND.flutter + WIND.flutterGust * Math.abs(gust(t));
  return strength * motion * Math.sin(Math.PI * 2 * leaf.freq * t + leaf.phase);
}

// ---------------------------------------------------------------------------------------------
// 3. Pose: where every branch is at time t
// ---------------------------------------------------------------------------------------------

/** Flat arrays, one entry per branch: start point, end point and absolute angle. */
export type Pose = {
  readonly x0: number[];
  readonly y0: number[];
  readonly x1: number[];
  readonly y1: number[];
  readonly angle: number[];
};

/** Forward kinematics: each branch starts on its parent and adds its own bend to the parent's. */
export function poseAt(tree: Tree, t: number, motion: number): Pose {
  'worklet';
  const n = tree.branches.length;
  const pose: Pose = { x0: new Array(n), y0: new Array(n), x1: new Array(n), y1: new Array(n), angle: new Array(n) };
  for (let i = 0; i < n; i++) {
    const b = tree.branches[i]!;
    let x = tree.rootX;
    let y = tree.rootY;
    let base = 0;
    if (b.parent >= 0) {
      const p = b.parent;
      x = lerp(pose.x0[p]!, pose.x1[p]!, b.along);
      y = lerp(pose.y0[p]!, pose.y1[p]!, b.along);
      base = pose.angle[p]!;
    }
    const angle = base + b.relAngle + branchSway(b, t, motion);
    pose.x0[i] = x;
    pose.y0[i] = y;
    pose.angle[i] = angle;
    pose.x1[i] = x + Math.cos(angle) * b.length;
    pose.y1[i] = y + Math.sin(angle) * b.length;
  }
  return pose;
}

/** Where a leaf sits and which way it points, given a pose. */
export function leafPlacement(tree: Tree, pose: Pose, leaf: Leaf, t: number, motion: number): { x: number; y: number; angle: number } {
  'worklet';
  const b = leaf.branch;
  return {
    x: lerp(pose.x0[b]!, pose.x1[b]!, leaf.along),
    y: lerp(pose.y0[b]!, pose.y1[b]!, leaf.along),
    angle: pose.angle[b]! + leaf.relAngle + leafFlutter(leaf, t, motion),
  };
}

// ---------------------------------------------------------------------------------------------
// 4. A leaf letting go, now and then
// ---------------------------------------------------------------------------------------------

export const FALL = {
  /** Time is cut into cycles; in some of them (not all) one leaf lets go. */
  cycle: 6,
  /** Chance that a given cycle releases a leaf, so the rhythm feels irregular. */
  chance: 0.55,
  /** Seconds from letting go to fully faded out. */
  duration: 7,
  /** Seconds for the empty spot to fill in again, after the fall. */
  regrow: 3,
  /** Drag time constant: the leaf reaches its slow terminal speed after about this long. */
  drag: 1.2,
  /** Side-to-side swing of a falling leaf: frequency (Hz) and width (fraction of fallDistance). */
  swingFreq: 0.28,
  swing: 0.09,
  /** Steady drift with the wind, fraction of fallDistance per second (toward the left). */
  drift: 0.035,
  /** The first cycle that releases (always); nothing falls in the first seconds on screen. */
  firstCycle: 1,
} as const;

/** Deterministic hash of an integer to [0, 1). */
export function hash01(n: number, salt: number): number {
  'worklet';
  const v = Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** A leaf that let go at `releasedAt`; `elapsed` seconds have passed since. */
export type FallEvent = { readonly leaf: number; readonly releasedAt: number; readonly elapsed: number };

/**
 * The releases that still matter at time `t`: leaves in flight, and spots still growing back.
 * At most one release per cycle; a release matters for duration + regrow seconds, so only the
 * current cycle and the two before it can be active.
 */
export function fallsAt(t: number, leafCount: number): FallEvent[] {
  'worklet';
  const events: FallEvent[] = [];
  if (leafCount === 0) return events;
  const current = Math.floor(t / FALL.cycle);
  for (let k = current - 2; k <= current; k++) {
    if (k < FALL.firstCycle) continue;
    // The first cycle always releases, so someone who stays a few seconds sees one leaf go.
    if (k !== FALL.firstCycle && hash01(k, 1) >= FALL.chance) continue;
    const releasedAt = k * FALL.cycle + hash01(k, 2) * (FALL.cycle * 0.5);
    const elapsed = t - releasedAt;
    if (elapsed < 0 || elapsed > FALL.duration + FALL.regrow) continue;
    events.push({ leaf: Math.floor(hash01(k, 3) * leafCount), releasedAt, elapsed });
  }
  return events;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  'worklet';
  const k = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return k * k * (3 - 2 * k);
}

/** 0 while the leaf is away, easing back to 1 as the spot fills in again; 1 for untouched leaves. */
export function attachedLeafPresence(leafIndex: number, falls: readonly FallEvent[]): number {
  'worklet';
  let presence = 1;
  for (const fall of falls) {
    if (fall.leaf !== leafIndex) continue;
    presence *= smoothstep(FALL.duration, FALL.duration + FALL.regrow, fall.elapsed);
  }
  return presence;
}

/**
 * The falling leaf's position, angle and opacity (0..1 of its normal opacity), `elapsed` seconds
 * after letting go from (`x`, `y`) at `angle`. A light object under drag: it speeds up for about
 * a second, then drifts down at a slow steady pace, swinging side to side and turning over.
 */
export function fallingLeaf(
  start: { x: number; y: number; angle: number },
  elapsed: number,
  fallDistance: number,
): { x: number; y: number; angle: number; opacity: number } {
  'worklet';
  const e = Math.max(0, elapsed);
  // Terminal speed chosen so the leaf covers fallDistance in `duration` seconds.
  const speed = fallDistance / (FALL.duration - FALL.drag * (1 - Math.exp(-FALL.duration / FALL.drag)));
  const fallen = speed * (e - FALL.drag * (1 - Math.exp(-e / FALL.drag)));
  const settle = Math.min(1, e / FALL.drag); // the swing builds up after letting go
  const swingPhase = Math.PI * 2 * FALL.swingFreq * e;
  return {
    x: start.x - fallDistance * FALL.drift * e + fallDistance * FALL.swing * settle * Math.sin(swingPhase),
    y: start.y + fallen,
    angle: start.angle + 0.9 * settle * Math.sin(swingPhase + 0.6) + 0.25 * e,
    opacity: 1 - smoothstep(FALL.duration * 0.65, FALL.duration, e),
  };
}

/**
 * Where a leaf was at the instant it let go. Only its own branch chain is posed, so this stays
 * cheap enough to run every frame for the one or two leaves in flight.
 */
export function leafAtTime(tree: Tree, leafIndex: number, t: number, motion: number): { x: number; y: number; angle: number } {
  'worklet';
  const leaf = tree.leaves[leafIndex]!;
  // Collect the chain trunk → leaf's branch.
  const chain: number[] = [];
  for (let b = leaf.branch; b >= 0; b = tree.branches[b]!.parent) chain.unshift(b);
  let x = tree.rootX;
  let y = tree.rootY;
  let angle = 0;
  let x1 = x;
  let y1 = y;
  for (const index of chain) {
    const b = tree.branches[index]!;
    if (b.parent >= 0) {
      x = lerp(x, x1, b.along);
      y = lerp(y, y1, b.along);
    }
    angle = (b.parent >= 0 ? angle : 0) + b.relAngle + branchSway(b, t, motion);
    x1 = x + Math.cos(angle) * b.length;
    y1 = y + Math.sin(angle) * b.length;
  }
  return {
    x: lerp(x, x1, leaf.along),
    y: lerp(y, y1, leaf.along),
    angle: angle + leaf.relAngle + leafFlutter(leaf, t, motion),
  };
}
