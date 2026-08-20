import { supabase } from "./supabase";

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "display_name, height_cm, experience_level, typical_grade, climbing_style, goals, weaknesses, onboarding_version, onboarded_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
