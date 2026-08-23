import { Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { useEffect } from "react";

import { useAuth } from "../../context/AuthContext";
import { getProfile } from "../../lib/profile";
import { colors, fonts } from "../../theme/tokens";

const tabIcons = {
  index: { focused: "home", unfocused: "home-outline" },
  history: { focused: "time", unfocused: "time-outline" },
  account: { focused: "person", unfocused: "person-outline" },
};

function TabBarIcon({ routeName, focused, color, size }) {
  const iconSet = tabIcons[routeName];
  const iconName = focused ? iconSet.focused : iconSet.unfocused;

  return <Ionicons name={iconName} size={size} color={color} />;
}

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
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          height: 84,
          paddingTop: 10,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.monoMedium,
          fontSize: 10,
          letterSpacing: 0.6,
          textTransform: "uppercase",
        },
        tabBarIcon: ({ focused, color, size }) => (
          <TabBarIcon
            routeName={route.name}
            focused={focused}
            color={color}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "History",
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
