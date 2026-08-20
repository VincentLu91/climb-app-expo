import Purchases from "react-native-purchases";

const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

if (!apiKey) {
  throw new Error("Missing RevenueCat API key.");
}

let configured = false;

export function configureRevenueCat() {
  if (configured) {
    return;
  }

  Purchases.configure({
    apiKey,
  });

  configured = true;
}

export async function logInRevenueCat(userId) {
  configureRevenueCat();

  return Purchases.logIn(userId);
}

export async function logOutRevenueCat() {
  configureRevenueCat();

  return Purchases.logOut();
}

export async function getRevenueCatOfferings() {
  configureRevenueCat();

  return Purchases.getOfferings();
}

export async function getRevenueCatCustomerInfo() {
  configureRevenueCat();

  return Purchases.getCustomerInfo();
}

export function hasProEntitlement(customerInfo) {
  return Boolean(customerInfo?.entitlements?.active?.pro);
}

export function subscribeToRevenueCatCustomerInfo(callback) {
  configureRevenueCat();

  Purchases.addCustomerInfoUpdateListener(callback);

  return () => {
    Purchases.removeCustomerInfoUpdateListener(callback);
  };
}

export async function purchaseRevenueCatPackage(packageToPurchase) {
  configureRevenueCat();

  return Purchases.purchasePackage(packageToPurchase);
}
