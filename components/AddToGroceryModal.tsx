/**
 * AddToGroceryModal - Select ingredients to add to grocery list
 *
 * Features:
 * - Checkbox selection for each ingredient
 * - "Select All" / "Deselect All" toggle
 * - Shows quantity and unit
 * - Confirmation with count
 */

import { useState, useMemo, useCallback } from "react";
import { View, Modal, Pressable, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { colors, spacing, borderRadius, layout } from "@/constants/theme";
import type { DisplayIngredient } from "@/hooks/useRecipeWithVersion";

interface AddToGroceryModalProps {
  visible: boolean;
  onClose: () => void;
  ingredients: DisplayIngredient[];
  recipeId: string;
  recipeTitle: string;
  onAddToGrocery: (
    ingredients: DisplayIngredient[]
  ) => Promise<{ success: boolean; addedCount: number; error?: string }>;
}

export function AddToGroceryModal({
  visible,
  onClose,
  ingredients,
  recipeId: _recipeId,
  recipeTitle,
  onAddToGrocery,
}: AddToGroceryModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    addedCount: number;
    error?: string;
  } | null>(null);

  // Initialize with all selected when modal opens
  useMemo(() => {
    if (visible) {
      setSelectedIds(new Set(ingredients.map((ing) => ing.id)));
      setResult(null);
    }
  }, [visible, ingredients]);

  const allSelected = selectedIds.size === ingredients.length;
  const noneSelected = selectedIds.size === 0;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ingredients.map((ing) => ing.id)));
    }
  }, [allSelected, ingredients]);

  const toggleIngredient = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectedIngredients = useMemo(() => {
    return ingredients.filter((ing) => selectedIds.has(ing.id));
  }, [ingredients, selectedIds]);

  const handleAdd = useCallback(async () => {
    if (selectedIngredients.length === 0) return;

    setIsAdding(true);
    try {
      const res = await onAddToGrocery(selectedIngredients);
      setResult(res);
      if (res.success && res.addedCount > 0) {
        // Auto close after success with brief delay
        setTimeout(() => {
          onClose();
          setResult(null);
        }, 1500);
      }
    } finally {
      setIsAdding(false);
    }
  }, [selectedIngredients, onAddToGrocery, onClose]);

  const handleClose = useCallback(() => {
    setResult(null);
    onClose();
  }, [onClose]);

  const formatQuantity = (ing: DisplayIngredient): string => {
    const parts: string[] = [];
    if (ing.quantity) parts.push(String(ing.quantity));
    if (ing.unit) parts.push(ing.unit);
    return parts.join(" ") || "";
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingTop: insets.top + spacing[4] }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text variant="h3">Add to Grocery</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Recipe info */}
        <View style={styles.recipeInfo}>
          <Ionicons
            name="restaurant-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text variant="bodySmall" color="textSecondary" numberOfLines={1}>
            {recipeTitle}
          </Text>
        </View>

        {/* Success/Error feedback */}
        {result && (
          <View
            style={[
              styles.resultBanner,
              result.success ? styles.resultSuccess : styles.resultError,
            ]}
          >
            <Ionicons
              name={result.success ? "checkmark-circle" : "alert-circle"}
              size={20}
              color={result.success ? "#16A34A" : colors.error}
            />
            <Text
              variant="bodySmall"
              style={{
                color: result.success ? "#16A34A" : colors.error,
                flex: 1,
              }}
            >
              {result.success
                ? result.addedCount > 0
                  ? `Added ${result.addedCount} item${result.addedCount !== 1 ? "s" : ""} to grocery list`
                  : result.error || "Items already in list"
                : result.error || "Failed to add items"}
            </Text>
          </View>
        )}

        {/* Select all toggle */}
        <Pressable style={styles.selectAllRow} onPress={toggleAll}>
          <View
            style={[styles.checkbox, allSelected && styles.checkboxChecked]}
          >
            {allSelected && (
              <Ionicons
                name="checkmark"
                size={14}
                color={colors.textOnPrimary}
              />
            )}
            {!allSelected && !noneSelected && (
              <View style={styles.checkboxPartial} />
            )}
          </View>
          <Text variant="label">
            {allSelected ? "Deselect All" : "Select All"}
          </Text>
          <Text variant="caption" color="textMuted">
            ({selectedIds.size} of {ingredients.length})
          </Text>
        </Pressable>

        {/* Ingredients list */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {ingredients.map((ing) => {
            const isSelected = selectedIds.has(ing.id);
            const quantityStr = formatQuantity(ing);

            return (
              <Pressable
                key={ing.id}
                style={[
                  styles.ingredientRow,
                  isSelected && styles.ingredientRowSelected,
                ]}
                onPress={() => toggleIngredient(ing.id)}
              >
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxChecked,
                  ]}
                >
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={colors.textOnPrimary}
                    />
                  )}
                </View>
                <View style={styles.ingredientContent}>
                  <Text
                    variant="body"
                    color={isSelected ? "textPrimary" : "textSecondary"}
                  >
                    {ing.item}
                  </Text>
                  {quantityStr && (
                    <Text variant="caption" color="textMuted">
                      {quantityStr}
                    </Text>
                  )}
                </View>
                {ing.is_optional && (
                  <View style={styles.optionalBadge}>
                    <Text variant="caption" color="textMuted">
                      optional
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Actions */}
        <View
          style={[
            styles.actions,
            { paddingBottom: Math.max(insets.bottom, spacing[4]) },
          ]}
        >
          <Button
            variant="primary"
            onPress={handleAdd}
            loading={isAdding}
            disabled={noneSelected || isAdding}
            fullWidth
          >
            {noneSelected
              ? "Select items to add"
              : `Add ${selectedIds.size} item${selectedIds.size !== 1 ? "s" : ""} to Grocery`}
          </Button>
          <Button variant="ghost" onPress={handleClose} fullWidth>
            Cancel
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: layout.screenPaddingHorizontal,
    marginBottom: spacing[2],
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  recipeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: layout.screenPaddingHorizontal,
    marginBottom: spacing[4],
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginHorizontal: layout.screenPaddingHorizontal,
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[3],
  },
  resultSuccess: {
    backgroundColor: "#DCFCE7",
  },
  resultError: {
    backgroundColor: "#FEE2E2",
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxPartial: {
    width: 10,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing[2],
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: spacing[3],
  },
  ingredientRowSelected: {
    backgroundColor: "#FFF7ED", // Orange 50 - light bg for good contrast
  },
  ingredientContent: {
    flex: 1,
    gap: 2,
  },
  optionalBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  actions: {
    gap: spacing[3],
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
