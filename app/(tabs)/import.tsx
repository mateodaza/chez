import { useState, useCallback, useEffect } from "react";
import {
  ScrollView,
  View,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
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
import {
  colors,
  spacing,
  layout,
  borderRadius,
  fontFamily,
  fontSize,
} from "@/constants/theme";

type ImportState = "idle" | "validating" | "importing" | "success" | "error";

interface ImportError {
  message: string;
  fallbackMode?: boolean;
  upgradeRequired?: boolean;
  resetsAt?: string;
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

      const { data, error: fnError } = await supabase.functions.invoke(
        "import-recipe",
        {
          body: { url: detection.normalizedUrl },
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

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

      if (!data?.success) {
        if (data.upgrade_required) {
          setError({
            message: "You've reached your monthly import limit (3 recipes).",
            upgradeRequired: true,
            resetsAt: data.resets_at,
          });
          setImportState("error");
          return;
        }

        if (data.fallback_mode) {
          setError({
            message: data.message || "Could not extract recipe automatically.",
            fallbackMode: true,
          });
          setImportState("error");
          return;
        }

        throw new Error(data.error || "Import failed");
      }

      setImportState("success");
      setUrl("");
      setDetection(null);

      Alert.alert(
        "Recipe Imported!",
        `"${data.recipe.title}" has been added to your library.`,
        [
          {
            text: "View Recipe",
            onPress: () => router.push(`/recipe/${data.recipe_id}`),
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

  return (
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
        <Text variant="h1">Import</Text>
        <Text variant="body" color="textSecondary">
          Add recipes from your favorite videos
        </Text>
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
              {getPlatformDisplayName(detection.platform)} video ready to import
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
            We couldn&apos;t extract the recipe automatically. You can enter it
            manually instead.
          </Text>
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
});
