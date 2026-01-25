import { Link } from "expo-router";
import { ScrollView, Text, View, Pressable } from "react-native";

export default function HomeScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 24 }}
    >
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>Welcome to Chez</Text>
        <Text style={{ fontSize: 16, color: "#666" }}>
          Your AI-powered cooking assistant
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>Quick Actions</Text>

        <Link href="/import" asChild>
          <Pressable
            style={{
              backgroundColor: "#f97316",
              padding: 16,
              borderRadius: 12,
              borderCurve: "continuous",
            }}
          >
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
              Import a Recipe
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
              Paste a TikTok or YouTube link
            </Text>
          </Pressable>
        </Link>

        <Link href="/recipes" asChild>
          <Pressable
            style={{
              backgroundColor: "#f3f4f6",
              padding: 16,
              borderRadius: 12,
              borderCurve: "continuous",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600" }}>
              Browse Recipes
            </Text>
            <Text style={{ color: "#666", marginTop: 4 }}>
              View your saved recipes
            </Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}
