/**
 * SourceBrowserModal - Browse and switch between recipe sources
 *
 * Shows all linked sources for a recipe, allowing users to:
 * - See all sources with creator info
 * - Compare current version with any source
 * - Apply a source's data as a new version
 */

import { useState, useMemo } from "react";
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { colors, spacing, borderRadius, layout } from "@/constants/theme";
import type { SourceLinkWithVideo } from "@/hooks/useRecipeWithVersion";

interface SourceBrowserModalProps {
  visible: boolean;
  onClose: () => void;
  sources: SourceLinkWithVideo[];
  currentSourceId: string | null; // The source the current version is based on
  onCompareWithSource: (source: SourceLinkWithVideo) => void;
  onApplySource: (source: SourceLinkWithVideo) => Promise<void>;
}

const platformIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  youtube: "logo-youtube",
  tiktok: "logo-tiktok",
  instagram: "logo-instagram",
};

const platformColors: Record<string, string> = {
  youtube: "#FF0000",
  tiktok: "#000000",
  instagram: "#E4405F",
};

export function SourceBrowserModal({
  visible,
  onClose,
  sources,
  currentSourceId,
  onCompareWithSource,
  onApplySource,
}: SourceBrowserModalProps) {
  const insets = useSafeAreaInsets();
  const [applyingSourceId, setApplyingSourceId] = useState<string | null>(null);

  // Filter to sources with valid extracted data
  const validSources = useMemo(() => {
    return sources.filter((source) => {
      const hasIngredients =
        source.extracted_ingredients &&
        Array.isArray(source.extracted_ingredients) &&
        source.extracted_ingredients.length > 0;
      const hasSteps =
        source.extracted_steps &&
        Array.isArray(source.extracted_steps) &&
        source.extracted_steps.length > 0;
      return hasIngredients && hasSteps;
    });
  }, [sources]);

  const handleApplySource = async (source: SourceLinkWithVideo) => {
    setApplyingSourceId(source.id);
    try {
      await onApplySource(source);
      onClose();
    } finally {
      setApplyingSourceId(null);
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
          <Text variant="h3">Recipe Sources</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Subtitle */}
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          {validSources.length} source{validSources.length !== 1 ? "s" : ""}{" "}
          linked
        </Text>

        {/* Sources List */}
        <ScrollView
          style={styles.sourcesList}
          contentContainerStyle={styles.sourcesContent}
          showsVerticalScrollIndicator={false}
        >
          {validSources.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="videocam-off-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text variant="body" color="textMuted" style={styles.emptyText}>
                No sources with extracted recipes found.
              </Text>
            </View>
          ) : (
            validSources.map((source) => {
              const isCurrentSource = source.id === currentSourceId;
              const platform = source.video_sources?.source_platform || "web";
              const platformIcon = platformIcons[platform] || "globe-outline";
              const platformColor =
                platformColors[platform] || colors.textMuted;
              const ingredientCount = Array.isArray(
                source.extracted_ingredients
              )
                ? source.extracted_ingredients.length
                : 0;
              const stepCount = Array.isArray(source.extracted_steps)
                ? source.extracted_steps.length
                : 0;

              return (
                <View
                  key={source.id}
                  style={[
                    styles.sourceCard,
                    isCurrentSource && styles.sourceCardActive,
                  ]}
                >
                  {/* Thumbnail */}
                  {source.video_sources?.source_thumbnail_url ? (
                    <Image
                      source={{
                        uri: source.video_sources.source_thumbnail_url,
                      }}
                      style={styles.thumbnail}
                    />
                  ) : (
                    <View
                      style={[styles.thumbnail, styles.thumbnailPlaceholder]}
                    >
                      <Ionicons
                        name={platformIcon}
                        size={24}
                        color={platformColor}
                      />
                    </View>
                  )}

                  {/* Source Info */}
                  <View style={styles.sourceInfo}>
                    <View style={styles.sourceHeader}>
                      <View style={styles.creatorRow}>
                        <Ionicons
                          name={platformIcon}
                          size={14}
                          color={platformColor}
                        />
                        <Text variant="label" numberOfLines={1}>
                          {source.video_sources?.source_creator || "Unknown"}
                        </Text>
                      </View>
                      {isCurrentSource && (
                        <View style={styles.currentBadge}>
                          <Text
                            variant="caption"
                            style={styles.currentBadgeText}
                          >
                            Current
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text variant="caption" color="textMuted">
                      {ingredientCount} ingredients, {stepCount} steps
                    </Text>

                    {/* Actions */}
                    <View style={styles.sourceActions}>
                      <Pressable
                        style={styles.actionButton}
                        onPress={() => {
                          onCompareWithSource(source);
                          onClose();
                        }}
                      >
                        <Ionicons
                          name="git-compare-outline"
                          size={14}
                          color={colors.primary}
                        />
                        <Text variant="caption" color="primary">
                          Compare
                        </Text>
                      </Pressable>

                      {!isCurrentSource && (
                        <Pressable
                          style={styles.actionButton}
                          onPress={() => handleApplySource(source)}
                          disabled={applyingSourceId === source.id}
                        >
                          {applyingSourceId === source.id ? (
                            <Text variant="caption" color="textMuted">
                              Applying...
                            </Text>
                          ) : (
                            <>
                              <Ionicons
                                name="arrow-forward-circle-outline"
                                size={14}
                                color={colors.primary}
                              />
                              <Text variant="caption" color="primary">
                                Use This
                              </Text>
                            </>
                          )}
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
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
    marginBottom: spacing[2],
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    marginBottom: spacing[4],
  },
  sourcesList: {
    flex: 1,
  },
  sourcesContent: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    gap: spacing[3],
    paddingBottom: spacing[6],
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[12],
    gap: spacing[4],
  },
  emptyText: {
    textAlign: "center",
  },
  sourceCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  sourceCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#FFF7ED", // Orange 50 - light bg for good contrast
  },
  thumbnail: {
    width: 80,
    height: 80,
  },
  thumbnailPlaceholder: {
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  sourceInfo: {
    flex: 1,
    padding: spacing[3],
    gap: spacing[2],
  },
  sourceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    flex: 1,
  },
  currentBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  currentBadgeText: {
    color: colors.textOnPrimary,
    fontSize: 10,
  },
  sourceActions: {
    flexDirection: "row",
    gap: spacing[4],
    marginTop: spacing[1],
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
});
