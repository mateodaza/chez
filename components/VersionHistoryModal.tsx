/**
 * VersionHistoryModal - Visual timeline of recipe version history
 *
 * Shows:
 * - Version lineage as a connected timeline
 * - Creation context (import, edit, cook session, source apply)
 * - Timestamps and parent relationships
 * - Tap to preview any version
 */

import { useMemo, useState } from "react";
import { View, Modal, Pressable, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { colors, spacing, borderRadius, layout } from "@/constants/theme";
import type { RecipeVersion } from "@/hooks/useRecipeWithVersion";

interface VersionHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  versions: RecipeVersion[];
  activeVersionId: string | null;
  previewedVersionId: string | null;
  onPreviewVersion: (versionId: string) => void;
  onDeleteVersion?: (versionId: string) => Promise<boolean>;
}

// Icon and color for each creation mode
const modeConfig: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  import: {
    icon: "cloud-download-outline",
    color: "#3B82F6", // blue
    label: "Imported",
  },
  edit: {
    icon: "pencil-outline",
    color: "#8B5CF6", // purple
    label: "Edited",
  },
  cook_session: {
    icon: "flame-outline",
    color: "#F59E0B", // amber
    label: "Cooked",
  },
  source_apply: {
    icon: "git-compare-outline",
    color: "#10B981", // emerald
    label: "From Source",
  },
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function VersionHistoryModal({
  visible,
  onClose,
  versions,
  activeVersionId,
  previewedVersionId,
  onPreviewVersion,
  onDeleteVersion,
}: VersionHistoryModalProps) {
  const insets = useSafeAreaInsets();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sort versions by version_number descending (newest first)
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => b.version_number - a.version_number);
  }, [versions]);

  const handleSelectVersion = (versionId: string) => {
    onPreviewVersion(versionId);
    onClose();
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!onDeleteVersion) return;

    setDeletingId(versionId);
    const success = await onDeleteVersion(versionId);
    setDeletingId(null);

    // If deleted successfully and was the last version viewed, modal might need update
    if (success && sortedVersions.length <= 1) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top + spacing[4] }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text variant="h3">Version History</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {Object.entries(modeConfig).map(([mode, config]) => (
            <View key={mode} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: config.color }]}
              />
              <Text variant="caption" color="textSecondary">
                {config.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Timeline */}
        <ScrollView
          style={styles.timeline}
          contentContainerStyle={styles.timelineContent}
          showsVerticalScrollIndicator={false}
        >
          {sortedVersions.map((version, index) => {
            const isActive = version.id === activeVersionId;
            const isPreviewing = version.id === previewedVersionId;
            const mode = version.created_from_mode || "edit";
            const config = modeConfig[mode] || modeConfig.edit;
            const isLast = index === sortedVersions.length - 1;

            return (
              <Pressable
                key={version.id}
                style={styles.timelineItem}
                onPress={() => handleSelectVersion(version.id)}
              >
                {/* Timeline connector */}
                <View style={styles.connectorContainer}>
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: config.color },
                      isActive && styles.timelineDotActive,
                    ]}
                  >
                    <Ionicons
                      name={config.icon}
                      size={14}
                      color={isActive ? colors.textOnPrimary : config.color}
                    />
                  </View>
                  {!isLast && <View style={styles.timelineLine} />}
                </View>

                {/* Version card */}
                <View
                  style={[
                    styles.versionCard,
                    isPreviewing && styles.versionCardPreviewing,
                    isActive && styles.versionCardActive,
                  ]}
                >
                  <View style={styles.versionHeader}>
                    <Text
                      variant="label"
                      color={isPreviewing ? "primary" : "textPrimary"}
                    >
                      v{version.version_number}
                    </Text>
                    <View style={styles.badges}>
                      {isActive && (
                        <View style={styles.activeBadge}>
                          <Text
                            variant="caption"
                            style={styles.activeBadgeText}
                          >
                            Active
                          </Text>
                        </View>
                      )}
                      {isPreviewing && !isActive && (
                        <View style={styles.previewingBadge}>
                          <Text
                            variant="caption"
                            style={styles.previewingBadgeText}
                          >
                            Viewing
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text variant="body" numberOfLines={1}>
                    {version.created_from_title || config.label}
                  </Text>

                  <View style={styles.versionMeta}>
                    <Text variant="caption" color="textMuted">
                      {formatDate(version.created_at)}
                    </Text>
                    {version.change_notes && (
                      <Text
                        variant="caption"
                        color="textMuted"
                        numberOfLines={1}
                        style={styles.changeNotes}
                      >
                        {version.change_notes.split("\n")[0]}
                      </Text>
                    )}
                  </View>

                  {/* Delete button - only for non-active, non-original versions when multiple exist */}
                  {onDeleteVersion &&
                    !isActive &&
                    sortedVersions.length > 1 &&
                    version.version_number !== 1 && (
                      <Pressable
                        style={styles.deleteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteVersion(version.id);
                        }}
                        disabled={deletingId === version.id}
                      >
                        {deletingId === version.id ? (
                          <Text variant="caption" color="textMuted">
                            Deleting...
                          </Text>
                        ) : (
                          <>
                            <Ionicons
                              name="trash-outline"
                              size={14}
                              color={colors.error}
                            />
                            <Text
                              variant="caption"
                              style={{ color: colors.error }}
                            >
                              Delete
                            </Text>
                          </>
                        )}
                      </Pressable>
                    )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
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
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing[4],
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeline: {
    flex: 1,
  },
  timelineContent: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: spacing[4],
  },
  timelineItem: {
    flexDirection: "row",
    gap: spacing[3],
  },
  connectorContainer: {
    alignItems: "center",
    width: 32,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.border,
  },
  timelineDotActive: {
    borderWidth: 0,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: spacing[1],
  },
  versionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[1],
  },
  versionCardPreviewing: {
    borderColor: colors.primary,
    backgroundColor: "#FFF7ED", // Orange 50 - light bg for good contrast
  },
  versionCardActive: {
    borderColor: colors.primary,
  },
  versionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badges: {
    flexDirection: "row",
    gap: spacing[2],
  },
  activeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  activeBadgeText: {
    color: colors.textOnPrimary,
    fontSize: 10,
  },
  previewingBadge: {
    backgroundColor: "#FFF7ED", // Orange 50 - light bg for good contrast
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  previewingBadgeText: {
    color: colors.primaryDark,
    fontSize: 10,
  },
  versionMeta: {
    flexDirection: "row",
    gap: spacing[2],
    alignItems: "center",
  },
  changeNotes: {
    flex: 1,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    marginTop: spacing[2],
    paddingVertical: spacing[1],
  },
});
