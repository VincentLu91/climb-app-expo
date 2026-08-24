import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../lib/supabase";
import { colors, fonts, spacing } from "../../theme/tokens";

export default function AuthCallbackScreen() {
  const [errorMessage, setErrorMessage] = useState("");
  const { code } = useLocalSearchParams();
  const callbackUrl = Linking.useLinkingURL();
  const processedCallbackRef = useRef(null);

  useEffect(() => {
    if (!callbackUrl && !code) {
      return;
    }

    const callbackKey = callbackUrl ?? code;

    if (processedCallbackRef.current === callbackKey) {
      return;
    }

    processedCallbackRef.current = callbackKey;

    let isMounted = true;

    async function handleCallback() {
      try {
        let error;

        if (callbackUrl?.includes("#")) {
          const fragment = callbackUrl.split("#")[1];
          const params = new URLSearchParams(fragment);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const authError = params.get("error_description");

          if (authError) {
            throw new Error(authError);
          }

          if (!accessToken || !refreshToken) {
            throw new Error("The confirmation link did not include a session.");
          }

          ({ error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }));
        } else if (code) {
          ({ error } = await supabase.auth.exchangeCodeForSession(code));
        } else {
          throw new Error("The confirmation link is incomplete.");
        }

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
  }, [callbackUrl, code]);

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
