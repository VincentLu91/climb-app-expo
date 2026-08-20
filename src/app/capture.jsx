import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { router } from "expo-router";

import { useAuth } from "../context/AuthContext";
import { analyzeFirstAttempt } from "../lib/coaching";
import { uploadNewClimbingAttempt } from "../lib/media";

function VideoPreview({ uri }) {
  const player = useVideoPlayer({ uri });

  return (
    <View style={styles.previewContainer}>
      <VideoView
        player={player}
        style={styles.preview}
        nativeControls
        contentFit="contain"
      />

      <Pressable style={styles.button} onPress={() => player.play()}>
        <Text style={styles.buttonText}>Play preview</Text>
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
  const [uploading, setUploading] = useState(false);

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
      uploadResult = await uploadNewClimbingAttempt({
        userId: user.id,
        video: selectedVideo,
      });

      const analysisResult = await analyzeFirstAttempt({
        userId: user.id,
        sessionId: uploadResult.sessionId,
        analysisId: uploadResult.analysisId,
        signedUrl: uploadResult.signedUrl,
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

        <View style={styles.cameraControls}>
          <Pressable
            style={styles.button}
            onPress={recording ? stopRecording : startRecording}
          >
            <Text style={styles.buttonText}>
              {recording ? "Stop recording" : "Start recording"}
            </Text>
          </Pressable>

          {!recording ? (
            <Pressable
              style={styles.button}
              onPress={() => setCameraOpen(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Climbing Attempt</Text>

      <Pressable style={styles.button} onPress={openCamera}>
        <Text style={styles.buttonText}>Record video</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={pickVideo}>
        <Text style={styles.buttonText}>Choose from gallery</Text>
      </Pressable>

      {selectedVideo?.uri ? (
        <>
          <Text>Video ready</Text>

          <VideoPreview uri={selectedVideo.uri} />

          <Pressable
            style={styles.button}
            onPress={uploadAttempt}
            disabled={uploading}
          >
            <Text style={styles.buttonText}>
              {uploading ? "Analyzing..." : "Analyze attempt"}
            </Text>
          </Pressable>
        </>
      ) : (
        <Text>No video selected.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  button: {
    padding: 14,
    backgroundColor: "#111111",
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  preview: {
    width: "100%",
    height: 300,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    padding: 24,
    gap: 12,
  },
  previewContainer: {
    gap: 12,
  },
});
