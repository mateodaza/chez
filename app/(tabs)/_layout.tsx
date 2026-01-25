import { Tabs } from "expo-router";
import { Text } from "react-native";

const ORANGE = "#f97316";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: ORANGE,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="house" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="book" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="import"
        options={{
          title: "Import",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="plus.circle" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: "Grocery",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="cart" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

// Placeholder icon component - will replace with expo-symbols later
function TabIcon({
  name,
  color,
  size,
}: {
  name: string;
  color: string;
  size: number;
}) {
  const icons: Record<string, string> = {
    house: "🏠",
    book: "📖",
    "plus.circle": "➕",
    cart: "🛒",
    person: "👤",
  };
  return (
    <Text style={{ fontSize: size - 4, color }}>{icons[name] || "●"}</Text>
  );
}
