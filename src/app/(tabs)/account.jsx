import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../context/AuthContext";
import { getCreditBalance } from "../../lib/credits";
import { getProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabase";

export default function AccountTab() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    getProfile(user.id).then(setProfile).catch(console.error);
  }, [user?.id]);

  const loadCredits = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      const data = await getCreditBalance(user.id);
      setCredits(data);
    } catch (error) {
      console.error("Could not load credits:", error);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadCredits();
    }, [loadCredits]),
  );

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>

      <Text>{profile?.display_name ?? "Loading profile..."}</Text>
      <Text>{user?.email}</Text>

      <Text style={styles.sectionTitle}>Credits</Text>

      {credits ? (
        <>
          <Text>Total: {credits.totalCredits}</Text>
          <Text>Subscription: {credits.subscriptionCredits}</Text>
          <Text>Top-up: {credits.topupCredits}</Text>
        </>
      ) : (
        <Text>Loading credits...</Text>
      )}

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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
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
