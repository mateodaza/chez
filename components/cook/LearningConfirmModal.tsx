/**
 * LearningConfirmModal - Confirmation modal for low-confidence learnings
 *
 * Shows when AI detects a learning with confidence < 0.8
 * Allows user to confirm, edit, or dismiss the detected learning
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "@/constants/theme";
import type { LearningType } from "./types";

const LEARNING_TYPE_CONFIG: Record<
  LearningType,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  substitution: {
    label: "Substitution",
    icon: "swap-horizontal",
    color: "#6366F1",
  },
  timing: { label: "Timing", icon: "time", color: "#F59E0B" },
  addition: { label: "Addition", icon: "add-circle", color: "#10B981" },
  tip: { label: "Tip", icon: "checkmark-circle", color: "#06B6D4" },
  preference: { label: "Preference", icon: "heart", color: "#EC4899" },
  modification: { label: "Modification", icon: "create", color: "#8B5CF6" },
  technique: { label: "Technique", icon: "school", color: "#F97316" },
};

interface LearningConfirmModalProps {
  visible: boolean;
  learning: {
    type: LearningType;
    content: string;
    confidence: number;
    stepNumber?: number; // Optional - kept for context but not required
  };
  recipeName?: string;
  onConfirm: (editedLearning: { type: LearningType; content: string }) => void;
  onDismiss: () => void;
}

export function LearningConfirmModal({
  visible,
  learning,
  recipeName,
  onConfirm,
  onDismiss,
}: LearningConfirmModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<LearningType>(learning.type);
  const [content, setContent] = useState(learning.content);

  // Reset state when modal opens with new learning
  const handleModalShow = () => {
    setSelectedType(learning.type);
    setContent(learning.content);
  };

  const handleConfirm = () => {
    onConfirm({ type: selectedType, content: content.trim() });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
      onShow={handleModalShow}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View
          style={[
            styles.content,
            { paddingBottom: insets.bottom + spacing[4] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIcon,
                  { backgroundColor: `${colors.primary}15` },
                ]}
              >
                <Ionicons name="sparkles" size={20} color={colors.primary} />
              </View>
              <Text style={styles.headerTitle}>Did Chez get this right?</Text>
            </View>
            <Pressable onPress={onDismiss} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Confidence indicator */}
          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>Confidence:</Text>
            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  {
                    width: `${learning.confidence * 100}%`,
                    backgroundColor:
                      learning.confidence >= 0.8
                        ? colors.primary
                        : learning.confidence >= 0.5
                          ? "#F59E0B"
                          : colors.error,
                  },
                ]}
              />
            </View>
            <Text style={styles.confidenceValue}>
              {Math.round(learning.confidence * 100)}%
            </Text>
          </View>

          {/* Recipe context - learnings are version-level */}
          <View style={styles.contextRow}>
            <Ionicons name="bookmark" size={14} color={colors.textMuted} />
            <Text style={styles.contextText}>
              {recipeName ? `Saving to ${recipeName}` : "Saving to My Version"}
            </Text>
          </View>

          {/* Type selector */}
          <Text style={styles.sectionLabel}>
            What type of learning is this?
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeSelector}
          >
            {(Object.keys(LEARNING_TYPE_CONFIG) as LearningType[]).map(
              (type) => {
                const typeConfig = LEARNING_TYPE_CONFIG[type];
                const isSelected = selectedType === type;

                return (
                  <Pressable
                    key={type}
                    onPress={() => setSelectedType(type)}
                    style={[
                      styles.typeChip,
                      isSelected && {
                        backgroundColor: `${typeConfig.color}20`,
                        borderColor: typeConfig.color,
                      },
                    ]}
                  >
                    <Ionicons
                      name={typeConfig.icon}
                      size={16}
                      color={
                        isSelected ? typeConfig.color : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.typeChipText,
                        isSelected && {
                          color: typeConfig.color,
                          fontWeight: "600",
                        },
                      ]}
                    >
                      {typeConfig.label}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </ScrollView>

          {/* Content editor */}
          <Text style={styles.sectionLabel}>Edit if needed</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            multiline
            style={styles.contentInput}
            placeholder="What did you do?"
            placeholderTextColor={colors.textMuted}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable onPress={onDismiss} style={styles.dismissButton}>
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={[
                styles.confirmButton,
                !content.trim() && styles.confirmButtonDisabled,
              ]}
              disabled={!content.trim()}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Save Learning</Text>
            </Pressable>
          </View>

          {/* Helper text */}
          <Text style={styles.helperText}>
            This will be saved to your recipe version and remembered for future
            cooking sessions.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing[4],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[4],
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing[2],
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
  },
  confidenceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    minWidth: 36,
    textAlign: "right",
  },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    marginBottom: spacing[5],
  },
  contextText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: spacing[2],
  },
  typeSelector: {
    paddingBottom: spacing[4],
    gap: spacing[2],
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeChipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  contentInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: spacing[5],
  },
  actions: {
    flexDirection: "row",
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  dismissButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 2,
    flexDirection: "row",
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  helperText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
