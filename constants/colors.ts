/**
 * CHEZ Color System
 * Based on research-backed warm orange palette for appetite stimulation
 * Primary: #EA580C (Warm Orange) - proven 18% higher engagement in food apps
 */

export const colors = {
  // Primary brand colors
  primary: "#EA580C", // CHEZ Warm Orange
  primaryLight: "#FB923C", // Hover states, dark mode
  primaryDark: "#C2410C", // Pressed states

  // Background colors
  background: "#FFFBF5", // Warm cream (light mode)
  backgroundDark: "#1C1917", // Stone 900 (dark mode)

  // Surface colors
  surface: "#FFFFFF",
  surfaceDark: "#292524", // Stone 800
  surfaceElevated: "#F7E6CA", // Champagne

  // Text colors
  textPrimary: "#44403C", // Espresso (Stone 700)
  textSecondary: "#78716C", // Stone 500
  textMuted: "#A8A29E", // Stone 400
  textOnPrimary: "#FFFFFF",

  // Semantic colors
  success: "#22C55E", // Green 500
  warning: "#F59E0B", // Amber 500
  error: "#EF4444", // Red 500
  info: "#3B82F6", // Blue 500

  // Accent colors
  terracotta: "#E2725B", // Secondary accent

  // Border colors
  border: "#E7E5E4", // Stone 200
  borderDark: "#44403C", // Stone 700

  // Overlay
  overlay: "rgba(0, 0, 0, 0.5)",
  overlayLight: "rgba(0, 0, 0, 0.3)",
} as const;

// Semantic aliases for common use cases
export const semantic = {
  // Buttons
  buttonPrimary: colors.primary,
  buttonPrimaryPressed: colors.primaryDark,
  buttonPrimaryDisabled: colors.textMuted,

  // Cards
  cardBackground: colors.surface,
  cardBackgroundDark: colors.surfaceDark,
  cardBorder: colors.border,

  // Inputs
  inputBackground: colors.surface,
  inputBorder: colors.border,
  inputBorderFocus: colors.primary,
  inputPlaceholder: colors.textMuted,

  // Navigation
  tabActive: colors.primary,
  tabInactive: colors.textMuted,

  // Cook mode specific
  cookModeBackground: colors.backgroundDark,
  cookModeText: "#FFFFFF",
  cookModeAccent: colors.primaryLight,

  // Timer
  timerActive: colors.primary,
  timerPaused: colors.warning,
  timerComplete: colors.success,
} as const;

export type ColorKey = keyof typeof colors;
export type SemanticColorKey = keyof typeof semantic;
