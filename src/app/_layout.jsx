import { Stack } from "expo-router";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { RevenueCatProvider } from "../context/RevenueCatContext";

function AppNavigator() {
  const { user } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
      </Stack.Protected>

      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="paywall" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RevenueCatProvider>
        <AppNavigator />
      </RevenueCatProvider>
    </AuthProvider>
  );
}
