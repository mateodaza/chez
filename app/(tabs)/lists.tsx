import { ScrollView, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text, Card, Button } from "@/components/ui";
import { colors, spacing, layout } from "@/constants/theme";
import { Link } from "expo-router";

export default function GroceryListsScreen() {
  const insets = useSafeAreaInsets();

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
    >
      {/* Header */}
      <View style={styles.header}>
        <Text variant="h1">Grocery</Text>
        <Text variant="body" color="textSecondary">
          Smart shopping lists from your recipes
        </Text>
      </View>

      {/* Empty State */}
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="cart-outline" size={48} color={colors.textMuted} />
        </View>
        <Text variant="h3">No grocery lists</Text>
        <Text variant="body" color="textSecondary" style={styles.emptyText}>
          Plan recipes to generate smart grocery lists that combine ingredients
          automatically
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
              Add recipes to your meal plan
            </Text>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text variant="caption" color="textOnPrimary">
                2
              </Text>
            </View>
            <Text variant="bodySmall" color="#7C2D12">
              We combine similar ingredients
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
});
