import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "@/constants/theme";
import type { LearningType } from "./types";

interface LearningToastProps {
  visible: boolean;
  learningType: LearningType;
  onComplete?: () => void;
}

const LEARNING_MESSAGES: Record<
  LearningType,
  { text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  substitution: {
    text: "Remembering this substitution",
    icon: "swap-horizontal",
  },
  timing: { text: "Noted timing adjustment", icon: "time" },
  addition: { text: "Adding to your version", icon: "add-circle" },
  tip: { text: "Good catch!", icon: "checkmark-circle" },
  preference: { text: "Noted your preference", icon: "heart" },
  modification: { text: "Saved your modification", icon: "create" },
  technique: { text: "Learning your technique", icon: "school" },
};

const TOAST_DURATION = 2500; // How long toast stays visible

export function LearningToast({
  visible,
  learningType,
  onComplete,
}: LearningToastProps) {
  // Auto-hide after duration
  useEffect(() => {
    if (visible && onComplete) {
      const timeout = setTimeout(() => {
        onComplete();
      }, TOAST_DURATION);
      return () => clearTimeout(timeout);
    }
  }, [visible, onComplete]);

  const message = LEARNING_MESSAGES[learningType];

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.toast}>
        <View style={styles.iconContainer}>
          <Ionicons name={message.icon} size={16} color={colors.primary} />
        </View>
        <Text style={styles.text}>{message.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 99999,
    paddingHorizontal: spacing[4],
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    gap: spacing[2],
    borderWidth: 2,
    borderColor: colors.primary,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
});
