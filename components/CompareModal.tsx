/**
 * CompareModal - Shows differences between current version and original source
 *
 * Features:
 * - Displays top 3 diffs by default with "Show all" option
 * - Color-coded diff items (modified, added, removed)
 * - "Apply Original as New Version" action
 */

import { useState, useMemo } from "react";
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import {
  colors,
  spacing,
  borderRadius,
  layout,
  fontFamily,
  fontSize,
} from "@/constants/theme";
import type { VersionIngredient, VersionStep } from "@/types/database";
import {
  compareVersions,
  getTopDiffs,
  type RecipeDiff,
  type CompareResult,
} from "@/lib/utils/compareVersions";

interface CompareModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyOriginal: () => Promise<void>;
  sourceLabel: string; // e.g., "Joshua Weissman" or "Source #1"
  originalIngredients: VersionIngredient[];
  originalSteps: VersionStep[];
  currentIngredients: VersionIngredient[];
  currentSteps: VersionStep[];
  versionLabel?: string; // e.g., "v3" or "My Version"
}

// Diff item colors
const diffColors = {
  modified: {
    bg: "#FEF3C7", // amber-100
    border: "#F59E0B", // amber-500
    icon: "swap-horizontal" as const,
    iconColor: "#D97706", // amber-600
  },
  added: {
    bg: "#DCFCE7", // green-100
    border: "#22C55E", // green-500
    icon: "add-circle" as const,
    iconColor: "#16A34A", // green-600
  },
  removed: {
    bg: "#FEE2E2", // red-100
    border: "#EF4444", // red-500
    icon: "remove-circle" as const,
    iconColor: "#DC2626", // red-600
  },
};

function DiffItem({ diff }: { diff: RecipeDiff }) {
  const colorScheme = diffColors[diff.type];

  return (
    <View
      style={[
        styles.diffItem,
        {
          backgroundColor: colorScheme.bg,
          borderLeftColor: colorScheme.border,
        },
      ]}
    >
      <View style={styles.diffIconContainer}>
        <Ionicons
          name={colorScheme.icon}
          size={20}
          color={colorScheme.iconColor}
        />
      </View>
      <View style={styles.diffContent}>
        <Text variant="label" style={styles.diffCategory}>
          {diff.category === "ingredient" ? "Ingredient" : "Step"}
        </Text>
        <Text variant="body" style={styles.diffSummary}>
          {diff.summary}
        </Text>
      </View>
    </View>
  );
}

export function CompareModal({
  visible,
  onClose,
  onApplyOriginal,
  sourceLabel,
  originalIngredients,
  originalSteps,
  currentIngredients,
  currentSteps,
  versionLabel = "Your Version",
}: CompareModalProps) {
  const insets = useSafeAreaInsets();
  const [showAll, setShowAll] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Calculate diffs
  const compareResult: CompareResult = useMemo(() => {
    return compareVersions(
      originalIngredients,
      originalSteps,
      currentIngredients,
      currentSteps
    );
  }, [originalIngredients, originalSteps, currentIngredients, currentSteps]);

  const topDiffs = useMemo(
    () => getTopDiffs(compareResult, 3),
    [compareResult]
  );

  const diffsToShow = showAll ? compareResult.diffs : topDiffs;
  const hasMoreDiffs = compareResult.diffs.length > 3;

  const handleApplyOriginal = async () => {
    setIsApplying(true);
    try {
      await onApplyOriginal();
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setShowAll(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingTop: insets.top + spacing[4] }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text variant="h3">Compare</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Comparison labels */}
        <View style={styles.comparisonHeader}>
          <View style={styles.comparisonLabel}>
            <Ionicons
              name="videocam-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text variant="bodySmall" color="textSecondary" numberOfLines={1}>
              {sourceLabel}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
          <View style={styles.comparisonLabel}>
            <Ionicons
              name="create-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text variant="bodySmall" color="textSecondary" numberOfLines={1}>
              {versionLabel}
            </Text>
          </View>
        </View>

        {/* Summary stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="h2" style={{ color: colors.primary }}>
              {compareResult.totalChanges}
            </Text>
            <Text variant="bodySmall" color="textSecondary">
              Total Changes
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text variant="h2" style={{ color: colors.textPrimary }}>
              {compareResult.ingredientChanges}
            </Text>
            <Text variant="bodySmall" color="textSecondary">
              Ingredients
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text variant="h2" style={{ color: colors.textPrimary }}>
              {compareResult.stepChanges}
            </Text>
            <Text variant="bodySmall" color="textSecondary">
              Steps
            </Text>
          </View>
        </View>

        {/* Diffs list */}
        <ScrollView
          style={styles.diffsList}
          contentContainerStyle={styles.diffsContent}
          showsVerticalScrollIndicator={false}
        >
          {!compareResult.hasChanges ? (
            <View style={styles.noDiffsContainer}>
              <Ionicons
                name="checkmark-circle"
                size={48}
                color={colors.success}
              />
              <Text
                variant="body"
                color="textSecondary"
                style={styles.noDiffsText}
              >
                No differences found. Your version matches the original source.
              </Text>
            </View>
          ) : (
            <>
              {diffsToShow.map((diff, index) => (
                <DiffItem key={`${diff.category}-${index}`} diff={diff} />
              ))}

              {hasMoreDiffs && !showAll && (
                <Pressable
                  onPress={() => setShowAll(true)}
                  style={styles.showMoreButton}
                >
                  <Text variant="label" style={{ color: colors.primary }}>
                    Show {compareResult.diffs.length - 3} more differences
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={colors.primary}
                  />
                </Pressable>
              )}

              {showAll && hasMoreDiffs && (
                <Pressable
                  onPress={() => setShowAll(false)}
                  style={styles.showMoreButton}
                >
                  <Text variant="label" style={{ color: colors.primary }}>
                    Show less
                  </Text>
                  <Ionicons
                    name="chevron-up"
                    size={16}
                    color={colors.primary}
                  />
                </Pressable>
              )}
            </>
          )}
        </ScrollView>

        {/* Actions */}
        <View
          style={[
            styles.actions,
            { paddingBottom: Math.max(insets.bottom, spacing[4]) },
          ]}
        >
          {compareResult.hasChanges && (
            <Button
              variant="secondary"
              onPress={handleApplyOriginal}
              loading={isApplying}
              fullWidth
            >
              Apply Original as New Version
            </Button>
          )}
          <Button variant="ghost" onPress={handleClose} fullWidth>
            {compareResult.hasChanges ? "Keep My Version" : "Close"}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: layout.screenPaddingHorizontal,
    marginBottom: spacing[4],
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[3],
    paddingHorizontal: layout.screenPaddingHorizontal,
    marginBottom: spacing[4],
  },
  comparisonLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    maxWidth: "40%",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: layout.screenPaddingHorizontal,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  diffsList: {
    flex: 1,
  },
  diffsContent: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  diffItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    gap: spacing[3],
  },
  diffIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  diffContent: {
    flex: 1,
    gap: spacing[1],
  },
  diffCategory: {
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  diffSummary: {
    color: colors.textPrimary,
  },
  noDiffsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[12],
    gap: spacing[4],
  },
  noDiffsText: {
    textAlign: "center",
    paddingHorizontal: spacing[8],
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  actions: {
    gap: spacing[3],
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
