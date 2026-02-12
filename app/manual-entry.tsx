import { useState } from "react";
import {
  ScrollView,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { Text, Card } from "@/components/ui";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import {
  colors,
  spacing,
  borderRadius,
  fontFamily,
  fontSize,
} from "@/constants/theme";

export default function ManualEntryScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ platform?: string; url?: string }>();

  const [title, setTitle] = useState("");
  const [recipeText, setRecipeText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detect nonsense: repeated chars, keyboard mashing, gibberish
  const isNonsense = (text: string): boolean => {
    const words = text
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((w) => w.replace(/[^a-zA-Z]/g, "").length >= 2);
    if (words.length === 0) return true;
    // All same word repeated
    const unique = new Set(words);
    if (unique.size < Math.min(3, Math.ceil(words.length / 2))) return true;
    // Most words are just repeated characters (e.g. "aaa", "bbb")
    const repeatedCharWords = words.filter((w) =>
      /^(.)\1*$/i.test(w.replace(/[^a-zA-Z]/g, ""))
    );
    if (repeatedCharWords.length > words.length / 2) return true;
    // Vowel ratio check — real English text has ~35-45% vowels
    // Keyboard mashing like "fdsa qwer tyui" has very few
    const allLetters = words.join("").replace(/[^a-zA-Z]/g, "");
    if (allLetters.length >= 6) {
      const vowelCount = (allLetters.match(/[aeiou]/gi) || []).length;
      const vowelRatio = vowelCount / allLetters.length;
      if (vowelRatio < 0.15) return true;
    }
    return false;
  };

  const countRealWords = (text: string) =>
    text
      .trim()
      .split(/\s+/)
      .filter((w) => w.replace(/[^a-zA-Z]/g, "").length >= 2).length;

  const canSubmit =
    title.trim().length >= 3 &&
    countRealWords(recipeText) >= 5 &&
    !isNonsense(recipeText) &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    if (countRealWords(recipeText) < 5 || isNonsense(recipeText)) {
      Alert.alert(
        "Need more detail",
        "Please describe a real recipe with ingredients or steps so we can organize it."
      );
      return;
    }

    setIsSubmitting(true);

    try {
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
              creator: null,
            },
          },
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
          return;
        }
        throw new Error(fnError.message || "Failed to process recipe");
      }

      if (!data?.success) {
        if (data.upgrade_required) {
          Alert.alert(
            "Import Limit Reached",
            data.message || "You've reached your monthly limit.",
            [
              { text: "Later", style: "cancel", onPress: () => router.back() },
              {
                text: "Upgrade",
                onPress: () => {
                  router.back();
                  router.push("/paywall");
                },
              },
            ]
          );
          return;
        }
        throw new Error(data.error || "Failed to process recipe");
      }

      const recipeId = data.master_recipe_id || data.recipe?.id;

      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Hide loading overlay, then navigate after Modal fade-out completes
      setIsSubmitting(false);
      setTimeout(() => {
        router.dismiss();
        router.push(`/recipe/${recipeId}?edit=true`);
      }, 500);
    } catch (err) {
      console.error("Manual entry error:", err);
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create recipe"
      );
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Pressable
          onPress={() => router.dismiss()}
          style={styles.backButton}
          hitSlop={12}
        >
          <Text variant="label" color="textSecondary">
            Cancel
          </Text>
        </Pressable>
        <Text variant="h3">New Recipe</Text>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[styles.nextButton, !canSubmit && styles.nextButtonDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <Text
              variant="label"
              style={{
                color: canSubmit ? colors.textOnPrimary : colors.textMuted,
              }}
            >
              Create
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title Input */}
        <View style={styles.titleContainer}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Recipe name"
            placeholderTextColor={colors.textMuted}
            style={styles.titleInput}
            autoFocus
            editable={!isSubmitting}
          />
        </View>

        {/* Recipe Text Input */}
        <View style={styles.textContainer}>
          <TextInput
            value={recipeText}
            onChangeText={setRecipeText}
            placeholder="Paste the recipe or describe it here...

Include ingredients and cooking steps. Our AI will organize everything for you to review."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            editable={!isSubmitting}
            style={styles.textInput}
          />
        </View>

        {/* Tips */}
        <Card variant="outlined" style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text variant="label" color="primary">
              AI-powered
            </Text>
          </View>
          <Text variant="caption" color="textSecondary">
            Just paste any recipe text - from a video caption, website, or your
            notes. We&apos;ll extract ingredients and steps, then you can review
            and edit.
          </Text>
        </Card>
      </ScrollView>

      {/* Loading Overlay */}
      <LoadingOverlay visible={isSubmitting} type="create" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing[2],
    paddingRight: spacing[2],
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    minWidth: 60,
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: colors.border,
  },
  content: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  titleContainer: {
    gap: spacing[1],
  },
  titleInput: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize["2xl"],
    letterSpacing: -0.5,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  textContainer: {
    flex: 1,
  },
  textInput: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    minHeight: 280,
    lineHeight: 24,
  },
  tipsCard: {
    backgroundColor: colors.surface,
    gap: spacing[2],
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
});
