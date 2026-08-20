import { router, Tabs } from "expo-router";
import { useEffect } from "react";

import { useAuth } from "../../context/AuthContext";
import { getProfile } from "../../lib/profile";

export default function TabsLayout() {
  const { user } = useAuth();

  useEffect(() => {
    async function checkOnboarding() {
      if (!user?.id) {
        return;
      }

      const profile = await getProfile(user.id);

      if (!profile?.onboarded_at) {
        router.replace("/onboarding");
      }
    }

    checkOnboarding();
  }, [user?.id]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
        }}
      />
    </Tabs>
  );
}
