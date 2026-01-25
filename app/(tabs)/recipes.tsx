import { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  mode: string;
  cuisine: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  source_platform: string | null;
  source_creator: string | null;
  extraction_confidence: number | null;
  created_at: string | null;
}

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    try {
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRecipes([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("recipes")
        .select(
          "id, title, description, mode, cuisine, prep_time_minutes, cook_time_minutes, source_platform, source_creator, extraction_confidence, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setRecipes(data || []);
    } catch (err) {
      console.error("Error fetching recipes:", err);
      setError(err instanceof Error ? err.message : "Failed to load recipes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  // Refetch when tab becomes focused
  useFocusEffect(
    useCallback(() => {
      fetchRecipes();
    }, [fetchRecipes])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecipes();
  }, [fetchRecipes]);

  const getTotalTime = (recipe: Recipe) => {
    const prep = recipe.prep_time_minutes || 0;
    const cook = recipe.cook_time_minutes || 0;
    const total = prep + cook;
    return total > 0 ? `${total} min` : null;
  };

  const getPlatformColor = (platform: string | null) => {
    switch (platform) {
      case "youtube":
        return "#ef4444";
      case "tiktok":
        return "#000000";
      case "instagram":
        return "#e4405f";
      default:
        return "#6b7280";
    }
  };

  const getModeEmoji = (mode: string) => {
    switch (mode) {
      case "cooking":
        return "🍳";
      case "mixology":
        return "🍸";
      case "pastry":
        return "🧁";
      default:
        return "📖";
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (error) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View
          style={{
            backgroundColor: "#fef2f2",
            padding: 16,
            borderRadius: 12,
            gap: 8,
          }}
        >
          <Text style={{ color: "#dc2626", fontWeight: "600" }}>
            Error loading recipes
          </Text>
          <Text style={{ color: "#dc2626" }}>{error}</Text>
        </View>
      </ScrollView>
    );
  }

  if (recipes.length === 0) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View
          style={{
            backgroundColor: "#f3f4f6",
            padding: 24,
            borderRadius: 12,
            borderCurve: "continuous",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 48 }}>📖</Text>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>
            No recipes yet
          </Text>
          <Text style={{ color: "#666", textAlign: "center" }}>
            Import your first recipe from TikTok or YouTube
          </Text>
        </View>

        <Link href="/import" asChild>
          <Pressable
            style={{
              backgroundColor: "#f97316",
              padding: 16,
              borderRadius: 12,
              borderCurve: "continuous",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
              Import Recipe
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={{ color: "#666", marginBottom: 4 }}>
        {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
      </Text>

      {recipes.map((recipe) => (
        <Link key={recipe.id} href={`/recipe/${recipe.id}`} asChild>
          <Pressable
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              borderCurve: "continuous",
              padding: 16,
              gap: 8,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 20 }}>{getModeEmoji(recipe.mode)}</Text>
              <Text
                style={{ fontSize: 17, fontWeight: "600", flex: 1 }}
                numberOfLines={2}
              >
                {recipe.title}
              </Text>
            </View>

            {recipe.description && (
              <Text style={{ color: "#666", fontSize: 14 }} numberOfLines={2}>
                {recipe.description}
              </Text>
            )}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {recipe.source_platform && (
                <View
                  style={{
                    backgroundColor: getPlatformColor(recipe.source_platform),
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 11, fontWeight: "500" }}
                  >
                    {recipe.source_platform}
                  </Text>
                </View>
              )}

              {recipe.cuisine && (
                <View
                  style={{
                    backgroundColor: "#fef3c7",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: "#92400e", fontSize: 11 }}>
                    {recipe.cuisine}
                  </Text>
                </View>
              )}

              {getTotalTime(recipe) && (
                <Text style={{ color: "#666", fontSize: 12 }}>
                  {getTotalTime(recipe)}
                </Text>
              )}

              {recipe.extraction_confidence !== null &&
                recipe.extraction_confidence < 0.7 && (
                  <View
                    style={{
                      backgroundColor: "#fef3c7",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: "#92400e", fontSize: 10 }}>
                      Low confidence
                    </Text>
                  </View>
                )}
            </View>

            {recipe.source_creator && (
              <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                by {recipe.source_creator}
              </Text>
            )}
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}
