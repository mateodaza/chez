import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamily } from "@/constants/theme";

type SFSymbolName =
  | "house"
  | "house.fill"
  | "book"
  | "book.fill"
  | "plus.circle"
  | "plus.circle.fill"
  | "cart"
  | "cart.fill"
  | "person"
  | "person.fill";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({
  sfSymbol,
  sfSymbolFilled,
  ionicon,
  ioniconFilled,
  color,
  focused,
}: {
  sfSymbol: SFSymbolName;
  sfSymbolFilled: SFSymbolName;
  ionicon: IoniconName;
  ioniconFilled: IoniconName;
  color: string;
  focused: boolean;
}) {
  if (Platform.OS !== "ios") {
    return (
      <Ionicons
        name={focused ? ioniconFilled : ionicon}
        size={24}
        color={color}
      />
    );
  }

  return (
    <SymbolView
      name={focused ? sfSymbolFilled : sfSymbol}
      tintColor={color}
      size={24}
      weight="medium"
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.medium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              sfSymbol="house"
              sfSymbolFilled="house.fill"
              ionicon="home-outline"
              ioniconFilled="home"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              sfSymbol="book"
              sfSymbolFilled="book.fill"
              ionicon="book-outline"
              ioniconFilled="book"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="import"
        options={{
          title: "Import",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              sfSymbol="plus.circle"
              sfSymbolFilled="plus.circle.fill"
              ionicon="add-circle-outline"
              ioniconFilled="add-circle"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: "Grocery",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              sfSymbol="cart"
              sfSymbolFilled="cart.fill"
              ionicon="cart-outline"
              ioniconFilled="cart"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              sfSymbol="person"
              sfSymbolFilled="person.fill"
              ionicon="person-outline"
              ioniconFilled="person"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
