//import * as Linking from "expo-linking";
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

import { supabase } from "../lib/supabase";
import { colors, fonts, radii, spacing } from "../theme/tokens";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Login failed", error.message);
    }
  }

  async function handleSignUp() {
    setLoading(true);

    const emailRedirectTo = "climbapp-dev://auth/callback";

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert("Sign up failed", error.message);
      return;
    }

    Alert.alert("Check your email", "Confirm your account to continue.");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.wordmark}>
            CLIMB<Text style={styles.wordmarkAccent}>/</Text>COACH
          </Text>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>YOUR NEXT MOVE STARTS HERE</Text>

            <Text style={styles.headline}>
              Keep climbing.{"\n"}
              <Text style={styles.headlineAccent}>Keep adapting.</Text>
            </Text>

            <Text style={styles.lede}>
              Return to your coaching loop and pick up where your last attempt
              left off.
            </Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelEyebrow}>WELCOME BACK</Text>
            <Text style={styles.panelHeading}>Log in to your coach</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
                loading && styles.primaryButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? "Loading..." : "Log in"}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
                loading && styles.secondaryButtonDisabled,
              ]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Sign up</Text>
            </Pressable>
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
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
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
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: -2,
    color: colors.foreground,
  },
  headlineAccent: {
    color: colors.accent,
  },
  lede: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
  },
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  panelEyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.muted,
    textTransform: "uppercase",
  },

  panelHeading: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 20,
    color: colors.foreground,
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
  },
  field: {
    gap: spacing.xs,
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
  secondaryButton: {
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
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.foreground,
  },
});
