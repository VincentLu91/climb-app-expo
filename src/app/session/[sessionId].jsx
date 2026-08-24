import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { sendSessionChatMessage } from "../../lib/chat";
import {
  analyzeClimbingAttempt,
  analyzeClimbingPhoto,
} from "../../lib/coaching";
import { uploadClimbingAttempt, uploadClimbingPhoto } from "../../lib/media";
import { capturePostHogEvent } from "../../lib/posthog";
import {
  deleteSession,
  finishSession,
  getSessionDetail,
} from "../../lib/sessions";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

function formatSessionDate(startedAt) {
  if (!startedAt) {
    return "Unknown date";
  }

  return new Date(startedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const isDeletingRef = useRef(false);

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

      capturePostHogEvent("share_clip_generated", {
        session_id: activeSessionId,
      });

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

      capturePostHogEvent("share_clip_native_share_invoked", {
        session_id: detail?.session?.id,
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

  function openDeleteModal() {
    if (isDeletingRef.current) {
      return;
    }
    setDeleteError("");
    setIsDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    if (isDeletingRef.current) {
      return;
    }
    setIsDeleteModalOpen(false);
    setDeleteError("");
  }

  async function handleConfirmDelete() {
    if (isDeletingRef.current) {
      return;
    }

    isDeletingRef.current = true;
    setIsDeletingSession(true);
    setDeleteError("");

    try {
      await deleteSession(detail?.session?.id);
      setIsDeleteModalOpen(false);
      router.replace("/history");
    } catch (error) {
      console.error("Failed to delete coaching session:", error);
      setDeleteError(
        error?.message || "Failed to delete this session. Please try again.",
      );
      isDeletingRef.current = false;
      setIsDeletingSession(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { session, latestUpload, latestAnalysis, progressState, messages } =
    detail;

  const hasFocusData =
    progressState &&
    (progressState.active_limiter ||
      progressState.current_experiment ||
      progressState.next_attempt_test ||
      progressState.progress_note);

  const selectedAttachmentIsVideo =
    selectedAttachment?.type === "video" ||
    selectedAttachment?.mimeType?.startsWith("video/");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace("/history")}
        >
          <Text style={styles.backButtonText}>‹ History</Text>
        </Pressable>

        <Text style={styles.wordmark}>
          CLIMB<Text style={styles.wordmarkAccent}>/</Text>COACH
        </Text>

        <View style={styles.topBarSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introRow}>
            <View style={styles.introTextBlock}>
              <Text style={styles.eyebrow}>LIVE COACHING SESSION</Text>
              <Text style={styles.sessionTitle}>Climbing Session</Text>

              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusPill,
                    session.ended_at
                      ? styles.statusPillFinished
                      : styles.statusPillProgress,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      session.ended_at
                        ? styles.statusPillTextFinished
                        : styles.statusPillTextProgress,
                    ]}
                  >
                    {session.ended_at ? "Finished" : "In progress"}
                  </Text>
                </View>

                <Text style={styles.sessionDate}>
                  {formatSessionDate(session.started_at)}
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.deleteButtonPressed,
                isDeletingSession && styles.deleteButtonDisabled,
              ]}
              onPress={openDeleteModal}
              disabled={isDeletingSession}
            >
              <Text style={styles.deleteButtonText}>Delete session</Text>
            </Pressable>
          </View>

          <View style={styles.focusCard}>
            <View style={styles.focusHeaderRow}>
              <Text style={styles.eyebrow}>COACHING FOCUS</Text>
              <View style={styles.liveDot} />
            </View>

            {hasFocusData ? (
              <View style={styles.focusList}>
                {progressState.active_limiter ? (
                  <View style={styles.focusRow}>
                    <Text style={styles.focusRowLabel}>Limiter</Text>
                    <Text style={styles.focusRowValue}>
                      {progressState.active_limiter}
                    </Text>
                  </View>
                ) : null}

                {progressState.current_experiment ? (
                  <View style={styles.focusRow}>
                    <Text style={styles.focusRowLabel}>Current test</Text>
                    <Text style={styles.focusRowValue}>
                      {progressState.current_experiment}
                    </Text>
                  </View>
                ) : null}

                {progressState.next_attempt_test ? (
                  <View style={styles.focusRow}>
                    <Text style={styles.focusRowLabel}>Next attempt</Text>
                    <Text style={styles.focusRowValue}>
                      {progressState.next_attempt_test}
                    </Text>
                  </View>
                ) : null}

                {progressState.progress_note ? (
                  <Text style={styles.focusNote}>
                    {progressState.progress_note}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.focusEmpty}>No coaching state yet.</Text>
            )}
          </View>

          <View style={styles.attemptCard}>
            <Text style={styles.eyebrow}>LATEST ATTEMPT</Text>

            {latestUpload ? (
              <>
                <Text style={styles.attemptNumber}>
                  Attempt {latestUpload.attempt_number}
                </Text>
                <Text style={styles.attemptResult}>
                  {latestAnalysis?.result ?? "No completed analysis yet."}
                </Text>
              </>
            ) : (
              <Text style={styles.attemptEmpty}>No video attempts yet.</Text>
            )}
          </View>

          {session.session_summary ? (
            <View style={styles.summaryCard}>
              <Text style={styles.eyebrow}>SESSION SUMMARY</Text>
              <Text style={styles.summaryText}>{session.session_summary}</Text>
            </View>
          ) : null}

          {session.next_session_focus ? (
            <View style={styles.summaryCard}>
              <Text style={styles.eyebrow}>NEXT SESSION FOCUS</Text>
              <Text style={styles.summaryText}>
                {session.next_session_focus}
              </Text>
            </View>
          ) : null}

          <View style={styles.conversationSection}>
            <Text style={styles.eyebrow}>CONVERSATION</Text>

            {messages.length === 0 ? (
              <Text style={styles.emptyMessages}>No messages yet.</Text>
            ) : (
              messages.map((message) => {
                const isUser = message.sender?.toLowerCase() === "user";

                const senderDisplayLabel = isUser
                  ? "You"
                  : message.sender === "ChatGPT"
                  ? "Coach"
                  : message.sender;

                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubble,
                      isUser ? styles.userBubble : styles.coachBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.senderLabel,
                        isUser
                          ? styles.userSenderLabel
                          : styles.coachSenderLabel,
                      ]}
                    >
                      {senderDisplayLabel}
                    </Text>

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
                      <Text
                        style={[
                          styles.messageText,
                          isUser && styles.userMessageText,
                        ]}
                      >
                        {message.message}
                      </Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {!session.ended_at ? (
          <View style={styles.composerContainer}>
            {selectedAttachment ? (
              <View style={styles.attachmentPreview}>
                <View style={styles.attachmentPreviewInfo}>
                  <Text style={styles.attachmentPreviewText}>
                    {selectedAttachment.fileName ??
                      (selectedAttachmentIsVideo
                        ? "Video selected"
                        : "Photo selected")}
                  </Text>
                  <Text style={styles.attachmentCostLabel}>
                    {selectedAttachmentIsVideo
                      ? "Video attempt · 2 credits"
                      : "Photo analysis · 1 credit"}
                  </Text>
                </View>

                <Pressable onPress={() => setSelectedAttachment(null)}>
                  <Text style={styles.removeAttachment}>Remove</Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={styles.composerLabel}>MESSAGE COACH · FREE</Text>

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
                placeholderTextColor={colors.muted}
                multiline
                style={styles.chatInput}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.sendButton,
                  pressed && styles.sendButtonPressed,
                  (sendingChat || (!chatText.trim() && !selectedAttachment)) &&
                    styles.sendButtonDisabled,
                ]}
                onPress={sendChat}
                disabled={
                  sendingChat || (!chatText.trim() && !selectedAttachment)
                }
              >
                <Text style={styles.sendButtonText}>
                  {sendingChat ? "..." : "Send"}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.mediaCostHint}>
              Photo analysis · 1 credit&nbsp;&nbsp;·&nbsp;&nbsp;Video attempt ·
              2 credits
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryActionButton,
                pressed && styles.secondaryActionButtonPressed,
              ]}
              onPress={() => router.push("/capture")}
            >
              <Text style={styles.secondaryActionText}>
                Start a different problem
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.finishButton,
                pressed && styles.finishButtonPressed,
                finishingSession && styles.finishButtonDisabled,
              ]}
              onPress={finishCurrentSession}
              disabled={finishingSession}
            >
              <Text style={styles.finishButtonText}>
                {finishingSession
                  ? "Finishing session..."
                  : "Finish problem · 1 credit"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {session.ended_at &&
        latestUpload?.media_path &&
        latestAnalysis?.result ? (
          <View style={styles.shareSection}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
                renderingShareClip && styles.primaryButtonDisabled,
              ]}
              onPress={renderShareClip}
              disabled={renderingShareClip}
            >
              <Text style={styles.primaryButtonText}>
                {renderingShareClip
                  ? "Generating share clip..."
                  : "Generate share clip"}
              </Text>
            </Pressable>

            {shareClipUrl ? (
              <>
                <Text style={styles.shareEyebrow}>SHARE CLIP PREVIEW</Text>

                <MessageVideo uri={shareClipUrl} />

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryActionButton,
                    pressed && styles.secondaryActionButtonPressed,
                  ]}
                  onPress={shareRenderedClip}
                  disabled={sharingClip}
                >
                  <Text style={styles.secondaryActionText}>
                    {sharingClip ? "Preparing share..." : "Share clip"}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <Modal
        visible={isDeleteModalOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!isDeletingSession) {
            closeDeleteModal();
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={closeDeleteModal}
            disabled={isDeletingSession}
          />

          <View
            style={styles.modalPanel}
            accessible
            accessibilityRole="alert"
            accessibilityViewIsModal
            accessibilityLabel="Delete this session?"
          >
            <Text style={styles.modalHeading}>Delete this session?</Text>
            <Text style={styles.modalBody}>
              This permanently deletes this session, its coaching conversation,
              analyses, and photos/videos. Your ongoing coaching progress will
              be kept.
            </Text>

            {deleteError ? (
              <Text style={styles.modalError}>{deleteError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed && styles.modalCancelButtonPressed,
                ]}
                onPress={closeDeleteModal}
                disabled={isDeletingSession}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalConfirmButton,
                  pressed && styles.modalConfirmButtonPressed,
                  isDeletingSession && styles.modalConfirmButtonDisabled,
                ]}
                onPress={handleConfirmDelete}
                disabled={isDeletingSession}
              >
                <Text style={styles.modalConfirmText}>
                  {isDeletingSession ? "Deleting..." : "Delete permanently"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.warm,
    textAlign: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    minWidth: 72,
  },
  backButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.muted,
  },
  wordmark: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    letterSpacing: 1.2,
    color: colors.foreground,
  },
  wordmarkAccent: {
    color: colors.accent,
  },
  topBarSpacer: {
    minWidth: 72,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  introRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  introTextBlock: {
    flex: 1,
    gap: spacing.sm,
  },
  eyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.muted,
    textTransform: "uppercase",
  },
  sessionTitle: {
    fontFamily: Platform.select({
      ios: "Arial",
      android: "sans-serif",
      default: "Arial",
    }),
    fontWeight: "600",
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.8,
    color: colors.foreground,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  statusPill: {
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
  },
  statusPillFinished: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  statusPillProgress: {
    backgroundColor: "transparent",
    borderColor: colors.line,
  },
  statusPillText: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  statusPillTextFinished: {
    color: colors.accentInk,
  },
  statusPillTextProgress: {
    color: colors.muted,
  },
  sessionDate: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.muted,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: colors.warm,
    backgroundColor: "transparent",
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: "flex-start",
  },
  deleteButtonPressed: {
    opacity: 0.8,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.warm,
  },
  focusCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  focusHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  focusList: {
    gap: spacing.sm,
  },
  focusRow: {
    gap: 2,
  },
  focusRowLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.muted,
    textTransform: "uppercase",
  },
  focusRowValue: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 19,
    color: colors.foreground,
  },
  focusNote: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  focusEmpty: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
  },
  attemptCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  attemptNumber: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  attemptResult: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  attemptEmpty: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
  },
  summaryCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  summaryText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  conversationSection: {
    gap: spacing.md,
  },
  emptyMessages: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
  },
  messageBubble: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  coachBubble: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
  },
  userBubble: {
    backgroundColor: colors.panelSoft,
    borderColor: colors.accent,
  },
  senderLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  coachSenderLabel: {
    color: colors.muted,
    textAlign: "left",
  },
  userSenderLabel: {
    color: colors.muted,
    textAlign: "right",
  },
  attemptLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.accent,
  },
  messageMedia: {
    width: "100%",
    height: 220,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
  },
  messageText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  userMessageText: {
    color: colors.accent,
    textAlign: "right",
  },
  composerContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  attachmentPreviewInfo: {
    gap: 2,
  },
  attachmentPreviewText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.foreground,
  },
  attachmentCostLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.accent,
  },
  removeAttachment: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.muted,
  },
  composerLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.muted,
    textTransform: "uppercase",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  attachButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    lineHeight: 24,
    color: colors.foreground,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: "top",
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.panelSoft,
  },
  sendButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonPressed: {
    opacity: 0.85,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.accentInk,
  },
  mediaCostHint: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.3,
    color: colors.muted,
  },
  secondaryActionButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  secondaryActionButtonPressed: {
    borderColor: colors.accent,
  },
  secondaryActionText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  finishButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  finishButtonPressed: {
    backgroundColor: colors.panelSoft,
  },
  finishButtonDisabled: {
    opacity: 0.5,
  },
  finishButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.accent,
  },
  shareSection: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    minHeight: 52,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.accentInk,
  },
  shareEyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.muted,
    textTransform: "uppercase",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 10, 9, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalPanel: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    padding: spacing.xl,
  },
  modalHeading: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  modalBody: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  modalError: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.warm,
    marginTop: spacing.md,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  modalCancelButtonPressed: {
    opacity: 0.8,
  },
  modalCancelText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.muted,
  },
  modalConfirmButton: {
    borderWidth: 1,
    borderColor: colors.warm,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  modalConfirmButtonPressed: {
    opacity: 0.8,
  },
  modalConfirmButtonDisabled: {
    opacity: 0.6,
  },
  modalConfirmText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.warm,
  },
});
