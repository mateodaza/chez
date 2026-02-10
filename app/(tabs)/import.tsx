import { useState, useCallback, useEffect } from "react";
import {
  ScrollView,
  View,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  Modal,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useFocusEffect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Analytics } from "@/lib/analytics";
import {
  detectPlatform,
  getPlatformDisplayName,
  type PlatformDetectionResult,
} from "@/lib/extraction";
import { Text, Button, Card, getModeIcon } from "@/components/ui";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useSubscription } from "@/hooks/useSubscription";
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

const FREE_IMPORT_LIMIT = 3;

type ImportState = "idle" | "validating" | "importing" | "confirming" | "error";

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
  const { isChef } = useSubscription();
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
  const [importsUsed, setImportsUsed] = useState(0);
  const [importsResetAt, setImportsResetAt] = useState<string | null>(null);

  const fetchImportUsage = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("imports_this_month, imports_reset_at")
        .eq("id", user.id)
        .single();
      if (!data) return;

      const now = new Date();
      const resetAt = data.imports_reset_at
        ? new Date(data.imports_reset_at)
        : null;
      if (resetAt && now > resetAt) {
        // Monthly counter has reset
        setImportsUsed(0);
        setImportsResetAt(null);
      } else {
        setImportsUsed(data.imports_this_month || 0);
        setImportsResetAt(data.imports_reset_at);
      }
    } catch {
      // Non-critical — fail silently
    }
  }, []);

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
    fetchImportUsage();
  }, [checkClipboard, fetchImportUsage]);

  useFocusEffect(
    useCallback(() => {
      checkClipboard();
      fetchImportUsage();
    }, [checkClipboard, fetchImportUsage])
  );

  const handlePasteFromClipboard = () => {
    if (clipboardUrl) {
      Haptics.selectionAsync();
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

  const showSuccess = (recipeId: string) => {
    setUrl("");
    setDetection(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Hide loading overlay, then navigate after Modal fade-out completes
    setImportState("idle");
    setTimeout(() => {
      router.push(`/recipe/${recipeId}`);
    }, 500);
  };

  const handleImport = async () => {
    if (!url.trim() || !detection?.isValid || importState === "importing")
      return;

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

      // Handle needs_confirmation — hide loading, then show confirmation after fade-out
      if ("needs_confirmation" in data && data.needs_confirmation) {
        const confirmData = data as ImportNeedsConfirmationResponse;
        const confirmation: PendingConfirmation = {
          source_link_id: confirmData.source_link_id,
          extracted_recipe: confirmData.extracted_recipe,
          similar_recipes: confirmData.similar_recipes,
        };
        setImportState("idle");
        setTimeout(() => {
          setPendingConfirmation(confirmation);
          setImportState("confirming");
        }, 500);
        return;
      }

      // Handle unsuccessful responses
      if (!data.success) {
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

      if (!("recipe" in data)) {
        throw new Error("Unexpected response format");
      }

      // Handle already imported
      if ("already_imported" in data && data.already_imported) {
        setImportState("idle");
        const recipeName = data.recipe?.title || "this recipe";
        const recipeId = data.master_recipe_id;
        Alert.alert(
          "Already Imported",
          `"${recipeName}" is already in your library.`,
          [
            { text: "Cancel", style: "cancel" },
            ...(recipeId
              ? [
                  {
                    text: "View Recipe",
                    onPress: () => router.push(`/recipe/${recipeId}`),
                  },
                ]
              : []),
          ]
        );
        return;
      }

      // Track successful import
      const source = detection?.platform || "manual";
      Analytics.recipeImported(
        source as "tiktok" | "instagram" | "youtube" | "manual"
      );

      // Update local import count immediately
      setImportsUsed((prev) => prev + 1);

      showSuccess(data.master_recipe_id);
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
          setPendingConfirmation(null);
          setError({
            message:
              data.message ||
              "You've reached your monthly import limit (3 recipes).",
            upgradeRequired: true,
            resetsAt:
              "resets_at" in data ? (data.resets_at as string) : undefined,
          });
          setImportState("error");
          return;
        }
        throw new Error("error" in data ? data.error : "Confirmation failed");
      }

      setPendingConfirmation(null);

      // Track successful import from confirmation flow
      const source = detection?.platform || "manual";
      Analytics.recipeImported(
        source as "tiktok" | "instagram" | "youtube" | "manual"
      );

      setImportsUsed((prev) => prev + 1);
      showSuccess(data.master_recipe_id);
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

  const handleDismissConfirmation = () => {
    // Dismissing = create as new recipe (the scan was already used)
    handleConfirmLink("create_new");
  };

  const isLoading = importState === "importing";
  const atImportLimit = !isChef && importsUsed >= FREE_IMPORT_LIMIT;
  const canImport =
    url.trim() && detection?.isValid && !isLoading && !atImportLimit;

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
          {/* Import from Video Option - active state */}
          <View style={[styles.optionCard, styles.optionCardActive]}>
            <View
              style={[styles.optionIconWrapper, { backgroundColor: "#FFEDD5" }]}
            >
              <Ionicons name="link" size={24} color="#EA580C" />
            </View>
            <Text variant="label" style={styles.optionTitle}>
              Import
            </Text>
            <Text
              variant="caption"
              color="textMuted"
              style={styles.optionSubtitle}
            >
              From a video link
            </Text>
          </View>

          {/* Create Recipe Option */}
          <Pressable
            style={[styles.optionCard, styles.optionCardCreate]}
            onPress={() => router.push("/manual-entry")}
          >
            <View
              style={[styles.optionIconWrapper, { backgroundColor: "#DCFCE7" }]}
            >
              <Ionicons name="document-text" size={24} color="#16A34A" />
            </View>
            <Text variant="label" style={styles.optionTitle}>
              Create
            </Text>
            <Text
              variant="caption"
              color="textMuted"
              style={styles.optionSubtitle}
            >
              Type or paste text
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
              <Ionicons name="clipboard" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label" color="primary">
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
          <View
            style={[
              styles.inputWrapper,
              error &&
                !error.upgradeRequired &&
                !error.fallbackMode &&
                importState === "error" &&
                styles.inputWrapperError,
            ]}
          >
            <Ionicons
              name="link"
              size={20}
              color={
                detection?.isValid && importState !== "error"
                  ? colors.success
                  : colors.textMuted
              }
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
                  setImportState("idle");
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
          {detection?.isValid && importState !== "error" && (
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

        {/* Import usage for free users */}
        {!isChef && (
          <Pressable
            style={styles.usageBadge}
            onPress={atImportLimit ? () => router.push("/paywall") : undefined}
          >
            <Text
              variant="caption"
              color={atImportLimit ? "primary" : "textMuted"}
            >
              {importsUsed}/{FREE_IMPORT_LIMIT} imports
              {importsResetAt && atImportLimit
                ? ` · resets ${new Date(importsResetAt).toLocaleDateString()}`
                : ""}
            </Text>
            {atImportLimit && (
              <Text
                variant="caption"
                color="primary"
                style={{ fontWeight: "600" }}
              >
                {" "}
                · Upgrade
              </Text>
            )}
          </Pressable>
        )}

        {/* Upgrade prompt from backend error */}
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
            <Button onPress={() => router.push("/paywall")}>
              Upgrade to Chef
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
        onRequestClose={handleDismissConfirmation}
      >
        <View
          style={[
            styles.modalContainer,
            { paddingTop: insets.top + spacing[4] },
          ]}
        >
          <View style={styles.modalHeader}>
            <Pressable
              onPress={handleDismissConfirmation}
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
                  You already have a similar recipe:
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
                        name="book-outline"
                        size={20}
                        color={colors.textOnPrimary}
                      />
                    </View>
                    <View style={styles.similarRecipeContent}>
                      <Text variant="label">{recipe.title}</Text>
                      <View style={styles.similarRecipeMeta}>
                        {recipe.source_count > 0 && (
                          <Text variant="caption" color="textMuted">
                            {recipe.source_count} video
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
                        Link video
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

type NativeStyle = (ViewStyle & ImageStyle) & { boxShadow?: string };

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
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[4],
    alignItems: "center",
    gap: spacing[2],
    borderWidth: 1,
    borderColor: "rgba(234, 88, 12, 0.1)",
    backgroundColor: "#FFF7ED",
  } as NativeStyle,
  optionCardActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  optionCardCreate: {
    backgroundColor: "#F0FDF4",
    borderColor: "rgba(22, 163, 106, 0.12)",
  },
  optionIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[1],
  } as NativeStyle,
  optionTitle: {
    textAlign: "center",
  },
  optionSubtitle: {
    textAlign: "center",
  },
  // Clipboard
  clipboardBanner: {
    backgroundColor: "#FFF7ED",
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  clipboardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  pasteButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  // Input
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
  inputWrapperError: {
    borderColor: colors.error,
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
  usageBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1],
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
    backgroundColor: colors.primary,
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
    backgroundColor: "#FFF7ED",
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
