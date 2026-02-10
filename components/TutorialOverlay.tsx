import { useState, useEffect } from "react";
import { View, Text, Pressable, Modal, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import { colors, spacing, borderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TutorialStep {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Import from TikTok or YouTube",
    description:
      "Paste a recipe video link and Chez extracts the ingredients and steps automatically",
    icon: "videocam",
    iconColor: "#DC2626",
    iconBg: "#FEE2E2",
  },
  {
    title: "Ask Chez Anything",
    description:
      "Use voice or text to get instant help while cooking - substitutions, timing, techniques",
    icon: "mic",
    iconColor: colors.primary,
    iconBg: "#FFEDD5",
  },
  {
    title: "Instant Grocery Lists",
    description:
      "Tap any recipe to add ingredients to your shopping list - sorted by aisle and ready to go",
    icon: "cart",
    iconColor: "#3B82F6",
    iconBg: "#EFF6FF",
  },
  {
    title: "Try Chef Mode",
    description:
      'Save your tweaks as "My Version" and compare changes. Switch anytime in Profile.',
    icon: "ribbon",
    iconColor: "#F59E0B",
    iconBg: "#FEF3C7",
  },
];

interface TutorialOverlayProps {
  visible: boolean;
  onComplete: () => void;
}

export function TutorialOverlay({ visible, onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Reset to first step when overlay opens
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
    }
  }, [visible]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.75)",
          justifyContent: "center",
          alignItems: "center",
          padding: spacing[6],
        }}
      >
        {/* Skip button */}
        <Pressable
          onPress={handleSkip}
          style={{
            position: "absolute",
            top: 60,
            right: spacing[4],
            padding: spacing[2],
          }}
        >
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 16,
              fontWeight: "500",
            }}
          >
            Skip
          </Text>
        </Pressable>

        {/* Card */}
        <Animated.View
          key={currentStep}
          entering={SlideInRight.duration(300).springify()}
          exiting={SlideOutLeft.duration(200)}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: borderRadius.xl,
            padding: spacing[6],
            width: SCREEN_WIDTH - spacing[8],
            maxWidth: 400,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 24,
            elevation: 10,
          }}
        >
          {/* Icon */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: step.iconBg,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: spacing[5],
            }}
          >
            <Ionicons name={step.icon} size={40} color={step.iconColor} />
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: colors.textPrimary,
              textAlign: "center",
              marginBottom: spacing[3],
            }}
          >
            {step.title}
          </Text>

          {/* Description */}
          <Text
            style={{
              fontSize: 16,
              color: colors.textSecondary,
              textAlign: "center",
              lineHeight: 24,
              marginBottom: spacing[6],
            }}
          >
            {step.description}
          </Text>

          {/* Progress dots */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: spacing[2],
              marginBottom: spacing[5],
            }}
          >
            {TUTORIAL_STEPS.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === currentStep ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    i === currentStep ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>

          {/* Next button */}
          <Pressable
            onPress={handleNext}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: spacing[4],
              paddingHorizontal: spacing[8],
              borderRadius: borderRadius.full,
              width: "100%",
              alignItems: "center",
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 18,
                fontWeight: "600",
              }}
            >
              {currentStep < TUTORIAL_STEPS.length - 1 ? "Next" : "Let's Cook!"}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Step indicator */}
        <Text
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 14,
            marginTop: spacing[4],
          }}
        >
          {currentStep + 1} of {TUTORIAL_STEPS.length}
        </Text>
      </Animated.View>
    </Modal>
  );
}
