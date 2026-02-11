import { Stack } from "expo-router/stack";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
      <Stack.Screen name="mode-select" />
      <Stack.Screen name="gate" />
    </Stack>
  );
}
