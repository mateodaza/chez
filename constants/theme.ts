/**
 * CHEZ Unified Theme Export
 * Single import for all design tokens
 */

export { colors, semantic } from "./colors";
export type { ColorKey, SemanticColorKey } from "./colors";

export { fontFamily, fontSize, lineHeight, textStyles } from "./typography";
export type { FontSizeKey, TextStyleKey } from "./typography";

export {
  spacing,
  layout,
  borderRadius,
  touchTarget,
  iconSize,
} from "./spacing";
export type { SpacingKey, BorderRadiusKey } from "./spacing";

// Animation constants (Reanimated 4)
export const animation = {
  // Durations (ms)
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },

  // Spring configs for Reanimated
  spring: {
    // Snappy - buttons, toggles
    snappy: {
      damping: 20,
      stiffness: 300,
      mass: 1,
    },
    // Gentle - modals, sheets
    gentle: {
      damping: 15,
      stiffness: 150,
      mass: 1,
    },
    // Bouncy - celebratory animations
    bouncy: {
      damping: 10,
      stiffness: 180,
      mass: 1,
    },
  },

  // Easing curve names (semantic labels)
  // Usage: Map these to actual Easing functions when using withTiming()
  // Example: withTiming(value, { easing: Easing.out(Easing.ease) })
  easingPreset: {
    easeOut: "out", // Decelerate - entering elements
    easeIn: "in", // Accelerate - exiting elements
    easeInOut: "inOut", // Both - morphing elements
  },
} as const;

// Helper comment for Reanimated usage:
// import { Easing } from 'react-native-reanimated';
// const easingMap = {
//   out: Easing.out(Easing.ease),
//   in: Easing.in(Easing.ease),
//   inOut: Easing.inOut(Easing.ease),
// };

// Shadow definitions
export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Z-index scale
export const zIndex = {
  base: 0,
  card: 10,
  header: 100,
  modal: 200,
  toast: 300,
  tooltip: 400,
} as const;
