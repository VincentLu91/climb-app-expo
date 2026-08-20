import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { completeOnboarding } from "../lib/profile";

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

export default function OnboardingScreen() {
  const { user } = useAuth();

  const [profile, setProfile] = useState({
    displayName: "",
    heightCm: "",
    experienceLevel: "",
    typicalGrade: "",
    goal: "",
    weakness: "",
  });

  async function handleSubmit() {
    try {
      await completeOnboarding(user.id, profile);

      Alert.alert("Saved", "Coaching profile saved successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/"),
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Save failed",
        error?.message ?? "Could not save coaching profile.",
      );
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Set up your coaching profile</Text>
      <Text>{user?.email}</Text>

      <TextInput
        placeholder="Display name"
        value={profile.displayName}
        onChangeText={(value) =>
          setProfile((current) => ({
            ...current,
            displayName: value,
          }))
        }
      />
      <TextInput
        placeholder="Height (cm)"
        value={profile.heightCm}
        onChangeText={(value) =>
          setProfile((current) => ({
            ...current,
            heightCm: value,
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
              experienceLevel: option,
            }))
          }
        >
          <Text>
            {profile.experienceLevel === option ? "✓ " : ""}
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
              typicalGrade: option,
            }))
          }
        >
          <Text>
            {profile.typicalGrade === option ? "✓ " : ""}
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
              goal: option,
            }))
          }
        >
          <Text>
            {profile.goal === option ? "✓ " : ""}
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
              weakness: option,
            }))
          }
        >
          <Text>
            {profile.weakness === option ? "✓ " : ""}
            {option}
          </Text>
        </Pressable>
      ))}

      <Pressable onPress={handleSubmit}>
        <Text>Save profile</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
});
