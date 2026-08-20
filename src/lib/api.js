import { supabase } from "./supabase";

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

if (!apiUrl) {
  throw new Error("Missing EXPO_PUBLIC_API_URL.");
}

export async function apiFetch(path, options = {}) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.access_token) {
    throw new Error("You must be logged in.");
  }

  return fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
      Authorization: `Bearer ${session.access_token}`,
    },
  });
}
