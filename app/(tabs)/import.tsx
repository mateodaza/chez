import { useState, useCallback, useEffect } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import {
  detectPlatform,
  getPlatformDisplayName,
  type PlatformDetectionResult,
} from "@/lib/extraction";

type ImportState = "idle" | "validating" | "importing" | "success" | "error";

interface ImportError {
  message: string;
  fallbackMode?: boolean;
  upgradeRequired?: boolean;
  resetsAt?: string;
}

export default function ImportScreen() {
  const [url, setUrl] = useState("");
  const [importState, setImportState] = useState<ImportState>("idle");
  const [error, setError] = useState<ImportError | null>(null);
  const [detection, setDetection] = useState<PlatformDetectionResult | null>(
    null
  );
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);

  // Check clipboard for video URLs
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

  // Check on mount
  useEffect(() => {
    checkClipboard();
  }, [checkClipboard]);

  // Re-check when screen gains focus
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
      // Get session to pass auth token explicitly
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

      // Handle auth errors - session may have expired
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
        // Handle specific error cases
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

      // Success - navigate to recipe detail
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

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 16, color: "#666" }}>
          Paste a video URL from TikTok, YouTube, or Instagram
        </Text>
        {clipboardUrl && !url && (
          <Pressable
            onPress={handlePasteFromClipboard}
            style={{
              backgroundColor: "#dbeafe",
              padding: 12,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Text style={{ color: "#1d4ed8", fontSize: 14, flex: 1 }}>
              Video URL detected in clipboard
            </Text>
            <View
              style={{
                backgroundColor: "#1d4ed8",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "white", fontWeight: "600", fontSize: 13 }}>
                Paste
              </Text>
            </View>
          </Pressable>
        )}
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <TextInput
            value={url}
            onChangeText={handleUrlChange}
            placeholder="https://www.tiktok.com/..."
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!isLoading}
            style={{
              backgroundColor: "#f3f4f6",
              padding: 16,
              borderRadius: 12,
              fontSize: 16,
              borderWidth: error && !error.upgradeRequired ? 1 : 0,
              borderColor: "#ef4444",
            }}
          />

          {/* Platform detection feedback */}
          {detection?.isValid && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 4,
                paddingTop: 4,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#22c55e",
                }}
              />
              <Text style={{ color: "#22c55e", fontSize: 14 }}>
                {getPlatformDisplayName(detection.platform)} video detected
              </Text>
            </View>
          )}

          {/* Error message */}
          {error && !error.upgradeRequired && (
            <Text
              style={{
                color: "#ef4444",
                fontSize: 14,
                paddingHorizontal: 4,
                paddingTop: 4,
              }}
            >
              {error.message}
            </Text>
          )}
        </View>

        <Pressable
          onPress={handleImport}
          disabled={!canImport}
          style={{
            backgroundColor: canImport ? "#f97316" : "#d1d5db",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: isLoading ? 0.8 : 1,
          }}
        >
          {isLoading && <ActivityIndicator color="white" />}
          <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
            {isLoading ? "Extracting Recipe..." : "Import Recipe"}
          </Text>
        </Pressable>
      </View>

      {/* Upgrade prompt */}
      {error?.upgradeRequired && (
        <View
          style={{
            backgroundColor: "#fef3c7",
            padding: 16,
            borderRadius: 12,
            gap: 8,
          }}
        >
          <Text style={{ fontWeight: "600", color: "#92400e" }}>
            Import Limit Reached
          </Text>
          <Text style={{ color: "#92400e", fontSize: 14 }}>
            {error.message}
          </Text>
          {error.resetsAt && (
            <Text style={{ color: "#92400e", fontSize: 12 }}>
              Resets on {new Date(error.resetsAt).toLocaleDateString()}
            </Text>
          )}
          <Pressable
            onPress={() => {
              // TODO: Navigate to paywall
              Alert.alert("Coming Soon", "Upgrade functionality coming soon!");
            }}
            style={{
              backgroundColor: "#f97316",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              Upgrade to Pro
            </Text>
          </Pressable>
        </View>
      )}

      {/* Fallback mode prompt */}
      {error?.fallbackMode && (
        <View
          style={{
            backgroundColor: "#f3f4f6",
            padding: 16,
            borderRadius: 12,
            gap: 8,
          }}
        >
          <Text style={{ fontWeight: "600", color: "#374151" }}>
            Manual Entry Required
          </Text>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>
            We couldn&apos;t automatically extract the recipe. You can enter it
            manually.
          </Text>
          <Pressable
            onPress={() => {
              router.push({
                pathname: "/manual-entry",
                params: {
                  platform: detection?.platform,
                  url: detection?.normalizedUrl,
                },
              });
            }}
            style={{
              backgroundColor: "#6b7280",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              Enter Manually
            </Text>
          </Pressable>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: "600" }}>
          Supported Platforms
        </Text>
        <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#22c55e",
              }}
            />
            <Text style={{ color: "#666" }}>YouTube</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#22c55e",
              }}
            />
            <Text style={{ color: "#666" }}>TikTok</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#22c55e",
              }}
            />
            <Text style={{ color: "#666" }}>Instagram</Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: "#9ca3af" }}>
          Auto-extraction supported. Manual entry available as fallback.
        </Text>
      </View>

      {/* Import tips */}
      <View
        style={{
          backgroundColor: "#f0fdf4",
          padding: 16,
          borderRadius: 12,
          gap: 8,
        }}
      >
        <Text style={{ fontWeight: "600", color: "#166534" }}>Tips</Text>
        <Text style={{ color: "#166534", fontSize: 14 }}>
          • Use direct video links, not profile pages{"\n"}• YouTube Shorts and
          regular videos both work{"\n"}• Make sure the video shows a recipe
          being made
        </Text>
      </View>
    </ScrollView>
  );
}
