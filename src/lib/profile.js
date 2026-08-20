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

export async function completeOnboarding(userId, profile) {
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: profile.displayName.trim(),
    height_cm: profile.heightCm ? Number(profile.heightCm) : null,
    experience_level: profile.experienceLevel,
    typical_grade: profile.typicalGrade,
    goals: profile.goal ? [profile.goal] : [],
    weaknesses: profile.weakness ? [profile.weakness] : [],
    onboarding_version: 1,
    onboarded_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

export async function updateProfile(userId, profile) {
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: profile.display_name.trim(),
      height_cm: profile.height_cm ? Number(profile.height_cm) : null,
      experience_level: profile.experience_level,
      typical_grade: profile.typical_grade,
      goals: profile.goals ?? [],
      weaknesses: profile.weaknesses ?? [],
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}
