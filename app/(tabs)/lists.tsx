import { ScrollView, Text, View } from "react-native";

export default function GroceryListsScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 16 }}
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
        <Text style={{ fontSize: 48 }}>🛒</Text>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>
          No grocery lists
        </Text>
        <Text style={{ color: "#666", textAlign: "center" }}>
          Plan recipes to generate smart grocery lists
        </Text>
      </View>
    </ScrollView>
  );
}
