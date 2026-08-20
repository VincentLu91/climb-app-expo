import { supabase } from "./supabase";

export async function getCreditBalance(userId) {
  const { data, error } = await supabase
    .from("credit_balances")
    .select("subscription_credits, topup_credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const subscriptionCredits = data?.subscription_credits ?? 0;
  const topupCredits = data?.topup_credits ?? 0;

  return {
    subscriptionCredits,
    topupCredits,
    totalCredits: subscriptionCredits + topupCredits,
  };
}
