/**
 * VersionToggle - Simple segmented control for Original vs My Version
 *
 * Used in Chef/Pro mode for outsourced (imported) recipes only.
 * Shows a pill-style toggle between Original and My Version.
 */

import { View, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from "react-native-reanimated";
import { useEffect } from "react";
import { Text } from "@/components/ui/Text";
import { colors, spacing, borderRadius, animation } from "@/constants/theme";

interface VersionToggleProps {
  hasMyVersion: boolean;
  isViewingOriginal: boolean;
  onViewOriginal: () => void;
  onViewMyVersion: () => void;
}

export function VersionToggle({
  hasMyVersion,
  isViewingOriginal,
  onViewOriginal,
  onViewMyVersion,
}: VersionToggleProps) {
  // Animated position for the indicator
  const indicatorPosition = useSharedValue(isViewingOriginal ? 0 : 1);

  // Update indicator position when viewing state changes
  useEffect(() => {
    indicatorPosition.value = withSpring(
      isViewingOriginal ? 0 : 1,
      animation.spring.snappy
    );
  }, [isViewingOriginal, indicatorPosition]);

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: indicatorPosition.value * (TOGGLE_WIDTH / 2),
        },
      ],
    };
  });

  const handleOriginalPress = () => {
    onViewOriginal();
  };

  const handleMyVersionPress = () => {
    if (hasMyVersion) {
      onViewMyVersion();
    }
  };

  return (
    <View style={styles.container}>
      {/* Background track */}
      <View style={styles.track}>
        {/* Animated indicator */}
        <Animated.View style={[styles.indicator, indicatorStyle]} />

        {/* Original button */}
        <Pressable
          style={styles.option}
          onPress={handleOriginalPress}
          accessibilityLabel="View Original"
          accessibilityRole="button"
          accessibilityState={{ selected: isViewingOriginal }}
        >
          <Text
            variant="label"
            style={[
              styles.optionText,
              isViewingOriginal && styles.optionTextActive,
            ]}
          >
            Original
          </Text>
        </Pressable>

        {/* My Version button */}
        <Pressable
          style={[styles.option, !hasMyVersion && styles.optionDisabled]}
          onPress={handleMyVersionPress}
          disabled={!hasMyVersion}
          accessibilityLabel="View My Version"
          accessibilityRole="button"
          accessibilityState={{
            selected: !isViewingOriginal && hasMyVersion,
            disabled: !hasMyVersion,
          }}
        >
          <View style={styles.optionContent}>
            <Text
              variant="label"
              style={[
                styles.optionText,
                !isViewingOriginal && hasMyVersion && styles.optionTextActive,
                !hasMyVersion && styles.optionTextDisabled,
              ]}
            >
              My Version
            </Text>
            {hasMyVersion && <Text style={styles.sparkle}>✨</Text>}
          </View>
        </Pressable>
      </View>

      {/* Helper text when no My Version exists */}
      {!hasMyVersion && (
        <Text variant="caption" color="textMuted" style={styles.helperText}>
          Cook this to unlock your personalized version
        </Text>
      )}
      {hasMyVersion && (
        <Text variant="caption" style={styles.helperTextSuccess}>
          Your personalized recipe with all your modifications
        </Text>
      )}
    </View>
  );
}

const TOGGLE_WIDTH = 240;
const TOGGLE_HEIGHT = 40;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing[2],
  },
  track: {
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    padding: 2,
  },
  indicator: {
    position: "absolute",
    width: TOGGLE_WIDTH / 2 - 2,
    height: TOGGLE_HEIGHT - 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    left: 2,
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  option: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  optionText: {
    color: colors.textSecondary,
    fontWeight: "500",
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  optionTextDisabled: {
    color: colors.textMuted,
  },
  sparkle: {
    fontSize: 14,
    marginTop: -2,
  },
  helperText: {
    marginTop: spacing[1],
  },
  helperTextSuccess: {
    marginTop: spacing[1],
    color: colors.primary,
    fontWeight: "500",
  },
});
