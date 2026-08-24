import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { getSessions } from "../../lib/sessions";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

function formatSessionDate(startedAt) {
  if (!startedAt) {
    return "Unknown date";
  }

  return new Date(startedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryTab() {
  const { user } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadSessions = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      const data = await getSessions(user.id);
      setSessions(data);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error?.message ?? "Could not load sessions.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

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
          <Text style={styles.eyebrow}>YOUR COACHING LOG</Text>

          <Text style={styles.headline}>All problems</Text>

          {!loading && !errorMessage ? (
            <Text style={styles.count}>
              {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
            </Text>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {!loading && errorMessage ? (
          <View style={styles.errorPanel}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {!loading && !errorMessage && sessions.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>No climbing history yet.</Text>
            <Text style={styles.emptySubtitle}>
              Your first completed session will appear here.
            </Text>
          </View>
        ) : null}

        {!loading && !errorMessage
          ? sessions.map((session) => (
              <Pressable
                key={session.id}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => router.push(`/session/${session.id}`)}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardDate}>
                    {formatSessionDate(session.started_at)}
                  </Text>

                  <View
                    style={[
                      styles.statusPill,
                      session.ended_at
                        ? styles.statusPillFinished
                        : styles.statusPillProgress,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        session.ended_at
                          ? styles.statusPillTextFinished
                          : styles.statusPillTextProgress,
                      ]}
                    >
                      {session.ended_at ? "Finished" : "In progress"}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBodyRow}>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardSummary} numberOfLines={3}>
                      {session.session_summary ?? "Climbing session"}
                    </Text>

                    {session.next_session_focus ? (
                      <View style={styles.focusBlock}>
                        <Text style={styles.focusLabel}>NEXT FOCUS</Text>
                        <Text style={styles.focusText} numberOfLines={3}>
                          {session.next_session_focus}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.cardArrow}>›</Text>
                </View>
              </Pressable>
            ))
          : null}
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
    gap: spacing.lg,
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
  count: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.muted,
  },
  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
  },
  errorPanel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.warm,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.warm,
  },
  emptyPanel: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: colors.foreground,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  cardPressed: {
    borderColor: colors.accent,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDate: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.muted,
  },
  statusPill: {
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
  },
  statusPillFinished: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  statusPillProgress: {
    backgroundColor: "transparent",
    borderColor: colors.line,
  },
  statusPillText: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  statusPillTextFinished: {
    color: colors.accentInk,
  },
  statusPillTextProgress: {
    color: colors.muted,
  },
  cardBodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  cardBody: {
    flex: 1,
    gap: spacing.sm,
  },
  cardSummary: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.foreground,
  },
  focusBlock: {
    gap: 2,
  },
  focusLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.accent,
    textTransform: "uppercase",
  },
  focusText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  cardArrow: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.muted,
  },
});
