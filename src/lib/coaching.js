import { apiFetch } from "./api";
import { supabase } from "./supabase";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getPreviousSessionFocus(userId) {
  const { data, error } = await supabase
    .from("coaching_sessions")
    .select("next_session_focus")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .not("next_session_focus", "is", null)
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.next_session_focus ?? null;
}

export async function analyzeClimbingAttempt({
  userId,
  sessionId,
  analysisId,
  signedUrl,
  attemptNumber,
  previousAnalysisText = null,
}) {
  const previousSessionFocus =
    attemptNumber === 1 ? await getPreviousSessionFocus(userId) : null;

  const analyzeResponse = await apiFetch("/api/analyze", {
    method: "POST",
    body: JSON.stringify({
      videoUrl: signedUrl,
      attemptNumber,
      previousAnalysisText,
      previousSessionFocus,
    }),
  });

  const analyzeData = await analyzeResponse.json();

  if (!analyzeResponse.ok) {
    const error = new Error(
      analyzeData.error ?? "Could not submit AI analysis.",
    );

    error.code = analyzeData.code;
    throw error;
  }

  if (!analyzeData.request_id) {
    throw new Error("AI analysis did not return a request ID.");
  }

  let analysisText = null;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const statusResponse = await apiFetch(
      `/api/analyze?requestId=${encodeURIComponent(analyzeData.request_id)}`,
    );

    const statusData = await statusResponse.json();

    if (!statusResponse.ok) {
      throw new Error(statusData.error ?? "Could not check AI analysis.");
    }

    if (statusData.status === "COMPLETED") {
      analysisText = statusData.result?.output ?? null;
      break;
    }

    if (statusData.status === "FAILED") {
      throw new Error("AI analysis failed.");
    }

    await sleep(2000);
  }

  if (!analysisText) {
    throw new Error("AI analysis is still processing.");
  }

  const { error: saveAnalysisError } = await supabase
    .from("analyses")
    .update({
      status: "completed",
      result: analysisText,
      model_provider: "fal.ai",
      model_name: "fal-ai/video-understanding",
      completed_at: new Date().toISOString(),
    })
    .eq("id", analysisId);

  if (saveAnalysisError) {
    throw saveAnalysisError;
  }

  const { error: coachMessageError } = await supabase
    .from("chat_history")
    .insert({
      user_id: userId,
      coaching_session_id: sessionId,
      message: analysisText,
      sender: "ChatGPT",
    });

  if (coachMessageError) {
    throw coachMessageError;
  }

  const progressResponse = await apiFetch("/api/update-progress", {
    method: "POST",
    body: JSON.stringify({
      analysisText,
    }),
  });

  const progressData = await progressResponse.json();

  if (!progressResponse.ok) {
    console.error("Progress update failed:", progressData);
  }

  return {
    analysisText,
    progressUpdated: progressResponse.ok,
  };
}

export async function analyzeClimbingPhoto({
  userId,
  sessionId,
  analysisId,
  imageUrl,
  prompt = null,
}) {
  const response = await apiFetch("/api/analyze-image", {
    method: "POST",
    body: JSON.stringify({
      imageUrl,
      prompt,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error ?? "Could not analyze climbing photo.");

    error.code = data.code;
    throw error;
  }

  const analysisText = data.output;

  if (!analysisText) {
    throw new Error("Image analysis returned no coaching feedback.");
  }

  const { error: saveAnalysisError } = await supabase
    .from("analyses")
    .update({
      status: "completed",
      result: analysisText,
      model_provider: "fal.ai",
      model_name: "google/gemini-2.5-flash",
      completed_at: new Date().toISOString(),
    })
    .eq("id", analysisId);

  if (saveAnalysisError) {
    throw saveAnalysisError;
  }

  if (sessionId) {
    const { error: coachMessageError } = await supabase
      .from("chat_history")
      .insert({
        user_id: userId,
        coaching_session_id: sessionId,
        message: analysisText,
        sender: "ChatGPT",
      });

    if (coachMessageError) {
      throw coachMessageError;
    }
  }

  return {
    analysisText,
  };
}
