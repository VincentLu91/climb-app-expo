import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useRevenueCat } from "../../context/RevenueCatContext";

export default function HomeTab() {
  const { isPro } = useRevenueCat();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>

      <Text>Pro entitlement: {isPro ? "active" : "inactive"}</Text>

      <Pressable onPress={() => router.push("/paywall")}>
        <Text>Open Paywall</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
});
