import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { completeOnboarding } from "../lib/profile";
import { colors, fonts, radii, spacing } from "../theme/tokens";

const experienceOptions = ["Beginner", "Intermediate", "Advanced"];

const gradeOptions = ["V0-V1", "V2-V3", "V4-V5", "V6-V7", "V8+"];

const goalOptions = [
  "Improve technique",
  "Break through a plateau",
  "Climb harder grades",
  "Send a specific project",
  "Become a stronger all-around climber",
];

const weaknessOptions = [
  "Body positioning",
  "Footwork",
  "Long reaches",
  "Power",
  "Endurance",
  "Route reading",
  "Not sure yet",
];

const stepMeta = [
  {
    label: "Your name",
    heading: "What should your coach call you?",
    support: "A little context helps the coach keep the session personal.",
  },
  {
    label: "Experience",
    heading: "How experienced are you with climbing?",
    support: "This helps your coach tailor feedback to your current level.",
  },
  {
    label: "Typical grade",
    heading: "What grade do you usually climb?",
    support: "Choose the range that best represents your normal sessions.",
  },
  {
    label: "Reach context",
    heading: "How tall are you?",
    support: "Height can affect reach, positioning, and movement options.",
  },
  {
    label: "Your goal",
    heading: "What do you want to achieve with your climbing?",
    support: "Keep feedback aligned with what you want from climbing.",
  },
  {
    label: "Your limiter",
    heading: "What tends to hold you back most?",
    support: "Start with a hypothesis, then let your climbing confirm it.",
  },
];

const totalSteps = stepMeta.length;

function OptionCard({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        selected && styles.optionCardSelected,
        pressed && !selected && styles.optionCardPressed,
      ]}
    >
      <Text
        style={[
          styles.optionCardText,
          selected && styles.optionCardTextSelected,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.optionCardArrow,
          selected && styles.optionCardArrowSelected,
        ]}
      >
        {selected ? "✓" : "›"}
      </Text>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const { user } = useAuth();

  const [profile, setProfile] = useState({
    displayName: "",
    heightCm: "",
    experienceLevel: "",
    typicalGrade: "",
    goal: "",
    weakness: "",
  });

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  function handleNext() {
    setStep((currentStep) => Math.min(currentStep + 1, totalSteps - 1));
  }

  function handleBack() {
    setStep((currentStep) => Math.max(currentStep - 1, 0));
  }

  async function handleSubmit() {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await completeOnboarding(user.id, profile);

      Alert.alert("Saved", "Coaching profile saved successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/"),
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Save failed",
        error?.message ?? "Could not save coaching profile.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const meta = stepMeta[step];
  const progressPercent = ((step + 1) / totalSteps) * 100;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.wordmark}>
            CLIMB<Text style={styles.wordmarkAccent}>/</Text>COACH
          </Text>

          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>
                STEP {step + 1} OF {totalSteps}
              </Text>
              <Text style={styles.progressStepName}>{meta.label}</Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
              />
            </View>
          </View>

          <View style={styles.stepCard}>
            <Text style={styles.eyebrow}>BUILD YOUR COACHING CONTEXT</Text>
            <Text style={styles.headline}>{meta.heading}</Text>
            <Text style={styles.supportingCopy}>{meta.support}</Text>

            {step === 0 ? (
              <View style={styles.stepBody}>
                <TextInput
                  autoFocus
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={colors.muted}
                  value={profile.displayName}
                  onChangeText={(value) =>
                    setProfile((current) => ({
                      ...current,
                      displayName: value,
                    }))
                  }
                />

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                    !profile.displayName.trim() && styles.primaryButtonDisabled,
                  ]}
                  onPress={handleNext}
                  disabled={!profile.displayName.trim()}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </Pressable>
              </View>
            ) : null}

            {step === 1 ? (
              <View style={styles.stepBody}>
                <View style={styles.optionList}>
                  {experienceOptions.map((option) => (
                    <OptionCard
                      key={option}
                      label={option}
                      selected={profile.experienceLevel === option}
                      onPress={() => {
                        setProfile((current) => ({
                          ...current,
                          experienceLevel: option,
                        }));
                        handleNext();
                      }}
                    />
                  ))}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && styles.backButtonPressed,
                  ]}
                  onPress={handleBack}
                >
                  <Text style={styles.backButtonText}>‹ Back</Text>
                </Pressable>
              </View>
            ) : null}

            {step === 2 ? (
              <View style={styles.stepBody}>
                <View style={styles.optionList}>
                  {gradeOptions.map((option) => (
                    <OptionCard
                      key={option}
                      label={option}
                      selected={profile.typicalGrade === option}
                      onPress={() => {
                        setProfile((current) => ({
                          ...current,
                          typicalGrade: option,
                        }));
                        handleNext();
                      }}
                    />
                  ))}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && styles.backButtonPressed,
                  ]}
                  onPress={handleBack}
                >
                  <Text style={styles.backButtonText}>‹ Back</Text>
                </Pressable>
              </View>
            ) : null}

            {step === 3 ? (
              <View style={styles.stepBody}>
                <TextInput
                  autoFocus
                  style={styles.input}
                  placeholder="Height in cm"
                  placeholderTextColor={colors.muted}
                  value={profile.heightCm}
                  onChangeText={(value) =>
                    setProfile((current) => ({
                      ...current,
                      heightCm: value,
                    }))
                  }
                  keyboardType="numeric"
                />

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                    !profile.heightCm && styles.primaryButtonDisabled,
                  ]}
                  onPress={handleNext}
                  disabled={!profile.heightCm}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && styles.backButtonPressed,
                  ]}
                  onPress={handleBack}
                >
                  <Text style={styles.backButtonText}>‹ Back</Text>
                </Pressable>
              </View>
            ) : null}

            {step === 4 ? (
              <View style={styles.stepBody}>
                <View style={styles.optionList}>
                  {goalOptions.map((option) => (
                    <OptionCard
                      key={option}
                      label={option}
                      selected={profile.goal === option}
                      onPress={() => {
                        setProfile((current) => ({
                          ...current,
                          goal: option,
                        }));
                        handleNext();
                      }}
                    />
                  ))}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && styles.backButtonPressed,
                  ]}
                  onPress={handleBack}
                >
                  <Text style={styles.backButtonText}>‹ Back</Text>
                </Pressable>
              </View>
            ) : null}

            {step === 5 ? (
              <View style={styles.stepBody}>
                <View style={styles.optionList}>
                  {weaknessOptions.map((option) => (
                    <OptionCard
                      key={option}
                      label={option}
                      selected={profile.weakness === option}
                      onPress={() =>
                        setProfile((current) => ({
                          ...current,
                          weakness: option,
                        }))
                      }
                    />
                  ))}
                </View>

                <View style={styles.finalActionsRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.backButton,
                      pressed && styles.backButtonPressed,
                    ]}
                    onPress={handleBack}
                  >
                    <Text style={styles.backButtonText}>‹ Back</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      styles.finalPrimaryButton,
                      pressed && styles.primaryButtonPressed,
                      (submitting || !profile.weakness) &&
                        styles.primaryButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={submitting || !profile.weakness}
                  >
                    <Text style={styles.primaryButtonText}>
                      {submitting ? "Saving..." : "Build my coaching profile"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
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
  progressSection: {
    gap: spacing.xs,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.muted,
    textTransform: "uppercase",
  },
  progressStepName: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.accent,
    textTransform: "uppercase",
  },
  progressTrack: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  stepCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
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
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.6,
    color: colors.foreground,
  },
  supportingCopy: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  stepBody: {
    gap: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.panelSoft,
  },
  optionList: {
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelSoft,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  optionCardPressed: {
    borderColor: colors.muted,
  },
  optionCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  optionCardText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.foreground,
  },
  optionCardTextSelected: {
    color: colors.accentInk,
  },
  optionCardArrow: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.muted,
    marginLeft: spacing.sm,
  },
  optionCardArrowSelected: {
    color: colors.accentInk,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    minHeight: 52,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.accentInk,
  },
  finalActionsRow: {
    gap: spacing.sm,
  },
  finalPrimaryButton: {
    width: "100%",
  },
  backButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  backButtonPressed: {
    borderColor: colors.accent,
  },
  backButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.muted,
  },
});
