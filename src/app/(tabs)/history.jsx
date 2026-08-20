import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { getSessions } from "../../lib/sessions";

export default function HistoryTab() {
  const { user } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadSessions() {
      if (!user?.id) {
        return;
      }

      try {
        const data = await getSessions(user.id);
        setSessions(data);
      } catch (error) {
        setErrorMessage(error?.message ?? "Could not load sessions.");
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [user?.id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>History</Text>

      {errorMessage ? <Text>{errorMessage}</Text> : null}

      {!errorMessage && sessions.length === 0 ? (
        <Text>No climbing sessions yet.</Text>
      ) : null}

      {sessions.map((session) => (
        <Pressable
          key={session.id}
          style={styles.session}
          onPress={() => router.push(`/session/${session.id}`)}
        >
          <Text>{new Date(session.started_at).toLocaleString()}</Text>

          <Text>{session.ended_at ? "Finished" : "In progress"}</Text>

          {session.session_summary ? (
            <Text>{session.session_summary}</Text>
          ) : null}

          {session.next_session_focus ? (
            <Text>Next focus: {session.next_session_focus}</Text>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  session: {
    paddingVertical: 12,
    gap: 4,
  },
});
