import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../context/AuthContext";
import { getProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabase";

export default function AccountTab() {
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
      <Text style={styles.title}>Account</Text>

      <Text>{profile?.display_name ?? "Loading profile..."}</Text>
      <Text>{user?.email}</Text>

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
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  button: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#111111",
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
