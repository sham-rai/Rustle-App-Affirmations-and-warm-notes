// The intro feature: the company splash and the Rustle screen (M2-01), and the tree module the
// age gate and consent screens reuse, quieter (M1-09).
export { Tree, type TreeProps } from './tree/Tree';
export type { TreeIntensity } from './tree/maths';
export { FoldedNoteMark } from './FoldedNoteMark';
export { isIntroSeen, markIntroSeen, resetIntroSeen } from './intro-seen';
export { GATE_ROUTE, HOME_ROUTE, INTRO_ROUTE, launchRoute, shouldMarkOnboardedOnLaunch, type LaunchRoute } from './launch';
