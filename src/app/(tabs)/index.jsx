import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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
import { supabase } from "../../lib/supabase";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

const focusFields = [
  { key: "active_limiter", label: "Limiter" },
  { key: "progress_note", label: "Progress" },
  { key: "current_experiment", label: "Current test" },
  { key: "next_attempt_test", label: "Next attempt" },
];

export default function HomeTab() {
  const { user } = useAuth();

  const [credits, setCredits] = useState(null);

  const [loadingCredits, setLoadingCredits] = useState(true);

  const [progressState, setProgressState] = useState(null);

  const [loadingProgress, setLoadingProgress] = useState(true);

  const loadCredits = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      const data = await getCreditBalance(user.id);
      setCredits(data);
    } catch (error) {
      console.error("Could not load credits:", error);
    } finally {
      setLoadingCredits(false);
    }
  }, [user?.id]);

  const loadProgressState = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("climber_progress_state")
        .select(
          "active_limiter, progress_note, current_experiment, next_attempt_test",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setProgressState(data);
    } catch (error) {
      console.error("Could not load coaching focus:", error);
    } finally {
      setLoadingProgress(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadCredits();
      loadProgressState();
    }, [loadCredits, loadProgressState]),
  );

  const focusEntries = focusFields.filter(({ key }) => progressState?.[key]);

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
          <Text style={styles.eyebrow}>YOUR COACHING ACCOUNT</Text>

          <Text style={styles.headline}>
            Keep working the{" "}
            <Text style={styles.headlineAccent}>next attempt.</Text>
          </Text>
        </View>

        <View style={styles.creditCard}>
          {loadingCredits ? (
            <Text style={styles.creditLoading}>Checking balance...</Text>
          ) : (
            <>
              <View style={styles.creditRow}>
                <Text style={styles.creditValue}>
                  {credits?.totalCredits ?? 0}
                </Text>
                <View>
                  <Text style={styles.creditLabel}>total credits</Text>
                  <Text style={styles.creditBreakdown}>
                    {credits?.subscriptionCredits ?? 0} subscription ·{" "}
                    {credits?.topupCredits ?? 0} top-up
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={() => router.push("/capture")}
        >
          <Text style={styles.primaryButtonText}>Start a session</Text>

          <Text style={styles.primaryButtonArrow}>↗</Text>
        </Pressable>

        <View style={styles.focusCard}>
          <View style={styles.focusHeaderRow}>
            <Text style={styles.eyebrow}>CURRENT COACHING FOCUS</Text>
            <View style={styles.liveDot} />
          </View>

          <Text style={styles.focusHeading}>What we're tracking</Text>

          {loadingProgress ? (
            <Text style={styles.creditLoading}>Checking your focus...</Text>
          ) : focusEntries.length > 0 ? (
            <View style={styles.focusList}>
              {focusEntries.map(({ key, label }) => (
                <View key={key} style={styles.focusRow}>
                  <Text style={styles.focusRowLabel}>{label}</Text>
                  <Text style={styles.focusRowValue}>{progressState[key]}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.focusEmpty}>
              Your first session will establish a coaching focus here.
            </Text>
          )}
        </View>

        <View style={styles.secondaryRow}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
            onPress={() => router.push("/profile")}
          >
            <Text style={styles.secondaryButtonText}>Profile</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
            onPress={() => router.push("/paywall")}
          >
            <Text style={styles.secondaryButtonText}>Plans</Text>
          </Pressable>
        </View>
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
    gap: spacing.md,
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
    fontSize: 42,
    lineHeight: 40,
    letterSpacing: -2.9,
    color: colors.foreground,
  },
  headlineAccent: {
    color: colors.accent,
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
  focusCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  focusHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  focusHeading: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    color: colors.foreground,
  },
  focusList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  focusRow: {
    gap: 2,
  },
  focusRowLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.muted,
    textTransform: "uppercase",
  },
  focusRowValue: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 19,
    color: colors.foreground,
  },
  focusEmpty: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    minHeight: 56,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.accentInk,
  },
  primaryButtonArrow: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: colors.accentInk,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  secondaryButtonPressed: {
    borderColor: colors.accent,
  },
  secondaryButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.muted,
  },
});
