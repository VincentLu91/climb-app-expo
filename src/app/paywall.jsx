import { Pressable, StyleSheet, Text, View } from "react-native";

import { useRevenueCat } from "../context/RevenueCatContext";

export default function PaywallScreen() {
  const { offering, isPro, loading, purchasePackage } = useRevenueCat();

  async function handlePurchase(packageIdentifier) {
    const packageToPurchase = offering?.availablePackages?.find(
      (pkg) => pkg.identifier === packageIdentifier,
    );

    if (!packageToPurchase) {
      return;
    }

    try {
      await purchasePackage(packageToPurchase);
    } catch (error) {
      if (!error?.userCancelled) {
        console.log("RevenueCat purchase error:", error);
      }
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Climbing Coach Pro</Text>

      {loading ? (
        <Text>Loading plans...</Text>
      ) : (
        <>
          <Text>Status: {isPro ? "Pro active" : "Free"}</Text>

          <Pressable
            style={styles.button}
            onPress={() => handlePurchase("$rc_monthly")}
          >
            <Text>Monthly</Text>
          </Pressable>

          <Pressable
            style={styles.button}
            onPress={() => handlePurchase("$rc_annual")}
          >
            <Text>Yearly</Text>
          </Pressable>

          <Pressable
            style={styles.button}
            onPress={() => handlePurchase("credits_100")}
          >
            <Text>Buy 100 Credits</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  button: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
});
