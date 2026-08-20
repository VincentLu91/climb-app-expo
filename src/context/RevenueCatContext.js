import { createContext, useContext, useEffect, useState } from "react";

import {
  getRevenueCatCustomerInfo,
  getRevenueCatOfferings,
  hasProEntitlement,
  purchaseRevenueCatPackage,
  subscribeToRevenueCatCustomerInfo,
} from "../lib/revenuecat";
import { useAuth } from "./AuthContext";

const RevenueCatContext = createContext(null);

export function RevenueCatProvider({ children }) {
  const { user } = useAuth();

  const [customerInfo, setCustomerInfo] = useState(null);
  const [offering, setOffering] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCustomerInfo(null);
      setOffering(null);
      setIsPro(false);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadRevenueCatState() {
      try {
        const [nextCustomerInfo, offerings] = await Promise.all([
          getRevenueCatCustomerInfo(),
          getRevenueCatOfferings(),
        ]);

        if (mounted) {
          setCustomerInfo(nextCustomerInfo);
          setOffering(offerings.current ?? null);
          setIsPro(hasProEntitlement(nextCustomerInfo));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    loadRevenueCatState();

    const unsubscribe = subscribeToRevenueCatCustomerInfo(
      (nextCustomerInfo) => {
        if (!mounted) {
          return;
        }

        setCustomerInfo(nextCustomerInfo);
        setIsPro(hasProEntitlement(nextCustomerInfo));
      },
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user]);

  async function purchasePackage(packageToPurchase) {
    const { customerInfo: nextCustomerInfo } = await purchaseRevenueCatPackage(
      packageToPurchase,
    );

    setCustomerInfo(nextCustomerInfo);
    setIsPro(hasProEntitlement(nextCustomerInfo));

    return nextCustomerInfo;
  }

  return (
    <RevenueCatContext.Provider
      value={{
        customerInfo,
        offering,
        isPro,
        loading,
        purchasePackage,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);

  if (!context) {
    throw new Error("useRevenueCat must be used inside RevenueCatProvider");
  }

  return context;
}
