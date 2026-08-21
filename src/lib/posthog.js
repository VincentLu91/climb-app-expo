import { PostHog } from "posthog-react-native";

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

if (!apiKey) {
  throw new Error("Missing PostHog project token.");
}

if (!host) {
  throw new Error("Missing PostHog host.");
}

export const posthog = new PostHog(apiKey, {
  host,
  enableSessionReplay: true,
});

export function identifyPostHogUser(user) {
  if (!user?.id) {
    return;
  }

  posthog.identify(user.id, {
    email: user.email ?? null,
    platform: "mobile",
  });
}

export function resetPostHogUser() {
  posthog.reset();
}

export function capturePostHogEvent(event, properties = {}) {
  if (!event) {
    return;
  }

  posthog.capture(event, {
    platform: "mobile",
    ...properties,
  });
}
