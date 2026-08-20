import { supabase } from "./supabase";

function safeFileName(name) {
  return (name || "climbing-attempt.mp4").replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function uploadNewClimbingAttempt({ userId, video }) {
  if (!userId) {
    throw new Error("You must be logged in.");
  }

  if (!video?.uri) {
    throw new Error("Choose a video first.");
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

  const { data: upload, error: uploadError } = await supabase
    .from("uploads")
    .insert({
      user_id: userId,
      media_path: filePath,
      media_type: "video",
      coaching_session_id: session.id,
      attempt_number: 1,
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
    coaching_session_id: session.id,
    upload_id: upload.id,
    message: "Attempt 1",
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

  return {
    sessionId: session.id,
    uploadId: upload.id,
    analysisId: analysis.id,
    filePath,
    signedUrl: signedUrlData.signedUrl,
  };
}
