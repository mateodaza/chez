import { Stack } from "expo-router/stack";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="gate" />
      <Stack.Screen name="mode-select" />
    </Stack>
  );
}
