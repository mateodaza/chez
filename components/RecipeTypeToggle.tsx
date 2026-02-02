/**
 * RecipeTypeToggle - Segmented control for Saved vs My Cookbook
 *
 * Used on the recipes list screen to filter between:
 * - Saved: Outsourced recipes imported from video sources
 * - My Cookbook: Recipes saved to cookbook or manually created
 */

import { View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from "react-native-reanimated";
import { useEffect } from "react";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/Text";
import { colors, spacing, borderRadius, animation } from "@/constants/theme";

export type RecipeListType = "saved" | "cookbook";

interface RecipeTypeToggleProps {
  selectedType: RecipeListType;
  onTypeChange: (type: RecipeListType) => void;
  savedCount: number;
  cookbookCount: number;
}

export function RecipeTypeToggle({
  selectedType,
  onTypeChange,
  savedCount,
  cookbookCount,
}: RecipeTypeToggleProps) {
  const { width: screenWidth } = useWindowDimensions();
  const toggleWidth = Math.min(screenWidth - spacing[8], 360);
  const indicatorWidth = toggleWidth / 2 - 4;

  // Animated position for the indicator
  const indicatorPosition = useSharedValue(selectedType === "saved" ? 0 : 1);

  // Update indicator position when selection changes
  useEffect(() => {
    indicatorPosition.value = withSpring(
      selectedType === "saved" ? 0 : 1,
      animation.spring.snappy
    );
  }, [selectedType, indicatorPosition]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: indicatorPosition.value * (toggleWidth / 2),
      },
    ],
    width: indicatorWidth,
  }));

  const handleSavedPress = () => {
    if (selectedType !== "saved") {
      if (process.env.EXPO_OS === "ios") {
        Haptics.selectionAsync();
      }
      onTypeChange("saved");
    }
  };

  const handleCookbookPress = () => {
    if (selectedType !== "cookbook") {
      if (process.env.EXPO_OS === "ios") {
        Haptics.selectionAsync();
      }
      onTypeChange("cookbook");
    }
  };

  return (
    <View style={[styles.container, { width: toggleWidth }]}>
      {/* Background track */}
      <View style={[styles.track, { width: toggleWidth }]}>
        {/* Animated indicator */}
        <Animated.View style={[styles.indicator, indicatorStyle]} />

        {/* Saved button */}
        <Pressable
          style={styles.option}
          onPress={handleSavedPress}
          accessibilityLabel={`Saved, ${savedCount} recipes`}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedType === "saved" }}
        >
          <Text
            variant="label"
            style={[
              styles.optionText,
              selectedType === "saved" && styles.optionTextActive,
            ]}
          >
            Saved
          </Text>
          <Text
            variant="caption"
            style={[
              styles.countText,
              selectedType === "saved" && styles.countTextActive,
            ]}
          >
            {savedCount}
          </Text>
        </Pressable>

        {/* My Cookbook button */}
        <Pressable
          style={styles.option}
          onPress={handleCookbookPress}
          accessibilityLabel={`My Cookbook, ${cookbookCount} recipes`}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedType === "cookbook" }}
        >
          <Text
            variant="label"
            style={[
              styles.optionText,
              selectedType === "cookbook" && styles.optionTextActive,
            ]}
          >
            My Cookbook
          </Text>
          <Text
            variant="caption"
            style={[
              styles.countText,
              selectedType === "cookbook" && styles.countTextActive,
            ]}
          >
            {cookbookCount}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const TOGGLE_HEIGHT = 44;

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
  },
  track: {
    height: TOGGLE_HEIGHT,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    padding: 2,
  },
  indicator: {
    position: "absolute",
    height: TOGGLE_HEIGHT - 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg - 2,
    left: 2,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  option: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: spacing[2],
  },
  optionText: {
    color: colors.textSecondary,
    fontWeight: "500",
  },
  optionTextActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  countText: {
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  countTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
});
