import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { sendSessionChatMessage } from "../../lib/chat";
import { finishSession, getSessionDetail } from "../../lib/sessions";

export default function SessionScreen() {
  const { sessionId } = useLocalSearchParams();
  const { user } = useAuth();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [finishingSession, setFinishingSession] = useState(false);

  useEffect(() => {
    async function loadSession() {
      if (!user?.id || !sessionId) {
        return;
      }

      try {
        const data = await getSessionDetail(user.id, sessionId);
        setDetail(data);
      } catch (error) {
        setErrorMessage(error?.message ?? "Could not load session.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [user?.id, sessionId]);

  async function sendChat() {
    const text = chatText.trim();

    if (!text || sendingChat || !detail?.session?.id || !user?.id) {
      return;
    }

    setSendingChat(true);
    setErrorMessage("");

    try {
      const { userMessage, coachMessage } = await sendSessionChatMessage({
        userId: user.id,
        sessionId: detail.session.id,
        message: text,
      });

      setDetail((current) => ({
        ...current,
        messages: [...(current?.messages ?? []), userMessage, coachMessage],
      }));

      setChatText("");
    } catch (error) {
      console.error("Failed to send chat message:", error);
      setErrorMessage(error.message || "Failed to send message.");
    } finally {
      setSendingChat(false);
    }
  }

  async function finishCurrentSession() {
    if (finishingSession || !session?.id) {
      return;
    }

    setFinishingSession(true);
    setErrorMessage("");

    try {
      const result = await finishSession(session.id);

      setDetail((current) => ({
        ...current,
        session: {
          ...current.session,
          ended_at: new Date().toISOString(),
          session_summary: result.sessionSummary,
          next_session_focus: result.nextSessionFocus,
        },
      }));
    } catch (error) {
      console.error("Failed to finish session:", error);
      setErrorMessage(error.message || "Failed to finish session.");
    } finally {
      setFinishingSession(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.container}>
        <Text>{errorMessage}</Text>
      </View>
    );
  }

  const { session, latestUpload, latestAnalysis, progressState, messages } =
    detail;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Climbing Session</Text>

      <Text>{new Date(session.started_at).toLocaleString()}</Text>
      <Text>{session.ended_at ? "Finished" : "In progress"}</Text>

      {session.session_summary ? (
        <>
          <Text style={styles.sectionTitle}>Session summary</Text>
          <Text>{session.session_summary}</Text>
        </>
      ) : null}

      {session.next_session_focus ? (
        <>
          <Text style={styles.sectionTitle}>Next session focus</Text>
          <Text>{session.next_session_focus}</Text>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Latest attempt</Text>

      {latestUpload ? (
        <>
          <Text>Attempt {latestUpload.attempt_number}</Text>
          <Text>{latestAnalysis?.result ?? "No completed analysis yet."}</Text>
        </>
      ) : (
        <Text>No video attempts yet.</Text>
      )}

      <Text style={styles.sectionTitle}>Coaching state</Text>
      {!session.ended_at ? (
        <>
          <Pressable
            style={styles.button}
            onPress={() =>
              router.push({
                pathname: "/capture",
                params: { sessionId },
              })
            }
          >
            <Text style={styles.buttonText}>Next attempt on this problem</Text>
          </Pressable>

          <Pressable
            style={styles.button}
            onPress={() =>
              router.push({
                pathname: "/capture",
                params: { sessionId: session.id },
              })
            }
          >
            <Text style={styles.buttonText}>Add wall/problem photo</Text>
          </Pressable>

          <Pressable
            style={styles.button}
            onPress={() => router.push("/capture")}
          >
            <Text style={styles.buttonText}>Start a different problem</Text>
          </Pressable>

          <Pressable
            style={styles.button}
            onPress={finishCurrentSession}
            disabled={finishingSession}
          >
            <Text style={styles.buttonText}>
              {finishingSession ? "Finishing session..." : "Finish Session"}
            </Text>
          </Pressable>
        </>
      ) : null}

      {progressState ? (
        <>
          <Text>Active limiter: {progressState.active_limiter ?? "None"}</Text>
          <Text>Experiment: {progressState.current_experiment ?? "None"}</Text>
          <Text>Next attempt: {progressState.next_attempt_test ?? "None"}</Text>
          {progressState.progress_note ? (
            <Text>{progressState.progress_note}</Text>
          ) : null}
        </>
      ) : (
        <Text>No coaching state yet.</Text>
      )}

      <Text style={styles.sectionTitle}>Conversation</Text>

      {messages.length === 0 ? (
        <Text>No messages yet.</Text>
      ) : (
        messages.map((message) => (
          <View key={message.id} style={styles.message}>
            <Text style={styles.sender}>{message.sender}</Text>
            <Text>{message.message}</Text>
          </View>
        ))
      )}

      {!session.ended_at ? (
        <>
          <TextInput
            value={chatText}
            onChangeText={setChatText}
            placeholder="Ask your coach..."
            multiline
            style={styles.chatInput}
          />

          <Pressable
            style={styles.button}
            onPress={sendChat}
            disabled={sendingChat || !chatText.trim()}
          >
            <Text style={styles.buttonText}>
              {sendingChat ? "Coach thinking..." : "Send"}
            </Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 10,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
  },
  message: {
    paddingVertical: 8,
  },
  sender: {
    fontWeight: "700",
  },
  button: {
    padding: 14,
    backgroundColor: "#111111",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  chatInput: {
    borderWidth: 1,
    borderColor: "#cccccc",
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    marginTop: 8,
  },
});
