/**
 * LoadingOverlay - Engaging loading screen with progress and tips
 *
 * Shows rotating progress messages and helpful tips while waiting.
 * Used for import, create, and other long-running operations.
 * Floating chef hats in background, tips fade in from below.
 */

import { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, Modal, Image } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  FadeIn,
  FadeOut,
  FadeInDown,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, Card } from "@/components/ui";
import { colors, spacing, borderRadius } from "@/constants/theme";
import { PROGRESS_MESSAGES } from "@/constants/tips";
import { useTips } from "@/hooks";

type LoadingType = "import" | "create" | "save" | "cook";

interface LoadingOverlayProps {
  visible: boolean;
  type: LoadingType;
  mode?: "cooking" | "mixology" | "pastry";
}

const chezHat = require("@/assets/chez-only-hat.png");

const TIP_ROTATION_INTERVAL = 8000;
const PROGRESS_INTERVAL = 2500;

const LOADING_ICONS: Record<LoadingType, string> = {
  import: "cloud-download-outline",
  create: "sparkles",
  save: "save-outline",
  cook: "flame-outline",
};

export function LoadingOverlay({ visible, type, mode }: LoadingOverlayProps) {
  const insets = useSafeAreaInsets();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [currentProgressIndex, setCurrentProgressIndex] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const { tips } = useTips({ count: 5, mode });

  // Animation values
  const pulseValue = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const progressBarWidth = useSharedValue(0);
  // Floating hats
  const hat1Y = useSharedValue(0);
  const hat2Y = useSharedValue(0);
  const hat3Y = useSharedValue(0);
  const hat4Y = useSharedValue(0);
  const hat1Rotate = useSharedValue(0);
  const hat2Rotate = useSharedValue(0);
  const hat3Rotate = useSharedValue(0);
  const hat4Rotate = useSharedValue(0);

  const progressMessages = useMemo(() => PROGRESS_MESSAGES[type], [type]);

  // Tip auto-rotation
  useEffect(() => {
    if (!visible) return;
    const tipInterval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, TIP_ROTATION_INTERVAL);
    return () => clearInterval(tipInterval);
  }, [visible, tips.length]);

  // Progress messages rotation
  useEffect(() => {
    if (!visible) return;
    setCurrentProgressIndex(0);
    const progressInterval = setInterval(() => {
      setCurrentProgressIndex((prev) =>
        prev < progressMessages.length - 1 ? prev + 1 : prev
      );
    }, PROGRESS_INTERVAL);
    return () => clearInterval(progressInterval);
  }, [visible, progressMessages.length]);

  // Animations
  useEffect(() => {
    if (!visible) return;

    // Gentle pulse
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.06, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Glow ring
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Floating hats with staggered gentle bob + slight rotation
    hat1Y.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
        withTiming(14, { duration: 2600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    hat1Rotate.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    hat2Y.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(12, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
          withTiming(-12, {
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      )
    );
    hat2Rotate.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(10, {
            duration: 2800,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(-10, {
            duration: 2800,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      )
    );

    hat3Y.value = withDelay(
      1600,
      withRepeat(
        withSequence(
          withTiming(-10, {
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(10, {
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      )
    );
    hat3Rotate.value = withDelay(
      1600,
      withRepeat(
        withSequence(
          withTiming(-6, {
            duration: 3400,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(6, { duration: 3400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    hat4Y.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(11, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
          withTiming(-11, { duration: 2800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    hat4Rotate.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(7, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
          withTiming(-7, { duration: 3200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Reset progress bar
    progressBarWidth.value = 0;
  }, [
    visible,
    pulseValue,
    glowOpacity,
    hat1Y,
    hat2Y,
    hat3Y,
    hat4Y,
    hat1Rotate,
    hat2Rotate,
    hat3Rotate,
    hat4Rotate,
    progressBarWidth,
  ]);

  // Animate progress bar when step changes (pixel-based for reliable animation)
  useEffect(() => {
    if (trackWidth === 0) return;
    const targetWidth =
      ((currentProgressIndex + 1) / progressMessages.length) * trackWidth;
    progressBarWidth.value = withTiming(targetWidth, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });
  }, [
    currentProgressIndex,
    progressMessages.length,
    progressBarWidth,
    trackWidth,
  ]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const hat1Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: hat1Y.value },
      { rotate: `${hat1Rotate.value}deg` },
    ],
  }));
  const hat2Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: hat2Y.value },
      { rotate: `${hat2Rotate.value}deg` },
    ],
  }));
  const hat3Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: hat3Y.value },
      { rotate: `${hat3Rotate.value}deg` },
    ],
  }));
  const hat4Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: hat4Y.value },
      { rotate: `${hat4Rotate.value}deg` },
    ],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: progressBarWidth.value,
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
      <View style={[styles.container, { paddingTop: insets.top + spacing[6] }]}>
        {/* Floating Chez hats background */}
        <View style={styles.hatContainer}>
          <Animated.View style={[styles.hat, styles.hat1, hat1Style]}>
            <Image source={chezHat} style={styles.hatImage} />
          </Animated.View>
          <Animated.View style={[styles.hat, styles.hat2, hat2Style]}>
            <Image source={chezHat} style={styles.hatImageSmall} />
          </Animated.View>
          <Animated.View style={[styles.hat, styles.hat3, hat3Style]}>
            <Image source={chezHat} style={styles.hatImage} />
          </Animated.View>
          <Animated.View style={[styles.hat, styles.hat4, hat4Style]}>
            <Image source={chezHat} style={styles.hatImageSmall} />
          </Animated.View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          {/* Animated Icon with glow */}
          <View style={styles.iconArea}>
            <Animated.View style={[styles.glowRing, glowStyle]} />
            <Animated.View style={[styles.iconContainer, pulseStyle]}>
              <Ionicons
                name={LOADING_ICONS[type] as keyof typeof Ionicons.glyphMap}
                size={36}
                color={colors.primary}
              />
            </Animated.View>
          </View>

          {/* Progress Message */}
          <Animated.View
            key={`progress-${currentProgressIndex}`}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.progressMessage}
          >
            <Ionicons
              name={currentProgress.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={colors.primary}
            />
            <Text variant="label" style={styles.progressText}>
              {currentProgress.message}
            </Text>
          </Animated.View>

          {/* Progress Bar */}
          <View
            style={styles.progressTrack}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          >
            <Animated.View style={[styles.progressFill, progressBarStyle]} />
          </View>

          {/* Step counter */}
          <Text variant="caption" color="textMuted">
            Step {currentProgressIndex + 1} of {progressMessages.length}
          </Text>
        </View>

        {/* Tip Card - fades in from below */}
        <Animated.View
          key={`tip-${currentTip.id}`}
          entering={FadeInDown.duration(400).springify()}
          exiting={FadeOut.duration(200)}
          style={styles.tipCardWrapper}
        >
          <Card variant="elevated" style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <View
                style={[
                  styles.tipIconWrapper,
                  {
                    backgroundColor:
                      currentTip.category === "app"
                        ? colors.infoLight
                        : "#FFF7ED",
                  },
                ]}
              >
                <Ionicons
                  name={currentTip.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={
                    currentTip.category === "app" ? colors.info : colors.primary
                  }
                />
              </View>
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
                {currentTip.category === "app" ? "Did you know?" : "Chef Tip"}
              </Text>
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

        {/* Tip dots */}
        <View style={styles.tipProgressContainer}>
          <View style={styles.tipProgress}>
            {tips.map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.tipDot,
                  index === currentTipIndex && styles.tipDotActive,
                ]}
              />
            ))}
          </View>
        </View>
      </View>
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

  // Floating chef hats
  hatContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  hat: {
    position: "absolute",
  },
  hat1: {
    top: "4%",
    left: -30,
    opacity: 0.16,
  },
  hat2: {
    top: "30%",
    right: -20,
    opacity: 0.12,
  },
  hat3: {
    bottom: "28%",
    right: -10,
    opacity: 0.14,
  },
  hat4: {
    bottom: "6%",
    left: 10,
    opacity: 0.1,
  },
  hatImage: {
    width: 240,
    height: 240,
    resizeMode: "contain",
  },
  hatImageSmall: {
    width: 170,
    height: 170,
    resizeMode: "contain",
  },

  // Progress
  progressSection: {
    alignItems: "center",
    marginTop: spacing[20],
    gap: spacing[3],
  },
  iconArea: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[3],
  },
  glowRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
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

  // Progress bar
  progressTrack: {
    width: "60%",
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: spacing[1],
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  // Tip card
  tipCardWrapper: {
    width: "100%",
    marginTop: spacing[10],
  },
  tipCard: {
    backgroundColor: colors.surface,
    padding: spacing[5],
    gap: spacing[2],
    borderRadius: borderRadius.xl,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  tipIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  tipLabel: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tipTitle: {
    color: colors.textPrimary,
    fontSize: 17,
  },
  tipContent: {
    lineHeight: 22,
  },

  // Tip dots
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
    backgroundColor: colors.primary,
    width: 18,
  },
});
