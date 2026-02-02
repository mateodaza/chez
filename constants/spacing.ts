/**
 * CHEZ Spacing System
 * Based on 8pt grid for consistent rhythm
 */

// Base spacing unit
const BASE = 8;

// Spacing scale (8pt grid)
export const spacing = {
  0: 0,
  1: BASE * 0.5, // 4px - tight spacing
  2: BASE, // 8px - default small
  3: BASE * 1.5, // 12px
  4: BASE * 2, // 16px - default medium
  5: BASE * 2.5, // 20px
  6: BASE * 3, // 24px - default large
  8: BASE * 4, // 32px
  10: BASE * 5, // 40px
  12: BASE * 6, // 48px
  16: BASE * 8, // 64px
  20: BASE * 10, // 80px
  24: BASE * 12, // 96px
} as const;

// Semantic spacing aliases
export const layout = {
  // Screen padding
  screenPaddingHorizontal: spacing[4], // 16px
  screenPaddingVertical: spacing[6], // 24px

  // Card spacing
  cardPadding: spacing[4], // 16px
  cardGap: spacing[3], // 12px

  // List spacing
  listItemGap: spacing[2], // 8px
  listSectionGap: spacing[6], // 24px

  // Form spacing
  inputPaddingHorizontal: spacing[4], // 16px
  inputPaddingVertical: spacing[3], // 12px
  inputGap: spacing[4], // 16px
  labelGap: spacing[2], // 8px

  // Button spacing
  buttonPaddingHorizontal: spacing[6], // 24px
  buttonPaddingVertical: spacing[3], // 12px
  buttonGap: spacing[2], // 8px

  // Tab bar
  tabBarHeight: spacing[10], // 80px (includes safe area)
  tabBarPadding: spacing[2], // 8px

  // Header
  headerHeight: spacing[8], // 56px (closest to 8pt from 56)
  headerPadding: spacing[4], // 16px

  // Recipe card
  recipeCardImageHeight: 200, // Fixed height
  recipeCardPadding: spacing[4], // 16px

  // Cook mode
  cookModeStepPadding: spacing[8], // 32px - larger for visibility
  cookModeButtonSize: spacing[10], // 80px - easy tap target

  // Modal
  modalPadding: spacing[6], // 24px
  modalRadius: spacing[4], // 16px
} as const;

// Border radius (harmonized with spacing)
export const borderRadius = {
  none: 0,
  sm: spacing[1], // 4px
  md: spacing[2], // 8px
  lg: spacing[3], // 12px
  xl: spacing[4], // 16px
  "2xl": spacing[6], // 24px
  full: 9999,
} as const;

// Touch targets (accessibility)
export const touchTarget = {
  min: 48, // Minimum for comfortable tap (increased from iOS 44pt)
  comfortable: 48, // Standard comfortable tap
  large: 56, // Large buttons
} as const;

// Icon sizes
export const iconSize = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
} as const;

export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
