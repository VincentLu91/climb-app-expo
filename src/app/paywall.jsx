import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRevenueCat } from "../context/RevenueCatContext";
import { colors, fonts, radii, spacing } from "../theme/tokens";

const creditCosts = [
  { label: "Text-only coach chat", cost: "Free" },
  { label: "Photo analysis", cost: "1 credit" },
  { label: "Video attempt", cost: "2 credits" },
  { label: "Finish problem", cost: "1 credit" },
];

export default function PaywallScreen() {
  const { offering, loading, purchasePackage } = useRevenueCat();

  const [purchasingIdentifier, setPurchasingIdentifier] = useState(null);

  const availablePackages = offering?.availablePackages ?? [];

  // Existing RevenueCat offering slots identify which package fills each
  // presentation role. No package or product identifiers are hardcoded.
  const monthlyPackage = offering?.monthly ?? null;
  const annualPackage = offering?.annual ?? null;

  const subscriptionIdentifiers = new Set(
    [monthlyPackage, annualPackage]
      .filter(Boolean)
      .map((pkg) => pkg.identifier),
  );

  const creditPackPackage =
    availablePackages.find(
      (pkg) => !subscriptionIdentifiers.has(pkg.identifier),
    ) ?? null;

  async function handlePurchase(packageToPurchase) {
    if (!packageToPurchase || purchasingIdentifier) {
      return;
    }

    setPurchasingIdentifier(packageToPurchase.identifier);

    try {
      await purchasePackage(packageToPurchase);

      Alert.alert("Purchase complete", "Your plan is now active.");
    } catch (error) {
      if (!error?.userCancelled) {
        console.log("RevenueCat purchase error:", error);

        Alert.alert(
          "Purchase failed",
          error?.message ?? "Something went wrong. Please try again.",
        );
      }
    } finally {
      setPurchasingIdentifier(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>

        <Text style={styles.wordmark}>
          CLIMB<Text style={styles.wordmarkAccent}>/</Text>COACH
        </Text>

        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <Text style={styles.eyebrow}>KEEP THE LOOP MOVING</Text>
          <Text style={styles.headline}>
            Coaching that{"\n"}
            <Text style={styles.headlineAccent}>keeps up.</Text>
          </Text>
          <Text style={styles.supportingCopy}>
            Use credits for focused video analysis, route context, and ongoing
            coaching. Choose a plan for regular sessions or a pack for the days
            you want to drop in.
          </Text>
        </View>

        <View style={styles.heroNote}>
          <Text style={styles.heroNoteLabel}>YOUR NEXT SESSION</Text>
          <Text style={styles.heroNoteHeading}>Ready when you are.</Text>
          <Text style={styles.heroNoteBody}>
            Pick up where your coaching loop left off.
          </Text>
        </View>

        <View style={styles.creditPanel}>
          <Text style={styles.creditPanelHeading}>WHAT COSTS CREDITS</Text>

          {creditCosts.map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.creditRow,
                index === creditCosts.length - 1 && styles.creditRowLast,
              ]}
            >
              <Text style={styles.creditRowLabel}>{item.label}</Text>
              <Text
                style={[
                  styles.creditRowCost,
                  item.cost === "Free" && styles.creditRowCostFree,
                ]}
              >
                {item.cost}
              </Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Loading plans...</Text>
          </View>
        ) : availablePackages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No plans are available right now. Please check back soon.
            </Text>
          </View>
        ) : (
          <>
            {monthlyPackage || annualPackage ? (
              <View style={styles.plansSection}>
                <Text style={styles.eyebrow}>REGULAR PRACTICE</Text>
                <Text style={styles.sectionHeading}>Choose your rhythm.</Text>

                <View style={styles.plansList}>
                  {monthlyPackage ? (
                    <View style={styles.planCard}>
                      <View style={styles.planCardTop}>
                        <Text style={styles.planCardTopLabel}>
                          01 / MONTHLY
                        </Text>
                        <Text style={styles.planCardTopBadge}>7 DAYS FREE</Text>
                      </View>

                      <Text style={styles.planTitle}>Monthly</Text>

                      <View style={styles.priceRow}>
                        <Text style={styles.planPrice}>
                          {monthlyPackage.product?.priceString}
                        </Text>
                        <Text style={styles.planPeriod}>/ month</Text>
                      </View>

                      <Text style={styles.planDescription}>
                        For climbers building a consistent practice with 200
                        credits each month after the trial.
                      </Text>

                      <Pressable
                        style={({ pressed }) => [
                          styles.primaryButton,
                          pressed && styles.primaryButtonPressed,
                          purchasingIdentifier !== null &&
                            styles.primaryButtonDisabled,
                        ]}
                        onPress={() => handlePurchase(monthlyPackage)}
                        disabled={purchasingIdentifier !== null}
                      >
                        <Text style={styles.primaryButtonText}>
                          {purchasingIdentifier === monthlyPackage.identifier
                            ? "Processing..."
                            : "Start monthly trial"}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {annualPackage ? (
                    <View style={[styles.planCard, styles.planCardFeatured]}>
                      <View style={styles.planCardTop}>
                        <Text style={styles.planCardTopLabel}>02 / YEARLY</Text>
                        <Text style={styles.planCardTopBadgeAccent}>
                          RECOMMENDED RHYTHM
                        </Text>
                      </View>

                      <Text style={styles.planTitle}>Yearly</Text>

                      <View style={styles.priceRow}>
                        <Text style={styles.planPrice}>
                          {annualPackage.product?.priceString}
                        </Text>
                        <Text style={styles.planPeriod}>/ year</Text>
                      </View>

                      <Text style={styles.planDescription}>
                        For a full season of adaptive coaching with 2,400
                        credits each year after the trial.
                      </Text>

                      <Pressable
                        style={({ pressed }) => [
                          styles.primaryButton,
                          pressed && styles.primaryButtonPressed,
                          purchasingIdentifier !== null &&
                            styles.primaryButtonDisabled,
                        ]}
                        onPress={() => handlePurchase(annualPackage)}
                        disabled={purchasingIdentifier !== null}
                      >
                        <Text style={styles.primaryButtonText}>
                          {purchasingIdentifier === annualPackage.identifier
                            ? "Processing..."
                            : "Start yearly trial"}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {creditPackPackage ? (
              <View style={styles.plansSection}>
                <Text style={styles.eyebrow}>OCCASIONAL USE</Text>
                <Text style={styles.sectionHeading}>
                  Just need more coaching credits?
                </Text>

                <View style={styles.packCard}>
                  <Text style={styles.packDescription}>
                    Buy 100 credits once. No subscription required.
                  </Text>

                  <View style={styles.packPriceRow}>
                    <Text style={styles.packPrice}>
                      {creditPackPackage.product?.priceString}
                    </Text>
                    <Text style={styles.packPriceLabel}>ONE-TIME</Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.primaryButtonPressed,
                      purchasingIdentifier !== null &&
                        styles.primaryButtonDisabled,
                    ]}
                    onPress={() => handlePurchase(creditPackPackage)}
                    disabled={purchasingIdentifier !== null}
                  >
                    <Text style={styles.primaryButtonText}>
                      {purchasingIdentifier === creditPackPackage.identifier
                        ? "Processing..."
                        : "Buy credit pack"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    minWidth: 72,
  },
  backButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.muted,
  },
  wordmark: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    letterSpacing: 1.2,
    color: colors.foreground,
  },
  wordmarkAccent: {
    color: colors.accent,
  },
  topBarSpacer: {
    minWidth: 72,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  introSection: {
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
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -1,
    color: colors.foreground,
  },
  headlineAccent: {
    color: colors.accent,
  },
  supportingCopy: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  heroNote: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  heroNoteLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.accent,
    textTransform: "uppercase",
  },

  heroNoteHeading: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    color: colors.foreground,
  },
  heroNoteBody: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  creditPanel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  creditPanelHeading: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  creditRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  creditRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  creditRowLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  creditRowCost: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.foreground,
    textTransform: "uppercase",
  },
  creditRowCostFree: {
    color: colors.accent,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.muted,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
  },
  emptyStateText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: "center",
  },
  plansSection: {
    gap: spacing.md,
  },
  sectionHeading: {
    fontFamily: Platform.select({
      ios: "Arial",
      android: "sans-serif",
      default: "Arial",
    }),
    fontWeight: "600",
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: colors.foreground,
    marginTop: -spacing.xs,
  },
  plansList: {
    gap: spacing.md,
  },
  planCard: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  planCardFeatured: {
    borderColor: colors.accent,
  },
  planCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planCardTopLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.muted,
    textTransform: "uppercase",
  },
  planCardTopBadge: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.muted,
    textTransform: "uppercase",
  },
  planCardTopBadgeAccent: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.accent,
    textTransform: "uppercase",
  },
  planTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 18,
    color: colors.foreground,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
  },
  planPrice: {
    fontFamily: fonts.sansBold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.foreground,
  },
  planPeriod: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.muted,
  },
  planDescription: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  packCard: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  packDescription: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  packPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  packPrice: {
    fontFamily: fonts.sansBold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.foreground,
  },
  packPriceLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.muted,
    textTransform: "uppercase",
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    marginTop: spacing.xs,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.accentInk,
  },
});
