import { useEffect, useState, useCallback } from "react";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  mode: string;
  category: string | null;
  cuisine: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  servings_unit: string | null;
  difficulty_score: number | null;
  source_platform: string | null;
  source_creator: string | null;
  source_url: string | null;
}

interface Ingredient {
  id: string;
  item: string;
  quantity: number | null;
  unit: string | null;
  preparation: string | null;
  is_optional: boolean | null;
  sort_order: number | null;
  original_text: string | null;
  confidence_status: string | null;
  suggested_correction: string | null;
  user_verified: boolean | null;
}

interface Step {
  id: string;
  step_number: number;
  instruction: string;
  duration_minutes: number | null;
  temperature_value: number | null;
  temperature_unit: string | null;
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecipe() {
      if (!id) return;

      try {
        // Fetch recipe
        const { data: recipeData, error: recipeError } = await supabase
          .from("recipes")
          .select("*")
          .eq("id", id)
          .single();

        if (recipeError) throw recipeError;
        setRecipe(recipeData);

        // Fetch ingredients
        const { data: ingredientsData, error: ingredientsError } =
          await supabase
            .from("recipe_ingredients")
            .select("*")
            .eq("recipe_id", id)
            .order("sort_order");

        if (ingredientsError) throw ingredientsError;
        setIngredients(ingredientsData || []);

        // Fetch steps
        const { data: stepsData, error: stepsError } = await supabase
          .from("recipe_steps")
          .select("*")
          .eq("recipe_id", id)
          .order("step_number");

        if (stepsError) throw stepsError;
        setSteps(stepsData || []);
      } catch (err) {
        console.error("Error fetching recipe:", err);
        setError(err instanceof Error ? err.message : "Failed to load recipe");
      } finally {
        setLoading(false);
      }
    }

    fetchRecipe();
  }, [id]);

  const handleVerifyIngredient = useCallback(async (ingredient: Ingredient) => {
    Alert.alert(
      `Verify: ${ingredient.item}`,
      ingredient.original_text
        ? `Original transcript: "${ingredient.original_text}"\n\nIs "${ingredient.item}" correct?`
        : `Is "${ingredient.item}" correct?`,
      [
        {
          text: "Confirm",
          onPress: async () => {
            const { error } = await supabase
              .from("recipe_ingredients")
              .update({ user_verified: true })
              .eq("id", ingredient.id);

            if (!error) {
              setIngredients((prev) =>
                prev.map((ing) =>
                  ing.id === ingredient.id
                    ? { ...ing, user_verified: true }
                    : ing
                )
              );
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }, []);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Loading..." }} />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      </>
    );
  }

  if (error || !recipe) {
    return (
      <>
        <Stack.Screen options={{ title: "Error" }} />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <Text style={{ color: "#ef4444", textAlign: "center" }}>
            {error || "Recipe not found"}
          </Text>
        </View>
      </>
    );
  }

  const formatQuantity = (ing: Ingredient) => {
    const parts: string[] = [];
    if (ing.quantity) parts.push(String(ing.quantity));
    if (ing.unit) parts.push(ing.unit);
    parts.push(ing.item);
    if (ing.preparation) parts.push(`(${ing.preparation})`);
    return parts.join(" ");
  };

  const needsReviewCount = ingredients.filter(
    (ing) => ing.confidence_status === "needs_review" && !ing.user_verified
  ).length;

  const getConfidenceStyle = (ing: Ingredient) => {
    if (ing.user_verified) {
      return { backgroundColor: "#d1fae5", borderColor: "#10b981" }; // Green - verified
    }
    switch (ing.confidence_status) {
      case "needs_review":
        return { backgroundColor: "#fef3c7", borderColor: "#f59e0b" }; // Yellow - needs review
      case "inferred":
        return { backgroundColor: "#e0e7ff", borderColor: "#6366f1" }; // Purple - inferred
      default:
        return { backgroundColor: "transparent", borderColor: "transparent" };
    }
  };

  const getConfidenceIcon = (ing: Ingredient) => {
    if (ing.user_verified) return "✓";
    switch (ing.confidence_status) {
      case "needs_review":
        return "?";
      case "inferred":
        return "~";
      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: recipe.title,
          headerLargeTitle: true,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 24 }}
      >
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 24, fontWeight: "700" }}>
            {recipe.title}
          </Text>
          {recipe.description && (
            <Text style={{ color: "#374151", fontSize: 15 }}>
              {recipe.description}
            </Text>
          )}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {recipe.source_platform && (
              <View
                style={{
                  backgroundColor: "#f3f4f6",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#666", fontSize: 13 }}>
                  {recipe.source_platform}
                </Text>
              </View>
            )}
            {recipe.cuisine && (
              <View
                style={{
                  backgroundColor: "#fef3c7",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#92400e", fontSize: 13 }}>
                  {recipe.cuisine}
                </Text>
              </View>
            )}
            {recipe.mode && (
              <View
                style={{
                  backgroundColor: "#dbeafe",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#1e40af", fontSize: 13 }}>
                  {recipe.mode}
                </Text>
              </View>
            )}
          </View>
          {recipe.source_creator && (
            <Text style={{ color: "#666", fontSize: 13 }}>
              By {recipe.source_creator}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 16 }}>
          {recipe.prep_time_minutes && (
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: "#666", fontSize: 12 }}>PREP TIME</Text>
              <Text style={{ fontWeight: "600" }}>
                {recipe.prep_time_minutes} min
              </Text>
            </View>
          )}
          {recipe.cook_time_minutes && (
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: "#666", fontSize: 12 }}>COOK TIME</Text>
              <Text style={{ fontWeight: "600" }}>
                {recipe.cook_time_minutes} min
              </Text>
            </View>
          )}
          {recipe.servings && (
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: "#666", fontSize: 12 }}>SERVINGS</Text>
              <Text style={{ fontWeight: "600" }}>
                {recipe.servings} {recipe.servings_unit || ""}
              </Text>
            </View>
          )}
        </View>

        <Link href={`/cook/${id}`} asChild>
          <Pressable
            style={{
              backgroundColor: "#f97316",
              padding: 16,
              borderRadius: 12,
              borderCurve: "continuous",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontSize: 18, fontWeight: "600" }}>
              Start Cooking
            </Text>
          </Pressable>
        </Link>

        {ingredients.length > 0 && (
          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600" }}>
                Ingredients ({ingredients.length})
              </Text>
              {needsReviewCount > 0 && (
                <View
                  style={{
                    backgroundColor: "#fef3c7",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Text style={{ color: "#92400e", fontSize: 12 }}>
                    {needsReviewCount} needs review
                  </Text>
                </View>
              )}
            </View>
            <View
              style={{
                backgroundColor: "#f3f4f6",
                padding: 16,
                borderRadius: 12,
                borderCurve: "continuous",
                gap: 10,
              }}
            >
              {ingredients.map((ing) => {
                const confidenceStyle = getConfidenceStyle(ing);
                const icon = getConfidenceIcon(ing);
                const needsTap =
                  ing.confidence_status === "needs_review" &&
                  !ing.user_verified;

                return (
                  <Pressable
                    key={ing.id}
                    onPress={
                      needsTap ? () => handleVerifyIngredient(ing) : undefined
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      marginHorizontal: -8,
                      borderRadius: 8,
                      borderWidth:
                        confidenceStyle.borderColor !== "transparent" ? 1 : 0,
                      borderColor: confidenceStyle.borderColor,
                      backgroundColor: confidenceStyle.backgroundColor,
                    }}
                  >
                    {icon && (
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor: ing.user_verified
                            ? "#10b981"
                            : ing.confidence_status === "needs_review"
                              ? "#f59e0b"
                              : "#6366f1",
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: "white",
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          {icon}
                        </Text>
                      </View>
                    )}
                    {!icon && <Text style={{ marginRight: 8 }}>•</Text>}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: ing.is_optional ? "#6b7280" : "#111827",
                        }}
                      >
                        {formatQuantity(ing)}
                        {ing.is_optional && (
                          <Text style={{ color: "#9ca3af" }}> (optional)</Text>
                        )}
                      </Text>
                      {needsTap && ing.original_text && (
                        <Text
                          style={{
                            color: "#92400e",
                            fontSize: 11,
                            marginTop: 2,
                          }}
                        >
                          Tap to verify • Original: &quot;{ing.original_text}
                          &quot;
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {needsReviewCount > 0 && (
              <Text style={{ color: "#666", fontSize: 12 }}>
                Yellow items were auto-corrected from speech-to-text. Tap to
                verify they&apos;re correct.
              </Text>
            )}
          </View>
        )}

        {steps.length > 0 && (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "600" }}>
              Steps ({steps.length})
            </Text>
            <View style={{ gap: 12 }}>
              {steps.map((step) => (
                <View
                  key={step.id}
                  style={{
                    backgroundColor: "#f3f4f6",
                    padding: 16,
                    borderRadius: 12,
                    borderCurve: "continuous",
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: "#f97316",
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontWeight: "700",
                          fontSize: 14,
                        }}
                      >
                        {step.step_number}
                      </Text>
                    </View>
                    {step.duration_minutes && (
                      <Text style={{ color: "#666", fontSize: 13 }}>
                        ~{step.duration_minutes} min
                      </Text>
                    )}
                    {step.temperature_value && (
                      <Text style={{ color: "#666", fontSize: 13 }}>
                        {step.temperature_value}°{step.temperature_unit || "F"}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: "#374151", lineHeight: 22 }}>
                    {step.instruction}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}
