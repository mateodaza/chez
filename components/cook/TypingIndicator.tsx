import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { colors, spacing, borderRadius } from "@/constants/theme";

export function TypingIndicator() {
  const dot1Opacity = useSharedValue(0.6);
  const dot2Opacity = useSharedValue(0.4);
  const dot3Opacity = useSharedValue(0.2);

  useEffect(() => {
    // Animate dots with staggered timing
    dot1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );

    dot2Opacity.value = withRepeat(
      withSequence(
        withDelay(133, withTiming(1, { duration: 400 })),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );

    dot3Opacity.value = withRepeat(
      withSequence(
        withDelay(266, withTiming(1, { duration: 400 })),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );
  }, [dot1Opacity, dot2Opacity, dot3Opacity]);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  return (
    <View
      style={{
        alignSelf: "flex-start",
        maxWidth: "85%",
        marginTop: spacing[3],
      }}
    >
      <View
        style={{
          backgroundColor: colors.surface,
          padding: spacing[3],
          borderRadius: borderRadius.lg,
          borderBottomLeftRadius: 4,
          flexDirection: "row",
          gap: 4,
        }}
      >
        <Animated.Text style={[{ fontSize: 18 }, dot1Style]}>•</Animated.Text>
        <Animated.Text style={[{ fontSize: 18 }, dot2Style]}>•</Animated.Text>
        <Animated.Text style={[{ fontSize: 18 }, dot3Style]}>•</Animated.Text>
      </View>
    </View>
  );
}
