/**
 * useGroceryList - Hook for grocery list operations
 *
 * Provides functions to:
 * - Get or create active grocery list
 * - Add ingredients to grocery list
 * - Get existing grocery items
 */

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { DisplayIngredient } from "./useRecipeWithVersion";

interface GroceryItem {
  id: string;
  item: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  is_checked: boolean;
  source_master_recipe_ids: string[];
}

interface UseGroceryListReturn {
  isAdding: boolean;
  addIngredientsToGroceryList: (
    ingredients: DisplayIngredient[],
    recipeId: string,
    recipeTitle: string
  ) => Promise<{ success: boolean; addedCount: number; error?: string }>;
}

export function useGroceryList(): UseGroceryListReturn {
  const [isAdding, setIsAdding] = useState(false);

  // Get or create active grocery list for current user
  const getOrCreateActiveList = useCallback(
    async (userId: string): Promise<string | null> => {
      // Try to find existing active list
      const { data: existingList, error: findError } = await supabase
        .from("grocery_lists")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingList) {
        return existingList.id;
      }

      // Create new list if none exists
      const { data: newList, error: createError } = await supabase
        .from("grocery_lists")
        .insert({
          user_id: userId,
          name: "My Grocery List",
          is_active: true,
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating grocery list:", createError);
        return null;
      }

      return newList?.id ?? null;
    },
    []
  );

  // Add ingredients to grocery list
  const addIngredientsToGroceryList = useCallback(
    async (
      ingredients: DisplayIngredient[],
      recipeId: string,
      recipeTitle: string
    ): Promise<{ success: boolean; addedCount: number; error?: string }> => {
      if (ingredients.length === 0) {
        return {
          success: false,
          addedCount: 0,
          error: "No ingredients to add",
        };
      }

      setIsAdding(true);

      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          return { success: false, addedCount: 0, error: "Not authenticated" };
        }

        // Get or create active list
        const listId = await getOrCreateActiveList(user.id);
        if (!listId) {
          return {
            success: false,
            addedCount: 0,
            error: "Could not create grocery list",
          };
        }

        // Update list with recipe reference
        const { data: currentList } = await supabase
          .from("grocery_lists")
          .select("master_recipe_ids")
          .eq("id", listId)
          .single();

        const existingRecipeIds =
          (currentList?.master_recipe_ids as string[]) || [];
        if (!existingRecipeIds.includes(recipeId)) {
          await supabase
            .from("grocery_lists")
            .update({
              master_recipe_ids: [...existingRecipeIds, recipeId],
              updated_at: new Date().toISOString(),
            })
            .eq("id", listId);
        }

        // Get existing items to avoid duplicates
        const { data: existingItems } = await supabase
          .from("grocery_items")
          .select("item, source_master_recipe_ids")
          .eq("grocery_list_id", listId);

        const existingItemsMap = new Map<string, string[]>();
        existingItems?.forEach((item) => {
          existingItemsMap.set(
            item.item.toLowerCase(),
            (item.source_master_recipe_ids as string[]) || []
          );
        });

        // Prepare items to insert (skip duplicates from same recipe)
        const itemsToInsert = ingredients
          .filter((ing) => {
            const normalizedItem = ing.item.toLowerCase();
            const existingSources = existingItemsMap.get(normalizedItem);
            // Add if item doesn't exist or this recipe isn't a source yet
            return !existingSources || !existingSources.includes(recipeId);
          })
          .map((ing, index) => ({
            grocery_list_id: listId,
            item: ing.item,
            quantity: ing.quantity,
            unit: ing.unit,
            category: ing.grocery_category || null,
            source_master_recipe_ids: [recipeId],
            is_checked: false,
            is_manual: false,
            sort_order: index,
          }));

        if (itemsToInsert.length === 0) {
          return {
            success: true,
            addedCount: 0,
            error: "All items already in grocery list",
          };
        }

        // Insert items
        const { error: insertError } = await supabase
          .from("grocery_items")
          .insert(itemsToInsert);

        if (insertError) {
          console.error("Error adding grocery items:", insertError);
          return {
            success: false,
            addedCount: 0,
            error: "Failed to add items",
          };
        }

        return { success: true, addedCount: itemsToInsert.length };
      } catch (error) {
        console.error("Error in addIngredientsToGroceryList:", error);
        return { success: false, addedCount: 0, error: "Unexpected error" };
      } finally {
        setIsAdding(false);
      }
    },
    [getOrCreateActiveList]
  );

  return {
    isAdding,
    addIngredientsToGroceryList,
  };
}
