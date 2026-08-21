import { capturePostHogEvent } from "./posthog";
import { supabase } from "./supabase";

function safeFileName(name) {
  return (name || "climbing-attempt.mp4").replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function uploadClimbingAttempt({
  userId,
  video,
  sessionId = null,
  messageText = "",
}) {
  if (!userId) {
    throw new Error("You must be logged in.");
  }

  if (!video?.uri) {
    throw new Error("Choose a video first.");
  }

  let activeSessionId = sessionId;
  let attemptNumber = 1;
  let previousAnalysisText = null;
  let createdNewSession = false;

  if (activeSessionId) {
    const { data: session, error: sessionError } = await supabase
      .from("coaching_sessions")
      .select("id")
      .eq("id", activeSessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (sessionError) {
      throw sessionError;
    }

    if (!session) {
      throw new Error("Climbing session not found.");
    }

    const { data: previousUpload, error: previousUploadError } = await supabase
      .from("uploads")
      .select("id, attempt_number")
      .eq("coaching_session_id", activeSessionId)
      .eq("user_id", userId)
      .eq("media_type", "video")
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousUploadError) {
      throw previousUploadError;
    }

    if (previousUpload) {
      attemptNumber = (previousUpload.attempt_number ?? 0) + 1;

      const { data: previousAnalysis, error: previousAnalysisError } =
        await supabase
          .from("analyses")
          .select("result")
          .eq("upload_id", previousUpload.id)
          .eq("status", "completed")
          .maybeSingle();

      if (previousAnalysisError) {
        throw previousAnalysisError;
      }

      previousAnalysisText = previousAnalysis?.result ?? null;
    }
  }

  const fileName = safeFileName(video.fileName);
  const filePath = `${userId}/${Date.now()}-${fileName}`;

  const response = await fetch(video.uri);
  const fileBuffer = await response.arrayBuffer();

  const { error: storageError } = await supabase.storage
    .from("climbing-media")
    .upload(filePath, fileBuffer, {
      contentType: video.mimeType || "video/mp4",
      upsert: false,
    });

  if (storageError) {
    throw storageError;
  }

  if (!activeSessionId) {
    const { data: session, error: sessionError } = await supabase
      .from("coaching_sessions")
      .insert({
        user_id: userId,
      })
      .select("id")
      .single();

    if (sessionError) {
      throw sessionError;
    }

    activeSessionId = session.id;
    createdNewSession = true;
  }

  const { data: upload, error: uploadError } = await supabase
    .from("uploads")
    .insert({
      user_id: userId,
      media_path: filePath,
      media_type: "video",
      coaching_session_id: activeSessionId,
      attempt_number: attemptNumber,
    })
    .select("id")
    .single();

  if (uploadError) {
    throw uploadError;
  }

  const { data: analysis, error: analysisError } = await supabase
    .from("analyses")
    .insert({
      upload_id: upload.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (analysisError) {
    throw analysisError;
  }

  const { error: chatError } = await supabase.from("chat_history").insert({
    user_id: userId,
    coaching_session_id: activeSessionId,
    upload_id: upload.id,
    message: messageText.trim() || `Attempt ${attemptNumber}`,
    sender: "User",
  });

  if (chatError) {
    throw chatError;
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("climbing-media")
    .createSignedUrl(filePath, 3600);

  if (signedUrlError) {
    throw signedUrlError;
  }

  if (createdNewSession) {
    capturePostHogEvent("climbing_session_started", {
      session_id: activeSessionId,
    });
  }

  return {
    sessionId: activeSessionId,
    uploadId: upload.id,
    analysisId: analysis.id,
    attemptNumber,
    previousAnalysisText,
    filePath,
    signedUrl: signedUrlData.signedUrl,
  };
}

export async function uploadClimbingPhoto({
  userId,
  photo,
  sessionId = null,
  messageText = "",
}) {
  if (!userId) {
    throw new Error("You must be logged in.");
  }

  if (!photo?.uri) {
    throw new Error("Choose a photo first.");
  }

  const fileName = safeFileName(photo.fileName || "climbing-wall.jpg");
  const filePath = `${userId}/${Date.now()}-${fileName}`;

  const response = await fetch(photo.uri);
  const fileBuffer = await response.arrayBuffer();

  const { error: storageError } = await supabase.storage
    .from("climbing-media")
    .upload(filePath, fileBuffer, {
      contentType: photo.mimeType || "image/jpeg",
      upsert: false,
    });

  if (storageError) {
    throw storageError;
  }

  const { data: upload, error: uploadError } = await supabase
    .from("uploads")
    .insert({
      user_id: userId,
      media_path: filePath,
      media_type: "image",
      coaching_session_id: sessionId,
    })
    .select("id")
    .single();

  if (uploadError) {
    throw uploadError;
  }

  const { data: analysis, error: analysisError } = await supabase
    .from("analyses")
    .insert({
      upload_id: upload.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (analysisError) {
    throw analysisError;
  }

  if (sessionId) {
    const { error: chatError } = await supabase.from("chat_history").insert({
      user_id: userId,
      coaching_session_id: sessionId,
      upload_id: upload.id,
      message: messageText.trim() || "Wall/problem photo",
      sender: "User",
    });

    if (chatError) {
      throw chatError;
    }
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("climbing-media")
    .createSignedUrl(filePath, 3600);

  if (signedUrlError) {
    throw signedUrlError;
  }

  return {
    uploadId: upload.id,
    analysisId: analysis.id,
    filePath,
    signedUrl: signedUrlData.signedUrl,
  };
}
