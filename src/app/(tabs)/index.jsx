import { StyleSheet, Text, View } from "react-native";

import { useRevenueCat } from "../../context/RevenueCatContext";

export default function HomeTab() {
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
      console.log("RevenueCat purchase error:", error);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>

      <Text>RevenueCat loading: {loading ? "yes" : "no"}</Text>

      <Text>Pro entitlement: {isPro ? "active" : "inactive"}</Text>

      <Text onPress={() => handlePurchase("$rc_monthly")}>Buy Monthly</Text>

      <Text onPress={() => handlePurchase("$rc_annual")}>Buy Yearly</Text>

      <Text onPress={() => handlePurchase("credits_100")}>Buy 100 Credits</Text>
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
