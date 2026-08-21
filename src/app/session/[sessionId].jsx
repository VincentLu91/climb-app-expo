import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { sendSessionChatMessage } from "../../lib/chat";
import {
  analyzeClimbingAttempt,
  analyzeClimbingPhoto,
} from "../../lib/coaching";
import { uploadClimbingAttempt, uploadClimbingPhoto } from "../../lib/media";
import { finishSession, getSessionDetail } from "../../lib/sessions";

function MessageVideo({ uri }) {
  const player = useVideoPlayer({ uri });

  return (
    <VideoView
      player={player}
      style={styles.messageMedia}
      nativeControls
      contentFit="contain"
    />
  );
}

export default function SessionScreen() {
  const { sessionId } = useLocalSearchParams();
  const { user } = useAuth();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [chatText, setChatText] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [sendingChat, setSendingChat] = useState(false);
  const [finishingSession, setFinishingSession] = useState(false);
  const [renderingShareClip, setRenderingShareClip] = useState(false);
  const [shareClipUrl, setShareClipUrl] = useState("");
  const [sharingClip, setSharingClip] = useState(false);

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

  async function pickAttachment() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedAttachment(result.assets[0]);
    }
  }

  async function sendChat() {
    const text = chatText.trim();
    const activeSessionId = detail?.session?.id;

    if (
      sendingChat ||
      !activeSessionId ||
      !user?.id ||
      (!text && !selectedAttachment)
    ) {
      return;
    }

    setSendingChat(true);
    setErrorMessage("");

    try {
      if (selectedAttachment) {
        const isVideo =
          selectedAttachment.type === "video" ||
          selectedAttachment.mimeType?.startsWith("video/");

        if (isVideo) {
          const uploadResult = await uploadClimbingAttempt({
            userId: user.id,
            video: selectedAttachment,
            sessionId: activeSessionId,
            messageText: text,
          });

          await analyzeClimbingAttempt({
            userId: user.id,
            sessionId: uploadResult.sessionId,
            analysisId: uploadResult.analysisId,
            signedUrl: uploadResult.signedUrl,
            attemptNumber: uploadResult.attemptNumber,
            previousAnalysisText: uploadResult.previousAnalysisText,
          });
        } else {
          const uploadResult = await uploadClimbingPhoto({
            userId: user.id,
            photo: selectedAttachment,
            sessionId: activeSessionId,
            messageText: text,
          });

          await analyzeClimbingPhoto({
            userId: user.id,
            sessionId: activeSessionId,
            analysisId: uploadResult.analysisId,
            imageUrl: uploadResult.signedUrl,
            prompt: text || null,
          });
        }

        const refreshedDetail = await getSessionDetail(
          user.id,
          activeSessionId,
        );

        setDetail(refreshedDetail);
        setSelectedAttachment(null);
        setChatText("");
        return;
      }

      const { userMessage, coachMessage } = await sendSessionChatMessage({
        userId: user.id,
        sessionId: activeSessionId,
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

  async function renderShareClip() {
    const activeSessionId = detail?.session?.id;
    const upload = detail?.latestUpload;
    const analysis = detail?.latestAnalysis;

    if (
      renderingShareClip ||
      !activeSessionId ||
      !upload?.media_path ||
      !analysis?.result
    ) {
      return;
    }

    setRenderingShareClip(true);
    setErrorMessage("");

    try {
      const response = await apiFetch("/api/render-share-clip", {
        method: "POST",
        body: JSON.stringify({
          sessionId: activeSessionId,
          mediaPath: upload.media_path,
          coachingCaption: analysis.result,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to render share clip.");
      }

      setShareClipUrl(result.signedUrl);

      console.log("Share clip rendered:", result);
    } catch (error) {
      console.error("Failed to render share clip:", error);
      setErrorMessage(error.message || "Failed to render share clip.");
    } finally {
      setRenderingShareClip(false);
    }
  }

  async function shareRenderedClip() {
    if (!shareClipUrl || sharingClip) {
      return;
    }

    setSharingClip(true);
    setErrorMessage("");

    try {
      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        throw new Error("Sharing is not available on this device.");
      }

      const destination = new File(
        Paths.cache,
        `climb-share-${Date.now()}.mp4`,
      );

      const downloadedFile = await File.downloadFileAsync(
        shareClipUrl,
        destination,
      );

      await Sharing.shareAsync(downloadedFile.uri, {
        mimeType: "video/mp4",
        dialogTitle: "Share climbing clip",
      });
    } catch (error) {
      console.error("Failed to share clip:", error);
      setErrorMessage(error.message || "Failed to share clip.");
    } finally {
      setSharingClip(false);
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

            {message.attachment?.media_type === "video" &&
            message.attachment?.attempt_number ? (
              <Text style={styles.attemptLabel}>
                Attempt {message.attachment.attempt_number}
              </Text>
            ) : null}

            {message.attachment?.signedUrl ? (
              message.attachment.media_type === "video" ? (
                <MessageVideo uri={message.attachment.signedUrl} />
              ) : (
                <Image
                  source={{ uri: message.attachment.signedUrl }}
                  style={styles.messageMedia}
                  resizeMode="contain"
                />
              )
            ) : null}

            {message.message &&
            message.message !==
              `Attempt ${message.attachment?.attempt_number}` ? (
              <Text>{message.message}</Text>
            ) : null}
          </View>
        ))
      )}

      {!session.ended_at ? (
        <>
          {selectedAttachment ? (
            <View style={styles.attachmentPreview}>
              <Text>
                {selectedAttachment.fileName ??
                  (selectedAttachment.type === "video"
                    ? "Video selected"
                    : "Photo selected")}
              </Text>

              <Pressable onPress={() => setSelectedAttachment(null)}>
                <Text style={styles.removeAttachment}>Remove</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.composerRow}>
            <Pressable
              style={styles.attachButton}
              onPress={pickAttachment}
              disabled={sendingChat}
            >
              <Text style={styles.attachButtonText}>+</Text>
            </Pressable>

            <TextInput
              value={chatText}
              onChangeText={setChatText}
              placeholder="Ask your coach..."
              multiline
              style={styles.chatInput}
            />

            <Pressable
              style={styles.sendButton}
              onPress={sendChat}
              disabled={
                sendingChat || (!chatText.trim() && !selectedAttachment)
              }
            >
              <Text style={styles.buttonText}>
                {sendingChat ? "..." : "Send"}
              </Text>
            </Pressable>
          </View>

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

      {session.ended_at &&
      latestUpload?.media_path &&
      latestAnalysis?.result ? (
        <>
          <Pressable
            style={styles.button}
            onPress={renderShareClip}
            disabled={renderingShareClip}
          >
            <Text style={styles.buttonText}>
              {renderingShareClip
                ? "Generating share clip..."
                : "Generate Share Clip"}
            </Text>
          </Pressable>

          {shareClipUrl ? (
            <>
              <Text style={styles.sectionTitle}>Share clip preview</Text>

              <MessageVideo uri={shareClipUrl} />

              <Pressable
                style={styles.button}
                onPress={shareRenderedClip}
                disabled={sharingClip}
              >
                <Text style={styles.buttonText}>
                  {sharingClip ? "Preparing share..." : "Share Clip"}
                </Text>
              </Pressable>
            </>
          ) : null}
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
    flex: 1,
    borderWidth: 1,
    borderColor: "#cccccc",
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
    maxHeight: 120,
    textAlignVertical: "top",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  attachButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#cccccc",
    alignItems: "center",
    justifyContent: "center",
  },
  attachButtonText: {
    fontSize: 28,
    lineHeight: 30,
  },
  sendButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    backgroundColor: "#111111",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#cccccc",
    borderRadius: 8,
    marginTop: 8,
  },
  removeAttachment: {
    fontWeight: "600",
  },
  messageMedia: {
    width: "100%",
    height: 280,
    borderRadius: 8,
    marginVertical: 8,
  },
  attemptLabel: {
    fontWeight: "600",
    marginTop: 4,
  },
});
