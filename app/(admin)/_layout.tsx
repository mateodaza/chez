import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: "600",
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          title: "Admin Dashboard",
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
