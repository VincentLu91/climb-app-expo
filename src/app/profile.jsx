import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { getProfile, updateProfile } from "../lib/profile";
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

function OptionChips({ options, selectedValue, onSelect }) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const selected = selectedValue === option;

        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && !selected && styles.chipPressed,
            ]}
          >
            <Text
              style={[styles.chipText, selected && styles.chipTextSelected]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) {
        return;
      }

      try {
        const data = await getProfile(user.id);
        setProfile(data);
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfile();
  }, [user?.id]);

  async function handleSave() {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      await updateProfile(user.id, profile);

      Alert.alert("Saved", "Coaching profile updated successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/"),
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Save failed",
        error?.message ?? "Could not update coaching profile.",
      );
    } finally {
      setSaving(false);
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introSection}>
            <Text style={styles.eyebrow}>YOUR COACHING PROFILE</Text>
            <Text style={styles.headline}>
              Keep the coach{"\n"}
              <Text style={styles.headlineAccent}>in sync.</Text>
            </Text>
            <Text style={styles.supportingCopy}>
              These details give every session useful context. Update them as
              your climbing changes.
            </Text>
          </View>

          {loadingProfile ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <View style={styles.formCard}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Display name"
                  placeholderTextColor={colors.muted}
                  value={profile?.display_name ?? ""}
                  onChangeText={(value) =>
                    setProfile((current) => ({
                      ...current,
                      display_name: value,
                    }))
                  }
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Height in cm"
                  placeholderTextColor={colors.muted}
                  value={profile?.height_cm?.toString() ?? ""}
                  onChangeText={(value) =>
                    setProfile((current) => ({
                      ...current,
                      height_cm: value,
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Experience level</Text>
                <OptionChips
                  options={experienceOptions}
                  selectedValue={profile?.experience_level}
                  onSelect={(option) =>
                    setProfile((current) => ({
                      ...current,
                      experience_level: option,
                    }))
                  }
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Typical grade</Text>
                <OptionChips
                  options={gradeOptions}
                  selectedValue={profile?.typical_grade}
                  onSelect={(option) =>
                    setProfile((current) => ({
                      ...current,
                      typical_grade: option,
                    }))
                  }
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Primary goal</Text>
                <OptionChips
                  options={goalOptions}
                  selectedValue={profile?.goals?.[0]}
                  onSelect={(option) =>
                    setProfile((current) => ({
                      ...current,
                      goals: [option],
                    }))
                  }
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Primary weakness</Text>
                <OptionChips
                  options={weaknessOptions}
                  selectedValue={profile?.weaknesses?.[0]}
                  onSelect={(option) =>
                    setProfile((current) => ({
                      ...current,
                      weaknesses: [option],
                    }))
                  }
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  saving && styles.primaryButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? "Saving..." : "Save profile"}
                </Text>
              </Pressable>
            </View>
          )}
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
    fontSize: 30,
    lineHeight: 34,
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
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
  },
  formCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.muted,
    textTransform: "uppercase",
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelSoft,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  chipPressed: {
    borderColor: colors.muted,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  chipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.muted,
  },
  chipTextSelected: {
    color: colors.accentInk,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    minHeight: 52,
    marginTop: spacing.sm,
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
});
