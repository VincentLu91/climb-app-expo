import { apiFetch } from "./api";
import { supabase } from "./supabase";

export async function getSessions(userId) {
  const { data, error } = await supabase
    .from("coaching_sessions")
    .select("id, started_at, ended_at, session_summary, next_session_focus")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getSessionDetail(userId, sessionId) {
  const { data: session, error: sessionError } = await supabase
    .from("coaching_sessions")
    .select("id, started_at, ended_at, session_summary, next_session_focus")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    throw new Error("Session not found.");
  }

  const { data: latestUpload, error: uploadError } = await supabase
    .from("uploads")
    .select("id, media_path, attempt_number")
    .eq("coaching_session_id", sessionId)
    .eq("media_type", "video")
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (uploadError) {
    throw uploadError;
  }

  let latestAnalysis = null;

  if (latestUpload?.id) {
    const { data, error } = await supabase
      .from("analyses")
      .select("result, status")
      .eq("upload_id", latestUpload.id)
      .eq("status", "completed")
      .maybeSingle();

    if (error) {
      throw error;
    }

    latestAnalysis = data;
  }

  const { data: progressState, error: progressError } = await supabase
    .from("climber_progress_state")
    .select(
      "active_limiter, progress_note, current_experiment, next_attempt_test",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (progressError) {
    throw progressError;
  }

  const { data: messages, error: chatError } = await supabase
    .from("chat_history")
    .select("id, message, sender, upload_id, created_at")
    .eq("user_id", userId)
    .eq("coaching_session_id", sessionId)
    .order("created_at", { ascending: true });

  if (chatError) {
    throw chatError;
  }

  return {
    session,
    latestUpload,
    latestAnalysis,
    progressState,
    messages: messages ?? [],
  };
}

export async function finishSession(sessionId) {
  if (!sessionId) {
    throw new Error("Missing coaching session.");
  }

  const response = await apiFetch("/api/finish-session", {
    method: "POST",
    body: JSON.stringify({
      sessionId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error ?? "Could not finish coaching session.");

    error.code = data.code;
    throw error;
  }

  return data;
}
