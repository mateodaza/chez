/**
 * Skeleton - Placeholder loading component
 *
 * Shows animated placeholder shapes while content loads.
 * Matches the actual component layouts for seamless transitions.
 */

import { useEffect } from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { colors, spacing, borderRadius } from "@/constants/theme";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius: radius = borderRadius.md,
  style,
}: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/**
 * Recipe card skeleton - matches recipeCard style from recipes.tsx
 * Layout: [mode icon] [title + description + meta] [chevron]
 */
export function SkeletonRecipeCard() {
  return (
    <View style={skeletonStyles.recipeCard}>
      {/* Mode icon circle */}
      <View style={skeletonStyles.modeIcon}>
        <Skeleton width={20} height={20} borderRadius={10} />
      </View>

      {/* Content area */}
      <View style={skeletonStyles.recipeContent}>
        {/* Title */}
        <Skeleton width="75%" height={16} borderRadius={4} />
        {/* Description */}
        <Skeleton
          width="50%"
          height={12}
          borderRadius={4}
          style={{ marginTop: spacing[1] }}
        />
        {/* Meta row with badges */}
        <View style={skeletonStyles.metaRow}>
          <Skeleton width={60} height={12} borderRadius={4} />
          <Skeleton width={45} height={12} borderRadius={4} />
        </View>
      </View>

      {/* Chevron */}
      <Skeleton width={20} height={20} borderRadius={4} />
    </View>
  );
}

export function SkeletonRecipeList({ count = 5 }: { count?: number }) {
  return (
    <View style={skeletonStyles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRecipeCard key={i} />
      ))}
    </View>
  );
}

/**
 * Grocery category skeleton - matches categorySection from lists.tsx
 * Layout: [header with icon + title + count] [items card]
 */
export function SkeletonGroceryCategory({
  itemCount = 3,
}: {
  itemCount?: number;
}) {
  return (
    <View style={skeletonStyles.categorySection}>
      {/* Category header */}
      <View style={skeletonStyles.categoryHeader}>
        <Skeleton width={18} height={18} borderRadius={4} />
        <Skeleton width={70} height={14} borderRadius={4} />
        <View style={{ flex: 1 }} />
        <Skeleton width={16} height={12} borderRadius={4} />
      </View>

      {/* Items card */}
      <View style={skeletonStyles.itemsCard}>
        {Array.from({ length: itemCount }).map((i, index) => (
          <View
            key={index}
            style={[
              skeletonStyles.itemRow,
              index < itemCount - 1 && skeletonStyles.itemBorder,
            ]}
          >
            {/* Checkbox */}
            <Skeleton width={24} height={24} borderRadius={4} />
            {/* Item content */}
            <View style={skeletonStyles.itemContent}>
              <Skeleton width="55%" height={16} borderRadius={4} />
              <Skeleton width="25%" height={12} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function SkeletonGroceryList({ count = 2 }: { count?: number }) {
  // Vary item counts for more natural look
  const itemCounts = [3, 2, 4];

  return (
    <View style={skeletonStyles.groceryList}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonGroceryCategory
          key={i}
          itemCount={itemCounts[i % itemCounts.length]}
        />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  // Recipe list
  list: {
    gap: spacing[3],
  },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    // Elevated card shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeContent: {
    flex: 1,
    gap: spacing[1],
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginTop: spacing[1],
  },

  // Grocery list
  groceryList: {
    gap: spacing[6],
  },
  categorySection: {
    gap: spacing[2],
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  itemsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[3],
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
});
