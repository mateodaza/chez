import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "@/constants/theme";
import type { DetectedLearning } from "./types";

interface CompletionModalProps {
  visible: boolean;
  onClose: () => void;
  detectedLearnings: DetectedLearning[];
  wantsToSaveVersion: boolean;
  setWantsToSaveVersion: (value: boolean) => void;
  completionRating: number;
  setCompletionRating: (rating: number) => void;
  completionTags: string[];
  toggleCompletionTag: (tag: string) => void;
  completionNotes: string;
  setCompletionNotes: (notes: string) => void;
  isCreatingVersion: boolean;
  onSubmit: (skipFeedback: boolean) => void;
  isChef?: boolean;
}

export function CompletionModal({
  visible,
  onClose,
  detectedLearnings,
  wantsToSaveVersion,
  setWantsToSaveVersion,
  completionRating,
  setCompletionRating,
  completionTags,
  toggleCompletionTag,
  completionNotes,
  setCompletionNotes,
  isCreatingVersion,
  onSubmit,
  isChef = false,
}: CompletionModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing[4],
          paddingHorizontal: spacing[5],
          paddingBottom: spacing[8],
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: colors.textPrimary,
            textAlign: "center",
            marginBottom: spacing[2],
          }}
        >
          Great job!
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: "center",
            marginBottom: spacing[6],
          }}
        >
          {isChef && detectedLearnings.length > 0
            ? "I noticed you made some tweaks!"
            : "How did it turn out?"}
        </Text>

        {/* Upgrade prompt for Casual users */}
        {!isChef && (
          <View
            style={{
              backgroundColor: "#F0F9FF",
              borderRadius: borderRadius.lg,
              padding: spacing[4],
              marginBottom: spacing[6],
              borderWidth: 1,
              borderColor: "#BAE6FD",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[2],
                marginBottom: spacing[2],
              }}
            >
              <Ionicons name="sparkles" size={18} color="#0369A1" />
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#0369A1",
                }}
              >
                Chef Mode Unlocks Learnings
              </Text>
            </View>
            <Text
              style={{
                fontSize: 13,
                color: "#0C4A6E",
                lineHeight: 18,
              }}
            >
              Upgrade to Chef to automatically save your cooking adaptations and
              build your personalized recipe versions over time.
            </Text>
          </View>
        )}

        {/* Detected Learnings (Chef mode only) */}
        {isChef && detectedLearnings.length > 0 && (
          <View
            style={{
              backgroundColor: "#fef3c7",
              borderRadius: borderRadius.lg,
              padding: spacing[4],
              marginBottom: spacing[6],
              borderWidth: 1,
              borderColor: "#fcd34d",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#92400e",
                marginBottom: spacing[3],
              }}
            >
              Your modifications:
            </Text>
            {detectedLearnings.map((learning, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: spacing[2],
                  marginBottom:
                    index < detectedLearnings.length - 1 ? spacing[2] : 0,
                }}
              >
                <Ionicons
                  name={
                    learning.type === "substitution"
                      ? "swap-horizontal"
                      : learning.type === "preference"
                        ? "heart"
                        : learning.type === "timing"
                          ? "timer"
                          : learning.type === "addition"
                            ? "add-circle"
                            : "sparkles"
                  }
                  size={16}
                  color="#78350f"
                />
                <Text style={{ fontSize: 14, color: "#78350f", flex: 1 }}>
                  {learning.context}
                </Text>
              </View>
            ))}

            {/* Save as My Version toggle */}
            <Pressable
              onPress={() => setWantsToSaveVersion(!wantsToSaveVersion)}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: spacing[3],
                marginTop: spacing[4],
                paddingTop: spacing[4],
                borderTopWidth: 1,
                borderTopColor: "#fcd34d",
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: wantsToSaveVersion
                    ? colors.primary
                    : colors.border,
                  backgroundColor: wantsToSaveVersion
                    ? colors.primary
                    : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                {wantsToSaveVersion && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[1],
                    marginBottom: spacing[1],
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: "#78350f",
                    }}
                  >
                    Save as My Version
                  </Text>
                  <Text style={{ fontSize: 14 }}>✨</Text>
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#92400e",
                    lineHeight: 18,
                  }}
                >
                  Keep these changes for next time. Your original recipe stays
                  untouched, and you can always switch between both.
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Star Rating */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: spacing[2],
            marginBottom: spacing[6],
          }}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => setCompletionRating(star)}
              style={{ padding: spacing[1] }}
            >
              <Ionicons
                name={star <= completionRating ? "star" : "star-outline"}
                size={36}
                color={star <= completionRating ? "#f59e0b" : colors.border}
              />
            </Pressable>
          ))}
        </View>

        {/* Quick Tags */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: colors.textSecondary,
            marginBottom: spacing[3],
          }}
        >
          Quick feedback
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: spacing[2],
            marginBottom: spacing[6],
          }}
        >
          {["Perfect", "Made adjustments", "Had issues", "Will make again"].map(
            (tag) => (
              <Pressable
                key={tag}
                onPress={() => toggleCompletionTag(tag)}
                style={{
                  backgroundColor: completionTags.includes(tag)
                    ? colors.primary
                    : colors.surface,
                  paddingHorizontal: spacing[4],
                  paddingVertical: spacing[2],
                  borderRadius: borderRadius.full,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: completionTags.includes(tag)
                      ? "#fff"
                      : colors.textSecondary,
                    fontWeight: "500",
                  }}
                >
                  {tag}
                </Text>
              </Pressable>
            )
          )}
        </View>

        {/* Notes */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: colors.textSecondary,
            marginBottom: spacing[2],
          }}
        >
          Notes (optional)
        </Text>
        <TextInput
          value={completionNotes}
          onChangeText={setCompletionNotes}
          placeholder="Any other thoughts..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={{
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
            padding: spacing[3],
            fontSize: 15,
            color: colors.textPrimary,
            minHeight: 80,
            marginBottom: spacing[6],
            textAlignVertical: "top",
          }}
        />

        {/* Buttons */}
        <View style={{ gap: spacing[3] }}>
          <Pressable
            onPress={() => onSubmit(false)}
            disabled={isCreatingVersion}
            style={{
              backgroundColor: isCreatingVersion
                ? colors.border
                : colors.primary,
              paddingVertical: spacing[4],
              borderRadius: borderRadius.lg,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: spacing[2],
            }}
          >
            {isCreatingVersion && (
              <ActivityIndicator size="small" color="#fff" />
            )}
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              {isCreatingVersion
                ? "Creating your version..."
                : isChef && wantsToSaveVersion && detectedLearnings.length > 0
                  ? "Save My Version & Finish"
                  : "Save & Finish"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onSubmit(true)}
            disabled={isCreatingVersion}
            style={{
              paddingVertical: spacing[4],
              borderRadius: borderRadius.lg,
              alignItems: "center",
              opacity: isCreatingVersion ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 16,
                fontWeight: "500",
              }}
            >
              Skip feedback
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Modal>
  );
}
