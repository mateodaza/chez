import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";

// TODO: Phase 3 - Enhance manual entry with:
// - Mode picker (cooking/mixology/pastry)
// - Ingredient parser with quantity detection
// - Step-by-step builder
// - Image/video attachment
// - Voice-to-text input

export default function ManualEntryScreen() {
  const params = useLocalSearchParams<{ platform?: string; url?: string }>();

  const [title, setTitle] = useState("");
  const [recipeText, setRecipeText] = useState("");
  const [creator, setCreator] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Require both title and recipe text for manual entries
  const canSubmit = title.trim() && recipeText.trim() && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Get session to pass auth token explicitly (mirrors import flow)
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        Alert.alert("Session Expired", "Please sign in again to continue.", [
          { text: "OK", onPress: () => supabase.auth.signOut() },
        ]);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        "import-recipe",
        {
          body: {
            url: params.url || null,
            manual_content: {
              title: title.trim(),
              recipe_text: recipeText.trim(),
              creator: creator.trim() || null,
            },
          },
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
          return;
        }
        throw new Error(fnError.message || "Failed to process recipe");
      }

      if (!data?.success) {
        if (data.upgrade_required) {
          Alert.alert(
            "Import Limit Reached",
            data.message || "You've reached your monthly limit.",
            [{ text: "OK", onPress: () => router.back() }]
          );
          return;
        }
        throw new Error(data.error || "Failed to process recipe");
      }

      // Success - use master_recipe_id from the new schema
      const recipeId = data.master_recipe_id || data.recipe?.id;
      Alert.alert(
        "Recipe Created!",
        `"${data.recipe.title}" has been added to your library.`,
        [
          {
            text: "View Recipe",
            onPress: () => {
              router.dismiss();
              router.push(`/recipe/${recipeId}`);
            },
          },
          {
            text: "Done",
            style: "cancel",
            onPress: () => router.dismiss(),
          },
        ]
      );
    } catch (err) {
      console.error("Manual entry error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header info */}
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 14, color: "#6b7280" }}>
            Paste or type the recipe details below. Our AI will extract
            ingredients and steps automatically.
          </Text>
          {params.platform && (
            <Text style={{ fontSize: 12, color: "#9ca3af" }}>
              Source: {params.platform}
            </Text>
          )}
        </View>

        {/* Title field */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}>
            Recipe Title *
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Creamy Garlic Pasta"
            placeholderTextColor="#9ca3af"
            editable={!isSubmitting}
            style={{
              backgroundColor: "#f3f4f6",
              padding: 14,
              borderRadius: 10,
              fontSize: 16,
            }}
          />
        </View>

        {/* Creator field */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}>
            Creator (optional)
          </Text>
          <TextInput
            value={creator}
            onChangeText={setCreator}
            placeholder="e.g., @cookingwithclara"
            placeholderTextColor="#9ca3af"
            editable={!isSubmitting}
            style={{
              backgroundColor: "#f3f4f6",
              padding: 14,
              borderRadius: 10,
              fontSize: 16,
            }}
          />
        </View>

        {/* Recipe text field */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}>
            Recipe Details *
          </Text>
          <Text style={{ fontSize: 12, color: "#9ca3af" }}>
            Paste the video caption or describe the recipe with ingredients
          </Text>
          <TextInput
            value={recipeText}
            onChangeText={setRecipeText}
            placeholder="Include ingredients and cooking steps..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            editable={!isSubmitting}
            style={{
              backgroundColor: "#f3f4f6",
              padding: 14,
              borderRadius: 10,
              fontSize: 16,
              minHeight: 180,
            }}
          />
        </View>

        {/* Error message */}
        {error && (
          <View
            style={{
              backgroundColor: "#fef2f2",
              padding: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#dc2626", fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {/* Submit button */}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{
            backgroundColor: canSubmit ? "#f97316" : "#d1d5db",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: isSubmitting ? 0.8 : 1,
          }}
        >
          {isSubmitting && <ActivityIndicator color="white" />}
          <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
            {isSubmitting ? "Processing..." : "Create Recipe"}
          </Text>
        </Pressable>

        {/* Tips */}
        <View
          style={{
            backgroundColor: "#f0fdf4",
            padding: 14,
            borderRadius: 10,
            gap: 6,
          }}
        >
          <Text style={{ fontWeight: "600", color: "#166534", fontSize: 13 }}>
            Tips for best results
          </Text>
          <Text style={{ color: "#166534", fontSize: 13 }}>
            • Include all ingredients with quantities{"\n"}• Describe cooking
            steps in order{"\n"}• Mention cooking times and temperatures
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
