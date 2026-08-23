import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../lib/supabase";
import { colors, fonts, spacing } from "../../theme/tokens";

export default function AuthCallbackScreen() {
  const [errorMessage, setErrorMessage] = useState("");
  const { code } = useLocalSearchParams();
  const processedCodeRef = useRef(null);

  useEffect(() => {
    if (!code) {
      return;
    }

    if (processedCodeRef.current === code) {
      return;
    }

    processedCodeRef.current = code;

    let isMounted = true;

    async function handleCallback() {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          throw error;
        }

        if (isMounted) {
          router.replace("/");
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "Could not confirm your account.");
        }
      }
    }

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [code]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.wordmark}>
          CLIMB<Text style={styles.wordmarkAccent}>/</Text>COACH
        </Text>

        {errorMessage ? (
          <View style={styles.stateBlock}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : (
          <View style={styles.stateBlock}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.statusText}>Confirming your account...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
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
  stateBlock: {
    alignItems: "center",
    gap: spacing.md,
  },
  statusText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.muted,
  },
  errorText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.warm,
    textAlign: "center",
  },
});
