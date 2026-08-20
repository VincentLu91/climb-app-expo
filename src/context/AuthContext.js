import { createContext, useContext, useEffect, useState } from "react";

import { getCurrentSession, subscribeToAuthChanges } from "../lib/auth";
import { logInRevenueCat, logOutRevenueCat } from "../lib/revenuecat";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function syncRevenueCat(nextSession) {
      if (nextSession?.user?.id) {
        await logInRevenueCat(nextSession.user.id);
      } else {
        await logOutRevenueCat();
      }
    }

    async function loadSession() {
      const currentSession = await getCurrentSession();

      await syncRevenueCat(currentSession);

      if (mounted) {
        setSession(currentSession);
        setLoading(false);
      }
    }

    loadSession();

    const subscription = subscribeToAuthChanges(async (nextSession) => {
      await syncRevenueCat(nextSession);

      if (mounted) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
