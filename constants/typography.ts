/**
 * CHEZ Typography System
 * Font: Plus Jakarta Sans (variable, ~80KB)
 * Scale: Optimized for readability (not strict 8pt - sizes prioritize legibility)
 * Line heights: 8pt grid aligned
 */

// Font family definitions
export const fontFamily = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semiBold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
} as const;

// Font sizes (optimized for readability, not strict 8pt)
// Line heights ARE 8pt aligned for vertical rhythm
export const fontSize = {
  xs: 12, // Caption, labels
  sm: 14, // Body small
  base: 16, // Body default (8pt)
  lg: 18, // Body large
  xl: 20, // Subheading
  "2xl": 24, // Heading 3 (8pt)
  "3xl": 32, // Heading 2 (8pt)
  "4xl": 40, // Heading 1 (8pt)
  "5xl": 48, // Display (8pt)
} as const;

// Line heights (strict 8pt grid aligned)
export const lineHeight = {
  xs: 16, // 8pt aligned
  sm: 24, // 8pt aligned (was 20)
  base: 24, // 8pt aligned
  lg: 24, // 8pt aligned (was 28)
  xl: 32, // 8pt aligned (was 28)
  "2xl": 32, // 8pt aligned
  "3xl": 40, // 8pt aligned
  "4xl": 48, // 8pt aligned
  "5xl": 56, // 8pt aligned
} as const;

// Pre-composed text styles
export const textStyles = {
  // Display - Hero text
  display: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize["5xl"],
    lineHeight: lineHeight["5xl"],
  },

  // Headings
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize["4xl"],
    lineHeight: lineHeight["4xl"],
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize["3xl"],
    lineHeight: lineHeight["3xl"],
  },
  h3: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize["2xl"],
    lineHeight: lineHeight["2xl"],
  },
  h4: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
  },

  // Body text
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },

  // UI elements
  button: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  buttonSmall: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },

  // Recipe-specific
  recipeTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize["2xl"],
    lineHeight: lineHeight["2xl"],
  },
  ingredientItem: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  stepNumber: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
  },
  stepText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
  },

  // Cook mode (larger for hands-free)
  cookModeStep: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize["2xl"],
    lineHeight: lineHeight["2xl"],
  },
  cookModeTimer: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize["4xl"],
    lineHeight: lineHeight["4xl"],
  },
} as const;

export type FontSizeKey = keyof typeof fontSize;
export type TextStyleKey = keyof typeof textStyles;
