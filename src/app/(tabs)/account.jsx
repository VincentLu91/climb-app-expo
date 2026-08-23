import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { getCreditBalance } from "../../lib/credits";
import { getProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabase";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

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
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.wordmark}>
          CLIMB<Text style={styles.wordmarkAccent}>/</Text>COACH
        </Text>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>

          <Text style={styles.headline}>Profile and credits</Text>
        </View>

        <View style={styles.identityCard}>
          <Text style={styles.identityName}>
            {profile?.display_name ?? "Loading profile..."}
          </Text>
          <Text style={styles.identityEmail}>{user?.email}</Text>
        </View>

        <View style={styles.creditCard}>
          {credits ? (
            <View style={styles.creditRow}>
              <Text style={styles.creditValue}>{credits.totalCredits}</Text>
              <View>
                <Text style={styles.creditLabel}>total credits</Text>
                <Text style={styles.creditBreakdown}>
                  {credits.subscriptionCredits} subscription ·{" "}
                  {credits.topupCredits} top-up
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.creditLoading}>Checking balance...</Text>
          )}
        </View>

        <View style={styles.actionsGroup}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={() => router.push("/profile")}
          >
            <Text style={styles.actionButtonText}>Edit coaching profile</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={() => router.push("/paywall")}
          >
            <Text style={styles.actionButtonText}>View plans</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.signOutButtonPressed,
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  wordmark: {
    fontFamily: fonts.monoBold,
    fontSize: 14,
    letterSpacing: 1.5,
    color: colors.foreground,
  },
  wordmarkAccent: {
    color: colors.accent,
  },
  hero: {
    gap: spacing.sm,
  },
  eyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.muted,
    textTransform: "uppercase",
  },
  headline: {
    fontFamily: Platform.select({
      ios: "Arial",
      android: "sans-serif",
      default: "Arial",
    }),
    fontWeight: "600",
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -1.2,
    color: colors.foreground,
  },
  identityCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  identityName: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 18,
    color: colors.foreground,
  },
  identityEmail: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.muted,
  },
  creditCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  creditRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.md,
  },
  creditLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.muted,
    textTransform: "uppercase",
  },
  creditLoading: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.muted,
  },
  creditValue: {
    fontFamily: fonts.sansBold,
    fontSize: 40,
    letterSpacing: -1,
    color: colors.accent,
  },
  creditBreakdown: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  actionsGroup: {
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  actionButtonPressed: {
    borderColor: colors.accent,
  },
  actionButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.foreground,
  },
  actionButtonArrow: {
    fontFamily: fonts.sansBold,
    fontSize: 20,
    color: colors.muted,
  },
  signOutButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  signOutButtonPressed: {
    opacity: 0.6,
  },
  signOutText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.muted,
  },
});
