import {
  ScrollView,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text, Card, Button } from "@/components/ui";
import { colors, spacing, layout } from "@/constants/theme";
import { Link } from "expo-router";
import { useState, useEffect, useCallback, type ComponentProps } from "react";
import { supabase } from "@/lib/supabase";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

interface GroceryItem {
  id: string;
  item: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  is_checked: boolean;
  source_master_recipe_ids: string[];
}

interface GroupedItems {
  [category: string]: GroceryItem[];
}

// Category display order and icons
const CATEGORY_CONFIG: Record<string, { icon: IoniconsName; order: number }> = {
  produce: { icon: "leaf-outline", order: 1 },
  dairy: { icon: "water-outline", order: 2 },
  meat: { icon: "restaurant-outline", order: 3 },
  seafood: { icon: "fish-outline", order: 4 },
  bakery: { icon: "cafe-outline", order: 5 },
  pantry: { icon: "cube-outline", order: 6 },
  spices: { icon: "sparkles-outline", order: 7 },
  frozen: { icon: "snow-outline", order: 8 },
  beverages: { icon: "beer-outline", order: 9 },
  other: { icon: "ellipsis-horizontal-outline", order: 10 },
};

export default function GroceryListsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [listId, setListId] = useState<string | null>(null);

  const fetchGroceryItems = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get active grocery list
      const { data: list } = await supabase
        .from("grocery_lists")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!list) {
        setItems([]);
        setListId(null);
        return;
      }

      setListId(list.id);

      // Get items for this list
      const { data: groceryItems, error } = await supabase
        .from("grocery_items")
        .select("*")
        .eq("grocery_list_id", list.id)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching grocery items:", error);
        return;
      }

      setItems(groceryItems || []);
    } catch (error) {
      console.error("Error in fetchGroceryItems:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGroceryItems();
  }, [fetchGroceryItems]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGroceryItems();
  }, [fetchGroceryItems]);

  const toggleItemChecked = async (itemId: string, currentChecked: boolean) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, is_checked: !currentChecked } : item
      )
    );

    const { error } = await supabase
      .from("grocery_items")
      .update({
        is_checked: !currentChecked,
        checked_at: !currentChecked ? new Date().toISOString() : null,
      })
      .eq("id", itemId);

    if (error) {
      console.error("Error toggling item:", error);
      // Revert on error
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, is_checked: currentChecked } : item
        )
      );
    }
  };

  const clearCheckedItems = async () => {
    if (!listId) return;

    const checkedIds = items.filter((i) => i.is_checked).map((i) => i.id);
    if (checkedIds.length === 0) return;

    // Optimistic update
    setItems((prev) => prev.filter((item) => !item.is_checked));

    const { error } = await supabase
      .from("grocery_items")
      .delete()
      .in("id", checkedIds);

    if (error) {
      console.error("Error clearing items:", error);
      fetchGroceryItems(); // Refetch on error
    }
  };

  const clearAllItems = async () => {
    if (!listId) return;

    // Optimistic update
    setItems([]);

    const { error } = await supabase
      .from("grocery_items")
      .delete()
      .eq("grocery_list_id", listId);

    if (error) {
      console.error("Error clearing all items:", error);
      fetchGroceryItems(); // Refetch on error
    }
  };

  // Group items by category
  const groupedItems: GroupedItems = items.reduce((acc, item) => {
    const category = item.category || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as GroupedItems);

  // Sort categories by predefined order
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const orderA = CATEGORY_CONFIG[a]?.order ?? 100;
    const orderB = CATEGORY_CONFIG[b]?.order ?? 100;
    return orderA - orderB;
  });

  const formatQuantity = (item: GroceryItem) => {
    if (!item.quantity && !item.unit) return "";
    if (item.unit === "to taste") return "to taste";
    const qty = item.quantity ? `${item.quantity}` : "";
    const unit = item.unit || "";
    return `${qty} ${unit}`.trim();
  };

  const checkedCount = items.filter((i) => i.is_checked).length;
  const totalCount = items.length;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text variant="h1">Grocery</Text>
        {totalCount > 0 ? (
          <Text variant="body" color="textSecondary">
            {checkedCount} of {totalCount} items checked
          </Text>
        ) : (
          <Text variant="body" color="textSecondary">
            Smart shopping lists from your recipes
          </Text>
        )}
      </View>

      {items.length === 0 ? (
        <>
          {/* Empty State */}
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="cart-outline"
                size={48}
                color={colors.textMuted}
              />
            </View>
            <Text variant="h3">No grocery items</Text>
            <Text variant="body" color="textSecondary" style={styles.emptyText}>
              Add ingredients from your recipes to start building your grocery
              list
            </Text>
            <Link href="/recipes" asChild>
              <Button variant="secondary">Browse Recipes</Button>
            </Link>
          </View>

          {/* How it works */}
          <Card variant="outlined" style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#C2410C"
              />
              <Text variant="label" color="#C2410C">
                How it works
              </Text>
            </View>
            <View style={styles.stepsList}>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text variant="caption" color="textOnPrimary">
                    1
                  </Text>
                </View>
                <Text variant="bodySmall" color="#7C2D12">
                  Open a recipe and tap &quot;Add to Grocery&quot;
                </Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text variant="caption" color="textOnPrimary">
                    2
                  </Text>
                </View>
                <Text variant="bodySmall" color="#7C2D12">
                  Select ingredients you need
                </Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text variant="caption" color="textOnPrimary">
                    3
                  </Text>
                </View>
                <Text variant="bodySmall" color="#7C2D12">
                  Check off items as you shop
                </Text>
              </View>
            </View>
          </Card>
        </>
      ) : (
        <>
          {/* Action buttons */}
          {checkedCount > 0 && (
            <View style={styles.actionRow}>
              <Pressable
                style={styles.actionButton}
                onPress={clearCheckedItems}
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text variant="bodySmall" color="primary">
                  Clear checked ({checkedCount})
                </Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={clearAllItems}>
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text variant="bodySmall" color="textSecondary">
                  Clear all
                </Text>
              </Pressable>
            </View>
          )}

          {/* Grocery items by category */}
          {sortedCategories.map((category) => (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Ionicons
                  name={
                    CATEGORY_CONFIG[category]?.icon ||
                    "ellipsis-horizontal-outline"
                  }
                  size={18}
                  color={colors.textSecondary}
                />
                <Text variant="label" style={styles.categoryTitle}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
                <Text variant="caption" color="textMuted">
                  {groupedItems[category].length}
                </Text>
              </View>

              <Card variant="outlined" style={styles.itemsCard}>
                {groupedItems[category].map((item, index) => (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.itemRow,
                      index < groupedItems[category].length - 1 &&
                        styles.itemBorder,
                    ]}
                    onPress={() => toggleItemChecked(item.id, item.is_checked)}
                  >
                    <Ionicons
                      name={item.is_checked ? "checkbox" : "square-outline"}
                      size={24}
                      color={
                        item.is_checked ? colors.primary : colors.textMuted
                      }
                    />
                    <View style={styles.itemContent}>
                      <Text
                        variant="body"
                        style={item.is_checked && styles.checkedText}
                      >
                        {item.item}
                      </Text>
                      {formatQuantity(item) && (
                        <Text
                          variant="bodySmall"
                          color="textSecondary"
                          style={item.is_checked && styles.checkedText}
                        >
                          {formatQuantity(item)}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </Card>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: layout.screenPaddingHorizontal,
    gap: spacing[6],
    paddingBottom: spacing[8],
  },
  header: {
    gap: spacing[1],
  },
  emptyContainer: {
    alignItems: "center",
    gap: spacing[4],
    paddingVertical: spacing[8],
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[2],
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 280,
  },
  infoCard: {
    backgroundColor: "#FFF7ED",
    borderColor: colors.primary,
    gap: spacing[4],
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  stepsList: {
    gap: spacing[3],
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing[4],
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  categorySection: {
    gap: spacing[2],
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  categoryTitle: {
    flex: 1,
  },
  itemsCard: {
    padding: 0,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[3],
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemContent: {
    flex: 1,
    gap: spacing[0.5] || 2,
  },
  checkedText: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
});
