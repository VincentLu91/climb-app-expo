// Shared design tokens for the CLIMB/COACH visual language.
// Source of truth: climb-app-next `app/globals.css` (:root custom properties).
//
// This module only exports plain JS constants. It intentionally does not
// import or reference any business logic (Supabase, RevenueCat, credits,
// coaching, sessions, etc). Screens can opt into these tokens incrementally.

export const colors = {
  background: "#0e1110",
  foreground: "#f3f4ee",
  muted: "#9da49d",
  panel: "#171c19",
  panelSoft: "#202621",
  line: "#313a32",
  accent: "#d4f36b",
  accentInk: "#17200e",
  warm: "#f0a36b",
};

// Font family names as registered with `useFonts` in src/app/_layout.jsx.
export const fonts = {
  sans: "Geist_400Regular",
  sansMedium: "Geist_500Medium",
  sansSemiBold: "Geist_600SemiBold",
  sansBold: "Geist_700Bold",
  mono: "GeistMono_400Regular",
  monoMedium: "GeistMono_500Medium",
  monoBold: "GeistMono_700Bold",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
};
