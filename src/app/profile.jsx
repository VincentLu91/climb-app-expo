import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { getProfile, updateProfile } from "../lib/profile";

const experienceOptions = ["Beginner", "Intermediate", "Advanced"];

const gradeOptions = ["V0-V1", "V2-V3", "V4-V5", "V6-V7", "V8+"];

const goalOptions = [
  "Improve technique",
  "Break through a plateau",
  "Climb harder grades",
  "Send a specific project",
  "Become a stronger all-around climber",
];

const weaknessOptions = [
  "Body positioning",
  "Footwork",
  "Long reaches",
  "Power",
  "Endurance",
  "Route reading",
  "Not sure yet",
];

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) {
        return;
      }

      const data = await getProfile(user.id);
      setProfile(data);
    }

    loadProfile();
  }, [user?.id]);

  async function handleSave() {
    try {
      await updateProfile(user.id, profile);

      Alert.alert("Saved", "Coaching profile updated successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/"),
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Save failed",
        error?.message ?? "Could not update coaching profile.",
      );
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Coaching Profile</Text>
      <TextInput
        placeholder="Display name"
        value={profile?.display_name ?? ""}
        onChangeText={(value) =>
          setProfile((current) => ({
            ...current,
            display_name: value,
          }))
        }
      />
      <TextInput
        placeholder="Height (cm)"
        value={profile?.height_cm?.toString() ?? ""}
        onChangeText={(value) =>
          setProfile((current) => ({
            ...current,
            height_cm: value,
          }))
        }
        keyboardType="numeric"
      />

      <Text>Experience level</Text>

      {experienceOptions.map((option) => (
        <Pressable
          key={option}
          onPress={() =>
            setProfile((current) => ({
              ...current,
              experience_level: option,
            }))
          }
        >
          <Text>
            {profile?.experience_level === option ? "✓ " : ""}
            {option}
          </Text>
        </Pressable>
      ))}

      <Text>Typical grade</Text>

      {gradeOptions.map((option) => (
        <Pressable
          key={option}
          onPress={() =>
            setProfile((current) => ({
              ...current,
              typical_grade: option,
            }))
          }
        >
          <Text>
            {profile?.typical_grade === option ? "✓ " : ""}
            {option}
          </Text>
        </Pressable>
      ))}

      <Text>Primary goal</Text>

      {goalOptions.map((option) => (
        <Pressable
          key={option}
          onPress={() =>
            setProfile((current) => ({
              ...current,
              goals: [option],
            }))
          }
        >
          <Text>
            {profile?.goals?.[0] === option ? "✓ " : ""}
            {option}
          </Text>
        </Pressable>
      ))}

      <Text>Primary weakness</Text>

      {weaknessOptions.map((option) => (
        <Pressable
          key={option}
          onPress={() =>
            setProfile((current) => ({
              ...current,
              weaknesses: [option],
            }))
          }
        >
          <Text>
            {profile?.weaknesses?.[0] === option ? "✓ " : ""}
            {option}
          </Text>
        </Pressable>
      ))}

      <Pressable onPress={handleSave}>
        <Text>Save profile</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
});
