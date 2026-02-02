import { View, Text, Pressable, Modal, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "@/constants/theme";
import type { ChatMessage, LearningType } from "./types";

interface RememberModalProps {
  visible: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  learningType: LearningType;
  setLearningType: (type: LearningType) => void;
  isSaving: boolean;
  onSave: () => void;
}

const learningOptions: {
  type: LearningType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  desc: string;
}[] = [
  {
    type: "substitution",
    label: "Substitution",
    icon: "swap-horizontal-outline",
    desc: "I used something different",
  },
  {
    type: "preference",
    label: "Preference",
    icon: "heart-outline",
    desc: "How I like it",
  },
  {
    type: "timing",
    label: "Timing",
    icon: "timer-outline",
    desc: "Cooked longer/shorter",
  },
  {
    type: "technique",
    label: "Technique",
    icon: "sparkles-outline",
    desc: "Did it differently",
  },
  {
    type: "addition",
    label: "Addition",
    icon: "add-circle-outline",
    desc: "Added something extra",
  },
];

export function RememberModal({
  visible,
  onClose,
  message,
  learningType,
  setLearningType,
  isSaving,
  onSave,
}: RememberModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top + spacing[4],
          paddingHorizontal: spacing[5],
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.textPrimary,
            textAlign: "center",
            marginBottom: spacing[2],
          }}
        >
          Remember for My Version
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
            marginBottom: spacing[6],
          }}
        >
          What kind of modification is this?
        </Text>

        {/* Message preview */}
        {message && (
          <View
            style={{
              backgroundColor: colors.surface,
              padding: spacing[3],
              borderRadius: borderRadius.lg,
              marginBottom: spacing[6],
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                fontStyle: "italic",
              }}
              numberOfLines={3}
            >
              &quot;{message.content}&quot;
            </Text>
          </View>
        )}

        {/* Type selection */}
        <View style={{ gap: spacing[2], marginBottom: spacing[6] }}>
          {learningOptions.map((option) => (
            <Pressable
              key={option.type}
              onPress={() => setLearningType(option.type)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
                padding: spacing[3],
                backgroundColor:
                  learningType === option.type ? "#fef3c7" : colors.surface,
                borderRadius: borderRadius.lg,
                borderWidth: 2,
                borderColor:
                  learningType === option.type ? colors.primary : "transparent",
              }}
            >
              <Ionicons
                name={option.icon}
                size={24}
                color={
                  learningType === option.type
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.textPrimary,
                  }}
                >
                  {option.label}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  {option.desc}
                </Text>
              </View>
              {learningType === option.type && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.primary}
                />
              )}
            </Pressable>
          ))}
        </View>

        {/* Buttons */}
        <View style={{ gap: spacing[3] }}>
          <Pressable
            onPress={onSave}
            disabled={isSaving}
            style={{
              backgroundColor: isSaving ? colors.border : colors.primary,
              paddingVertical: spacing[4],
              borderRadius: borderRadius.lg,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: spacing[2],
            }}
          >
            {isSaving && <ActivityIndicator size="small" color="#fff" />}
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              {isSaving ? "Saving..." : "Save to My Version"}
            </Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            disabled={isSaving}
            style={{
              paddingVertical: spacing[4],
              borderRadius: borderRadius.lg,
              alignItems: "center",
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 16,
                fontWeight: "500",
              }}
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
