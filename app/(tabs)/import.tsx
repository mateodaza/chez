import { useState, useCallback, useEffect } from "react";
import {
  ScrollView,
  View,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  Modal,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import {
  detectPlatform,
  getPlatformDisplayName,
  type PlatformDetectionResult,
} from "@/lib/extraction";
import { Text, Button, Card } from "@/components/ui";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import {
  colors,
  spacing,
  layout,
  borderRadius,
  fontFamily,
  fontSize,
} from "@/constants/theme";
import type {
  ImportResponse,
  ImportNeedsConfirmationResponse,
  ConfirmLinkResponse,
} from "@/types/database";

type ImportState =
  | "idle"
  | "validating"
  | "importing"
  | "confirming"
  | "success"
  | "error";

interface ImportError {
  message: string;
  fallbackMode?: boolean;
  upgradeRequired?: boolean;
  resetsAt?: string;
  potentialIssues?: string[];
}

interface SimilarRecipe {
  id: string;
  title: string;
  mode: string;
  source_count: number;
  times_cooked: number;
}

interface PendingConfirmation {
  source_link_id: string;
  extracted_recipe: {
    title: string;
    description: string | null;
    mode: string;
    cuisine: string | null;
    ingredients_count: number;
    steps_count: number;
  };
  similar_recipes: SimilarRecipe[];
}

export default function ImportScreen() {
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState("");
  const [importState, setImportState] = useState<ImportState>("idle");
  const [error, setError] = useState<ImportError | null>(null);
  const [detection, setDetection] = useState<PlatformDetectionResult | null>(
    null
  );
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);

  const checkClipboard = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        const result = detectPlatform(text.trim());
        if (result.isValid) {
          setClipboardUrl(text.trim());
        } else {
          setClipboardUrl(null);
        }
      }
    } catch {
      // Clipboard access may be denied
    }
  }, []);

  useEffect(() => {
    checkClipboard();
  }, [checkClipboard]);

  useFocusEffect(
    useCallback(() => {
      checkClipboard();
    }, [checkClipboard])
  );

  const handlePasteFromClipboard = () => {
    if (clipboardUrl) {
      setUrl(clipboardUrl);
      validateUrl(clipboardUrl);
      setClipboardUrl(null);
    }
  };

  const validateUrl = useCallback((input: string) => {
    if (!input.trim()) {
      setDetection(null);
      setError(null);
      return;
    }

    const result = detectPlatform(input);
    setDetection(result);

    if (!result.isValid && result.error) {
      setError({ message: result.error });
    } else {
      setError(null);
    }
  }, []);

  const handleUrlChange = (text: string) => {
    setUrl(text);
    setImportState("idle");
    validateUrl(text);
  };

  const handleImport = async () => {
    if (!url.trim() || !detection?.isValid) return;

    setImportState("importing");
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        Alert.alert("Session Expired", "Please sign in again to continue.", [
          { text: "OK", onPress: () => supabase.auth.signOut() },
        ]);
        setImportState("error");
        return;
      }

      const { data, error: fnError } =
        await supabase.functions.invoke<ImportResponse>("import-recipe", {
          body: { url: detection.normalizedUrl },
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

      if (fnError) {
        const errorMessage = fnError.message || "";
        if (
          errorMessage.includes("Invalid JWT") ||
          errorMessage.includes("401") ||
          errorMessage.includes("Authorization")
        ) {
          Alert.alert("Session Expired", "Please sign in again to continue.", [
            { text: "OK", onPress: () => supabase.auth.signOut() },
          ]);
          setImportState("error");
          return;
        }
        throw new Error(fnError.message || "Import failed");
      }

      if (!data) {
        throw new Error("No response from server");
      }

      // Handle needs_confirmation response
      if ("needs_confirmation" in data && data.needs_confirmation) {
        const confirmData = data as ImportNeedsConfirmationResponse;
        setPendingConfirmation({
          source_link_id: confirmData.source_link_id,
          extracted_recipe: confirmData.extracted_recipe,
          similar_recipes: confirmData.similar_recipes,
        });
        setImportState("confirming");
        return;
      }

      // Handle unsuccessful responses
      if (!data.success) {
        // Check for fallback mode first (server couldn't extract recipe automatically)
        if ("fallback_mode" in data && data.fallback_mode) {
          setError({
            message: data.message || "Could not extract recipe automatically.",
            fallbackMode: true,
            potentialIssues: data.potential_issues || [],
          });
          setImportState("error");
          return;
        }

        if ("upgrade_required" in data && data.upgrade_required) {
          setError({
            message: "You've reached your monthly import limit (3 recipes).",
            upgradeRequired: true,
            resetsAt: data.resets_at || undefined,
          });
          setImportState("error");
          return;
        }

        throw new Error("error" in data ? data.error : "Import failed");
      }

      // At this point, it must be ImportSuccessResponse (has recipe property)
      if (!("recipe" in data)) {
        throw new Error("Unexpected response format");
      }

      setImportState("success");
      setUrl("");
      setDetection(null);

      const recipeId = data.master_recipe_id;
      const recipeTitle = data.recipe.title || "Recipe";

      Alert.alert(
        "Recipe Imported!",
        `"${recipeTitle}" has been added to your library.`,
        [
          {
            text: "View Recipe",
            onPress: () => router.push(`/recipe/${recipeId}`),
          },
          { text: "Import Another", style: "cancel" },
        ]
      );
    } catch (err) {
      console.error("Import error:", err);
      setError({
        message: err instanceof Error ? err.message : "An error occurred",
      });
      setImportState("error");
    }
  };

  const handleConfirmLink = async (
    action: "link_existing" | "create_new",
    masterRecipeId?: string
  ) => {
    if (!pendingConfirmation) return;

    setConfirmingAction(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        Alert.alert("Session Expired", "Please sign in again to continue.");
        return;
      }

      const { data, error: fnError } =
        await supabase.functions.invoke<ConfirmLinkResponse>(
          "confirm-source-link",
          {
            body: {
              source_link_id: pendingConfirmation.source_link_id,
              action,
              master_recipe_id: masterRecipeId,
            },
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
          }
        );

      if (fnError) {
        throw new Error(fnError.message || "Failed to confirm");
      }

      if (!data) {
        throw new Error("No response from server");
      }

      if (!data.success) {
        if ("upgrade_required" in data && data.upgrade_required) {
          Alert.alert(
            "Import Limit Reached",
            data.message || "You've reached your monthly import limit."
          );
          setPendingConfirmation(null);
          setImportState("idle");
          return;
        }
        throw new Error("error" in data ? data.error : "Confirmation failed");
      }

      setPendingConfirmation(null);
      setImportState("success");
      setUrl("");
      setDetection(null);

      const recipeId = data.master_recipe_id;
      const recipeTitle = data.recipe?.title || "Recipe";

      Alert.alert(
        action === "link_existing" ? "Source Added!" : "Recipe Created!",
        data.message || `"${recipeTitle}" has been added to your library.`,
        [
          {
            text: "View Recipe",
            onPress: () => router.push(`/recipe/${recipeId}`),
          },
          { text: "Import Another", style: "cancel" },
        ]
      );
    } catch (err) {
      console.error("Confirm error:", err);
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to confirm"
      );
    } finally {
      setConfirmingAction(false);
    }
  };

  const handleRejectLink = async () => {
    if (!pendingConfirmation) return;

    setConfirmingAction(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;

      await supabase.functions.invoke("confirm-source-link", {
        body: {
          source_link_id: pendingConfirmation.source_link_id,
          action: "reject",
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });
    } catch {
      // Silent fail for rejection
    } finally {
      setPendingConfirmation(null);
      setImportState("idle");
      setConfirmingAction(false);
    }
  };

  const isLoading = importState === "importing";
  const canImport = url.trim() && detection?.isValid && !isLoading;

  const getPlatformIcon = (
    platform: string
  ): keyof typeof Ionicons.glyphMap => {
    switch (platform) {
      case "YouTube":
        return "logo-youtube";
      case "TikTok":
        return "logo-tiktok";
      case "Instagram":
        return "logo-instagram";
      default:
        return "globe-outline";
    }
  };

  const getPlatformColor = (platform: string): string => {
    switch (platform) {
      case "YouTube":
        return "#EF4444";
      case "TikTok":
        return "#000000";
      case "Instagram":
        return "#E1306C";
      default:
        return colors.textMuted;
    }
  };

  const getModeIcon = (mode: string): keyof typeof Ionicons.glyphMap => {
    switch (mode) {
      case "cooking":
        return "flame-outline";
      case "mixology":
        return "wine-outline";
      case "pastry":
        return "cafe-outline";
      default:
        return "restaurant-outline";
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing[4],
            paddingBottom: insets.bottom + spacing[8],
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="h1">Add Recipe</Text>
          <Text variant="body" color="textSecondary">
            Import from video or create your own
          </Text>
        </View>

        {/* Two main options */}
        <View style={styles.optionsRow}>
          {/* Import from Video Option */}
          <Pressable
            style={[styles.optionCard, styles.optionCardActive]}
            onPress={() => {}}
          >
            <View
              style={[styles.optionIconWrapper, { backgroundColor: "#FEE2E2" }]}
            >
              <Ionicons name="videocam" size={24} color="#DC2626" />
            </View>
            <Text variant="label" style={styles.optionTitle}>
              Import
            </Text>
            <Text
              variant="caption"
              color="textSecondary"
              style={styles.optionSubtitle}
            >
              From video URL
            </Text>
          </Pressable>

          {/* Create Recipe Option */}
          <Pressable
            style={styles.optionCard}
            onPress={() => router.push("/manual-entry")}
          >
            <View
              style={[styles.optionIconWrapper, { backgroundColor: "#DCFCE7" }]}
            >
              <Ionicons name="create" size={24} color="#16A34A" />
            </View>
            <Text variant="label" style={styles.optionTitle}>
              Create
            </Text>
            <Text
              variant="caption"
              color="textSecondary"
              style={styles.optionSubtitle}
            >
              Write or paste text
            </Text>
          </Pressable>
        </View>

        {/* Clipboard Banner */}
        {clipboardUrl && !url && (
          <Pressable
            onPress={handlePasteFromClipboard}
            style={styles.clipboardBanner}
          >
            <View style={styles.clipboardIcon}>
              <Ionicons name="clipboard" size={20} color={colors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label" color="info">
                Recipe URL detected
              </Text>
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {clipboardUrl}
              </Text>
            </View>
            <View style={styles.pasteButton}>
              <Text variant="buttonSmall" color="textOnPrimary">
                Paste
              </Text>
            </View>
          </Pressable>
        )}

        {/* URL Input */}
        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="link"
              size={20}
              color={detection?.isValid ? colors.success : colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              value={url}
              onChangeText={handleUrlChange}
              placeholder="Paste video URL here..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!isLoading}
              style={styles.input}
            />
            {url.length > 0 && (
              <Pressable
                onPress={() => {
                  setUrl("");
                  setDetection(null);
                  setError(null);
                }}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            )}
          </View>

          {/* Validation Feedback */}
          {detection?.isValid && (
            <View style={styles.validFeedback}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.success}
              />
              <Text variant="bodySmall" color="success">
                {getPlatformDisplayName(detection.platform)} video ready to
                import
              </Text>
            </View>
          )}

          {error && !error.upgradeRequired && !error.fallbackMode && (
            <View style={styles.errorFeedback}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text variant="bodySmall" color="error">
                {error.message}
              </Text>
            </View>
          )}
        </View>

        {/* Import Button */}
        <Button
          onPress={handleImport}
          disabled={!canImport}
          loading={isLoading}
          fullWidth
        >
          {isLoading ? "Extracting Recipe..." : "Import Recipe"}
        </Button>

        {/* Upgrade prompt */}
        {error?.upgradeRequired && (
          <Card variant="elevated" style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="alert-circle" size={24} color="#92400E" />
              <Text variant="h4" color="#92400E">
                Import Limit Reached
              </Text>
            </View>
            <Text variant="body" color="#78350F">
              {error.message}
            </Text>
            {error.resetsAt && (
              <Text variant="caption" color="#92400E">
                Resets on {new Date(error.resetsAt).toLocaleDateString()}
              </Text>
            )}
            <Button
              onPress={() =>
                Alert.alert("Coming Soon", "Upgrade functionality coming soon!")
              }
            >
              Upgrade to Pro
            </Button>
          </Card>
        )}

        {/* Fallback mode prompt */}
        {error?.fallbackMode && (
          <Card variant="outlined" style={styles.fallbackCard}>
            <View style={styles.fallbackHeader}>
              <Ionicons
                name="create-outline"
                size={24}
                color={colors.textPrimary}
              />
              <Text variant="h4">Manual Entry</Text>
            </View>
            <Text variant="body" color="textSecondary">
              We couldn&apos;t extract the recipe automatically. You can enter
              it manually instead.
            </Text>
            {error.potentialIssues && error.potentialIssues.length > 0 && (
              <View style={styles.potentialIssues}>
                <Text variant="label" color="textSecondary">
                  Possible reasons:
                </Text>
                {error.potentialIssues.map((issue, index) => (
                  <View key={index} style={styles.issueItem}>
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text variant="caption" color="textSecondary">
                      {issue}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <Button
              variant="secondary"
              onPress={() => {
                router.push({
                  pathname: "/manual-entry",
                  params: {
                    platform: detection?.platform,
                    url: detection?.normalizedUrl,
                  },
                });
              }}
            >
              Enter Manually
            </Button>
          </Card>
        )}

        {/* Supported platforms */}
        <View style={styles.platformsSection}>
          <Text
            variant="label"
            color="textSecondary"
            style={styles.platformsLabel}
          >
            Supported Platforms
          </Text>
          <View style={styles.platforms}>
            {["YouTube", "TikTok", "Instagram"].map((platform) => (
              <View key={platform} style={styles.platformItem}>
                <Ionicons
                  name={getPlatformIcon(platform)}
                  size={18}
                  color={getPlatformColor(platform)}
                />
                <Text variant="bodySmall" color="textSecondary">
                  {platform}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tips */}
        <Card variant="outlined" style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={18} color="#CA8A04" />
            <Text variant="label" color="#CA8A04">
              Tips for best results
            </Text>
          </View>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark" size={14} color="#65A30D" />
              <Text variant="caption" color="textSecondary">
                Use direct video links, not profile pages
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark" size={14} color="#65A30D" />
              <Text variant="caption" color="textSecondary">
                YouTube Shorts and regular videos both work
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark" size={14} color="#65A30D" />
              <Text variant="caption" color="textSecondary">
                Make sure the video shows a recipe being made
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Link Confirmation Modal */}
      <Modal
        visible={importState === "confirming" && !!pendingConfirmation}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleRejectLink}
      >
        <View
          style={[
            styles.modalContainer,
            { paddingTop: insets.top + spacing[4] },
          ]}
        >
          <View style={styles.modalHeader}>
            <Pressable
              onPress={handleRejectLink}
              style={styles.modalCloseButton}
              disabled={confirmingAction}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text variant="h3">Similar Recipe Found</Text>
            <View style={{ width: 44 }} />
          </View>

          {pendingConfirmation && (
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Extracted Recipe Preview */}
              <Card variant="outlined" style={styles.extractedPreview}>
                <View style={styles.previewHeader}>
                  <Ionicons name="sparkles" size={20} color={colors.primary} />
                  <Text variant="label">Extracted from video</Text>
                </View>
                <Text variant="h4">
                  {pendingConfirmation.extracted_recipe.title}
                </Text>
                {pendingConfirmation.extracted_recipe.description && (
                  <Text
                    variant="bodySmall"
                    color="textSecondary"
                    numberOfLines={2}
                  >
                    {pendingConfirmation.extracted_recipe.description}
                  </Text>
                )}
                <View style={styles.previewMeta}>
                  <View style={styles.previewMetaItem}>
                    <Ionicons
                      name={getModeIcon(
                        pendingConfirmation.extracted_recipe.mode
                      )}
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text variant="caption" color="textMuted">
                      {pendingConfirmation.extracted_recipe.mode}
                    </Text>
                  </View>
                  <View style={styles.previewMetaItem}>
                    <Ionicons
                      name="list-outline"
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text variant="caption" color="textMuted">
                      {pendingConfirmation.extracted_recipe.ingredients_count}{" "}
                      ingredients
                    </Text>
                  </View>
                  <View style={styles.previewMetaItem}>
                    <Ionicons
                      name="reader-outline"
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text variant="caption" color="textMuted">
                      {pendingConfirmation.extracted_recipe.steps_count} steps
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Similar Recipes Section */}
              <View style={styles.similarSection}>
                <Text variant="label" color="textSecondary">
                  This looks like a recipe you already have:
                </Text>

                {pendingConfirmation.similar_recipes.map((recipe) => (
                  <Pressable
                    key={recipe.id}
                    onPress={() =>
                      handleConfirmLink("link_existing", recipe.id)
                    }
                    disabled={confirmingAction}
                    style={styles.similarRecipeCard}
                  >
                    <View style={styles.similarRecipeIcon}>
                      <Ionicons
                        name={getModeIcon(recipe.mode)}
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.similarRecipeContent}>
                      <Text variant="label">{recipe.title}</Text>
                      <View style={styles.similarRecipeMeta}>
                        {recipe.source_count > 0 && (
                          <Text variant="caption" color="textMuted">
                            {recipe.source_count} source
                            {recipe.source_count > 1 ? "s" : ""}
                          </Text>
                        )}
                        {recipe.times_cooked > 0 && (
                          <Text variant="caption" color="textMuted">
                            Cooked {recipe.times_cooked}x
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.addSourceBadge}>
                      <Ionicons
                        name="add-circle"
                        size={16}
                        color={colors.primary}
                      />
                      <Text variant="caption" color="primary">
                        Add source
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* Create New Option */}
              <View style={styles.createNewSection}>
                <Text variant="bodySmall" color="textSecondary">
                  Or create as a separate recipe:
                </Text>
                <Button
                  variant="secondary"
                  onPress={() => handleConfirmLink("create_new")}
                  loading={confirmingAction}
                  disabled={confirmingAction}
                >
                  Create New Recipe
                </Button>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Loading Overlay */}
      <LoadingOverlay visible={isLoading} type="import" />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: layout.screenPaddingHorizontal,
    gap: spacing[5],
    paddingBottom: spacing[8],
  },
  header: {
    gap: spacing[1],
  },
  optionsRow: {
    flexDirection: "row",
    gap: spacing[3],
  },
  optionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: "center",
    gap: spacing[2],
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#FFF7ED",
  },
  optionIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[1],
  },
  optionTitle: {
    textAlign: "center",
  },
  optionSubtitle: {
    textAlign: "center",
  },
  clipboardBanner: {
    backgroundColor: "#EFF6FF",
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  clipboardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  pasteButton: {
    backgroundColor: colors.info,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  inputSection: {
    gap: spacing[2],
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[4],
  },
  inputIcon: {
    marginRight: spacing[2],
  },
  input: {
    flex: 1,
    paddingVertical: spacing[4],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  clearButton: {
    padding: spacing[1],
  },
  validFeedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[2],
  },
  errorFeedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[2],
  },
  warningCard: {
    backgroundColor: "#FEF3C7",
    gap: spacing[3],
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  fallbackCard: {
    gap: spacing[3],
  },
  fallbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  potentialIssues: {
    gap: spacing[1],
    paddingVertical: spacing[2],
  },
  issueItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingLeft: spacing[1],
  },
  platformsSection: {
    gap: spacing[3],
  },
  platformsLabel: {
    marginLeft: spacing[1],
  },
  platforms: {
    flexDirection: "row",
    gap: spacing[6],
  },
  platformItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  tipsCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    gap: spacing[3],
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  tipsList: {
    gap: spacing[2],
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingBottom: spacing[4],
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: layout.screenPaddingHorizontal,
    gap: spacing[5],
    paddingBottom: spacing[8],
  },
  extractedPreview: {
    gap: spacing[2],
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  previewMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
    marginTop: spacing[2],
  },
  previewMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  similarSection: {
    gap: spacing[3],
  },
  similarRecipeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[3],
  },
  similarRecipeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  similarRecipeContent: {
    flex: 1,
    gap: spacing[1],
  },
  similarRecipeMeta: {
    flexDirection: "row",
    gap: spacing[3],
  },
  addSourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    backgroundColor: "#FFF7ED", // Orange 50 - light bg for good contrast
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  createNewSection: {
    gap: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
