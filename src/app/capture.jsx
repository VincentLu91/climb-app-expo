import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import { useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { analyzeClimbingAttempt, analyzeClimbingPhoto } from "../lib/coaching";

import { uploadClimbingAttempt, uploadClimbingPhoto } from "../lib/media";
import { colors, fonts, radii, spacing } from "../theme/tokens";

function VideoPreview({ uri }) {
  const player = useVideoPlayer({ uri });

  return (
    <View style={styles.previewBlock}>
      <VideoView
        player={player}
        style={styles.previewMedia}
        nativeControls
        contentFit="contain"
      />

      <Pressable
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.secondaryButtonPressed,
        ]}
        onPress={() => player.play()}
      >
        <Text style={styles.secondaryButtonText}>Play preview</Text>
      </Pressable>
    </View>
  );
}

export default function CaptureScreen() {
  const cameraRef = useRef(null);
  const { user } = useAuth();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [cameraOpen, setCameraOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);

  const params = useLocalSearchParams();

  const sessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : params.sessionId ?? null;

  async function pickVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Media library access is required to choose a climbing video.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedVideo(result.assets[0]);
    }
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Media library access is required to choose a wall photo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedPhoto(result.assets[0]);
    }
  }

  async function analyzePhoto() {
    if (!selectedPhoto?.uri || analyzingPhoto) {
      return;
    }

    setAnalyzingPhoto(true);

    try {
      const uploadResult = await uploadClimbingPhoto({
        userId: user.id,
        photo: selectedPhoto,
        sessionId,
      });

      const analysisResult = await analyzeClimbingPhoto({
        userId: user.id,
        sessionId,
        analysisId: uploadResult.analysisId,
        imageUrl: uploadResult.signedUrl,
      });

      Alert.alert(
        "Photo analysis complete",
        analysisResult.analysisText ?? "Your wall photo was analyzed.",
      );
    } catch (error) {
      if (error.code === "INSUFFICIENT_CREDITS") {
        Alert.alert(
          "More credits needed",
          "You do not have enough credits to analyze this photo.",
        );
        return;
      }

      Alert.alert(
        "Photo analysis failed",
        error?.message ?? "Could not analyze wall photo.",
      );
    } finally {
      setAnalyzingPhoto(false);
    }
  }

  async function openCamera() {
    let permission = cameraPermission;

    if (!permission?.granted) {
      permission = await requestCameraPermission();
    }

    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Camera access is required to record a climbing attempt.",
      );
      return;
    }

    setCameraOpen(true);
  }

  async function uploadAttempt() {
    if (!selectedVideo?.uri || uploading) {
      return;
    }

    setUploading(true);

    let uploadResult = null;

    try {
      uploadResult = await uploadClimbingAttempt({
        userId: user.id,
        video: selectedVideo,
        sessionId,
      });

      const analysisResult = await analyzeClimbingAttempt({
        userId: user.id,
        sessionId: uploadResult.sessionId,
        analysisId: uploadResult.analysisId,
        signedUrl: uploadResult.signedUrl,
        attemptNumber: uploadResult.attemptNumber,
        previousAnalysisText: uploadResult.previousAnalysisText,
      });

      Alert.alert(
        "Analysis complete",
        analysisResult.progressUpdated
          ? "Your coaching feedback is ready."
          : "Your coaching feedback is ready, but progression state could not be updated.",
        [
          {
            text: "OK",
            onPress: () => router.replace(`/session/${uploadResult.sessionId}`),
          },
        ],
      );
    } catch (error) {
      if (error.code === "INSUFFICIENT_CREDITS") {
        Alert.alert(
          "More credits needed",
          "You do not have enough credits to complete this analysis.",
          [
            {
              text: "View options",
              onPress: () => router.replace("/paywall"),
            },
          ],
        );

        return;
      }

      Alert.alert(
        uploadResult ? "Analysis failed" : "Upload failed",
        uploadResult
          ? `${
              error?.message ?? "AI analysis failed."
            } Your attempt was still uploaded and saved.`
          : error?.message ?? "Could not upload climbing attempt.",
        uploadResult
          ? [
              {
                text: "View session",
                onPress: () =>
                  router.replace(`/session/${uploadResult.sessionId}`),
              },
            ]
          : undefined,
      );
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    if (!cameraRef.current || recording) {
      return;
    }

    setRecording(true);

    try {
      const result = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });

      if (result?.uri) {
        setSelectedVideo({
          uri: result.uri,
          type: "video",
          fileName: "climbing-attempt.mp4",
          mimeType: "video/mp4",
        });
      }
    } catch (error) {
      Alert.alert(
        "Recording failed",
        error?.message ?? "Could not record video.",
      );
    } finally {
      setRecording(false);
      setCameraOpen(false);
    }
  }

  function stopRecording() {
    cameraRef.current?.stopRecording();
  }

  if (cameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          mode="video"
          mute
        />

        <SafeAreaView style={styles.cameraOverlay} edges={["bottom"]}>
          {recording ? (
            <View style={styles.recordingBadge}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingBadgeText}>RECORDING</Text>
            </View>
          ) : null}

          <View style={styles.cameraControls}>
            <Pressable
              style={({ pressed }) => [
                styles.recordButton,
                recording && styles.recordButtonActive,
                pressed && styles.recordButtonPressed,
              ]}
              onPress={recording ? stopRecording : startRecording}
            >
              <Text style={styles.recordButtonText}>
                {recording ? "Stop recording" : "Start recording"}
              </Text>
            </Pressable>

            {!recording ? (
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  styles.cameraCancelButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
                onPress={() => setCameraOpen(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.backButton}
          onPress={() =>
            sessionId ? router.replace(`/session/${sessionId}`) : router.back()
          }
        >
          <Text style={styles.backButtonText}>
            {sessionId ? "‹ Session" : "‹ Back"}
          </Text>
        </Pressable>

        <Text style={styles.wordmark}>
          CLIMB<Text style={styles.wordmarkAccent}>/</Text>COACH
        </Text>

        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <Text style={styles.eyebrow}>START A SESSION</Text>
          <Text style={styles.headline}>Show your coach the problem.</Text>
          <Text style={styles.supportingCopy}>
            Add a wall or problem photo for context, then record or select an
            attempt so your coach can analyze your movement.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconWrap}>
              <Ionicons
                name="image-outline"
                size={18}
                color={colors.foreground}
              />
            </View>

            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Problem photo</Text>
              <Text style={styles.cardCostLabel}>
                Photo analysis · 1 credit
              </Text>
            </View>
          </View>

          <Text style={styles.cardDescription}>
            Gives your coach wall and route context before your attempt.
          </Text>

          {selectedPhoto?.uri ? (
            <View style={styles.previewBlock}>
              <Image
                source={{ uri: selectedPhoto.uri }}
                style={styles.previewMedia}
                resizeMode="contain"
              />

              <View style={styles.previewActionsRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    styles.previewActionButton,
                    pressed && styles.secondaryButtonPressed,
                  ]}
                  onPress={pickPhoto}
                  disabled={analyzingPhoto}
                >
                  <Text style={styles.secondaryButtonText}>Replace</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    styles.previewActionButton,
                    pressed && styles.secondaryButtonPressed,
                  ]}
                  onPress={() => setSelectedPhoto(null)}
                  disabled={analyzingPhoto}
                >
                  <Text style={styles.secondaryButtonText}>Remove</Text>
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  analyzingPhoto && styles.primaryButtonDisabled,
                ]}
                onPress={analyzePhoto}
                disabled={analyzingPhoto}
              >
                <Text style={styles.primaryButtonText}>
                  {analyzingPhoto ? "Analyzing photo..." : "Analyze wall photo"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                styles.fullWidthButton,
                pressed && styles.secondaryButtonPressed,
              ]}
              onPress={pickPhoto}
            >
              <Text style={styles.secondaryButtonText}>Choose wall photo</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconWrap}>
              <Ionicons
                name="videocam-outline"
                size={18}
                color={colors.foreground}
              />
            </View>

            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Video attempt</Text>
              <Text style={styles.cardCostLabel}>
                Video attempt · 2 credits
              </Text>
            </View>
          </View>

          <Text style={styles.cardDescription}>
            Lets your coach analyze your movement and update the coaching loop.
          </Text>

          {selectedVideo?.uri ? (
            <View style={styles.previewBlock}>
              <VideoPreview uri={selectedVideo.uri} />

              <View style={styles.previewActionsRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    styles.previewActionButton,
                    pressed && styles.secondaryButtonPressed,
                  ]}
                  onPress={pickVideo}
                  disabled={uploading}
                >
                  <Text style={styles.secondaryButtonText}>Replace</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    styles.previewActionButton,
                    pressed && styles.secondaryButtonPressed,
                  ]}
                  onPress={() => setSelectedVideo(null)}
                  disabled={uploading}
                >
                  <Text style={styles.secondaryButtonText}>Remove</Text>
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  uploading && styles.primaryButtonDisabled,
                ]}
                onPress={uploadAttempt}
                disabled={uploading}
              >
                <Text style={styles.primaryButtonText}>
                  {uploading ? "Analyzing..." : "Analyze attempt"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.videoChoiceRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  styles.videoChoiceButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
                onPress={openCamera}
              >
                <Ionicons
                  name="videocam"
                  size={16}
                  color={colors.foreground}
                  style={styles.videoChoiceIcon}
                />
                <Text style={styles.secondaryButtonText}>Record video</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  styles.videoChoiceButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
                onPress={pickVideo}
              >
                <Ionicons
                  name="albums-outline"
                  size={16}
                  color={colors.foreground}
                  style={styles.videoChoiceIcon}
                />
                <Text style={styles.secondaryButtonText}>
                  Choose from gallery
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  introSection: {
    gap: spacing.sm,
  },
  eyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.muted,
    textTransform: "uppercase",
  },
  headline: {
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
  supportingCopy: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: colors.foreground,
  },
  cardCostLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.accent,
    textTransform: "uppercase",
  },
  cardDescription: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  fullWidthButton: {
    width: "100%",
  },
  videoChoiceRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  videoChoiceButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  videoChoiceIcon: {
    marginRight: spacing.xs,
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  secondaryButtonPressed: {
    borderColor: colors.accent,
  },
  secondaryButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  previewBlock: {
    gap: spacing.sm,
  },
  previewMedia: {
    width: "100%",
    height: 220,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
  },
  previewActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  previewActionButton: {
    flex: 1,
    minHeight: 48,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
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
    fontSize: 14,
    color: colors.accentInk,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  recordingBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(14, 17, 16, 0.7)",
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.warm,
  },
  recordingBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.foreground,
  },
  cameraControls: {
    gap: spacing.sm,
  },
  recordButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  recordButtonActive: {
    backgroundColor: colors.warm,
  },
  recordButtonPressed: {
    opacity: 0.85,
  },
  recordButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.accentInk,
  },
  cameraCancelButton: {
    backgroundColor: "rgba(14, 17, 16, 0.7)",
  },
});
