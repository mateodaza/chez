/**
 * LoadingOverlay - Engaging loading screen with progress and tips
 *
 * Shows rotating progress messages and helpful tips while waiting.
 * Used for import, create, and other long-running operations.
 * Users can swipe left/right to browse tips manually.
 */

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { View, StyleSheet, Modal } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInUp,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, Card } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { PROGRESS_MESSAGES } from "@/constants/tips";
import { useTips } from "@/hooks";

type LoadingType = "import" | "create" | "save";

interface LoadingOverlayProps {
  visible: boolean;
  type: LoadingType;
  mode?: "cooking" | "mixology" | "pastry";
}

const TIP_ROTATION_INTERVAL = 5000; // 5 seconds per tip
const PROGRESS_INTERVAL = 2500; // 2.5 seconds per progress message

const SWIPE_THRESHOLD = 50; // Minimum swipe distance to trigger tip change
const AUTO_RESUME_DELAY = 8000; // Resume auto-rotation after 8 seconds of no interaction

export function LoadingOverlay({ visible, type, mode }: LoadingOverlayProps) {
  const insets = useSafeAreaInsets();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [currentProgressIndex, setCurrentProgressIndex] = useState(0);
  const { tips } = useTips({ count: 5, mode });

  // Track auto-rotation pause state
  const autoRotationPaused = useRef(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation values
  const spinValue = useSharedValue(0);
  const pulseValue = useSharedValue(1);
  const tipTranslateX = useSharedValue(0);

  // Get progress messages for this type
  const progressMessages = useMemo(() => PROGRESS_MESSAGES[type], [type]);

  // Navigate to next/previous tip
  const goToNextTip = useCallback(() => {
    setCurrentTipIndex((prev) => (prev + 1) % tips.length);
  }, [tips.length]);

  const goToPrevTip = useCallback(() => {
    setCurrentTipIndex((prev) => (prev - 1 + tips.length) % tips.length);
  }, [tips.length]);

  // Pause auto-rotation and schedule resume
  const pauseAutoRotation = useCallback(() => {
    autoRotationPaused.current = true;

    // Clear any existing resume timeout
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }

    // Schedule auto-rotation resume
    resumeTimeoutRef.current = setTimeout(() => {
      autoRotationPaused.current = false;
    }, AUTO_RESUME_DELAY);
  }, []);

  // Swipe gesture for tips
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((event) => {
      // Provide visual feedback during swipe
      tipTranslateX.value = event.translationX * 0.3;
    })
    .onEnd((event) => {
      // Reset position with spring animation
      tipTranslateX.value = withSpring(0, { damping: 15 });

      // Check if swipe was significant enough
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        if (event.translationX > 0) {
          // Swipe right - go to previous tip
          runOnJS(goToPrevTip)();
        } else {
          // Swipe left - go to next tip
          runOnJS(goToNextTip)();
        }
        runOnJS(pauseAutoRotation)();
      }
    });

  // Animated style for swipe feedback
  const tipSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tipTranslateX.value }],
  }));

  // Rotate tips automatically (respects pause state)
  useEffect(() => {
    if (!visible) return;

    const tipInterval = setInterval(() => {
      if (!autoRotationPaused.current) {
        setCurrentTipIndex((prev) => (prev + 1) % tips.length);
      }
    }, TIP_ROTATION_INTERVAL);

    return () => {
      clearInterval(tipInterval);
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, [visible, tips.length]);

  // Rotate progress messages
  useEffect(() => {
    if (!visible) return;

    setCurrentProgressIndex(0); // Reset on show

    const progressInterval = setInterval(() => {
      setCurrentProgressIndex((prev) =>
        prev < progressMessages.length - 1 ? prev + 1 : prev
      );
    }, PROGRESS_INTERVAL);

    return () => clearInterval(progressInterval);
  }, [visible, progressMessages.length]);

  // Spin animation for icon
  useEffect(() => {
    if (!visible) return;

    spinValue.value = withRepeat(
      withTiming(360, { duration: 2000 }),
      -1,
      false
    );

    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, [visible, spinValue, pulseValue]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  const currentTip = tips[currentTipIndex];
  const currentProgress = progressMessages[currentProgressIndex];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={[styles.container, { paddingTop: insets.top + spacing[8] }]}
        >
          {/* Progress Section */}
          <View style={styles.progressSection}>
            {/* Animated Icon */}
            <Animated.View style={[styles.iconContainer, pulseStyle]}>
              <Animated.View style={spinStyle}>
                <Ionicons name="restaurant" size={48} color={colors.primary} />
              </Animated.View>
            </Animated.View>

            {/* Progress Message */}
            <Animated.View
              key={`progress-${currentProgressIndex}`}
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={styles.progressMessage}
            >
              <Ionicons
                name={currentProgress.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={colors.primary}
              />
              <Text variant="h4" style={styles.progressText}>
                {currentProgress.message}
              </Text>
            </Animated.View>

            {/* Progress Dots */}
            <View style={styles.progressDots}>
              {progressMessages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index <= currentProgressIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Tip Card - Swipeable */}
          <GestureDetector gesture={swipeGesture}>
            <Animated.View
              key={`tip-${currentTip.id}`}
              entering={SlideInUp.duration(400).springify()}
              style={[styles.tipCardWrapper, tipSwipeStyle]}
            >
              <Card variant="elevated" style={styles.tipCard}>
                <View style={styles.tipHeader}>
                  <View style={styles.tipIconWrapper}>
                    <Ionicons
                      name={currentTip.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={
                        currentTip.category === "app"
                          ? colors.info
                          : colors.primary
                      }
                    />
                  </View>
                  <View style={styles.tipLabelContainer}>
                    <Text
                      variant="caption"
                      style={[
                        styles.tipLabel,
                        {
                          color:
                            currentTip.category === "app"
                              ? colors.info
                              : colors.primary,
                        },
                      ]}
                    >
                      {currentTip.category === "app"
                        ? "Did you know?"
                        : "Chef Tip"}
                    </Text>
                  </View>
                </View>
                <Text variant="label" style={styles.tipTitle}>
                  {currentTip.title}
                </Text>
                <Text
                  variant="body"
                  color="textSecondary"
                  style={styles.tipContent}
                >
                  {currentTip.content}
                </Text>
              </Card>
            </Animated.View>
          </GestureDetector>

          {/* Tip Progress Indicator with swipe hint */}
          <View style={styles.tipProgressContainer}>
            <View style={styles.tipProgress}>
              {tips.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.tipDot,
                    index === currentTipIndex && styles.tipDotActive,
                  ]}
                />
              ))}
            </View>
            <Text variant="caption" color="textMuted" style={styles.swipeHint}>
              Swipe for more tips
            </Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: spacing[6],
  },
  progressSection: {
    alignItems: "center",
    marginTop: spacing[16],
    gap: spacing[4],
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  progressMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    minHeight: 28,
  },
  progressText: {
    color: colors.textPrimary,
  },
  progressDots: {
    flexDirection: "row",
    gap: spacing[2],
    marginTop: spacing[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  tipCardWrapper: {
    width: "100%",
    marginTop: spacing[12],
  },
  tipCard: {
    backgroundColor: colors.surface,
    padding: spacing[5],
    gap: spacing[3],
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  tipIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  tipLabelContainer: {
    flex: 1,
  },
  tipLabel: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tipTitle: {
    color: colors.textPrimary,
    fontSize: 18,
  },
  tipContent: {
    lineHeight: 22,
  },
  tipProgressContainer: {
    alignItems: "center",
    gap: spacing[2],
    marginTop: spacing[4],
  },
  tipProgress: {
    flexDirection: "row",
    gap: spacing[2],
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  tipDotActive: {
    backgroundColor: colors.textSecondary,
    width: 16,
  },
  swipeHint: {
    marginTop: spacing[1],
  },
});
