import { apiFetch } from "./api";
import { supabase } from "./supabase";

async function saveChatMessage({ userId, sessionId, message, sender }) {
  const { data, error } = await supabase
    .from("chat_history")
    .insert({
      user_id: userId,
      coaching_session_id: sessionId,
      message,
      sender,
    })
    .select("id, message, sender, upload_id, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function sendSessionChatMessage({ userId, sessionId, message }) {
  const text = message.trim();

  if (!userId) {
    throw new Error("You must be logged in.");
  }

  if (!sessionId) {
    throw new Error("Missing coaching session.");
  }

  if (!text) {
    throw new Error("Enter a message first.");
  }

  const userMessage = await saveChatMessage({
    userId,
    sessionId,
    message: text,
    sender: "User",
  });

  const response = await apiFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      sessionId,
      message: text,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || "Chat request failed.");
    error.code = data.code;
    throw error;
  }

  const coachText = data.reply ?? "(No response from coach)";

  const coachMessage = await saveChatMessage({
    userId,
    sessionId,
    message: coachText,
    sender: "ChatGPT",
  });

  return {
    userMessage,
    coachMessage,
  };
}
