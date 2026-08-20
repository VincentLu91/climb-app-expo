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
