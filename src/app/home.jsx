import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { supabase } from "../lib/supabase";

import { useAuth } from "../context/AuthContext";

import { getProfile } from "../lib/profile";

export default function HomeScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return;

    getProfile(user.id).then(setProfile).catch(console.error);
  }, [user]);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Climb App</Text>

      <Text>Logged in as:</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Text>Profile name: {profile?.display_name ?? "Loading..."}</Text>

      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  email: {
    fontWeight: "600",
  },
  button: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#111111",
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
