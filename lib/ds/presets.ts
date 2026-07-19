import { clampTheme } from "./clamp";
import { DEFAULT_THEME, Theme } from "./types";

/**
 * Three hand-written themes used by /dev/preview to prove the Phase A
 * acceptance gate: every example screen must look genuinely good in all
 * of them. Each is passed through clampTheme so a preset can never be
 * out of spec.
 */
export const PRESET_THEMES: Record<string, { name: string; theme: Theme }> = {
  quartz: {
    name: "Quartz (neutral)",
    theme: clampTheme(DEFAULT_THEME),
  },
  verdant: {
    name: "Verdant (warm serif)",
    theme: clampTheme({
      colors: {
        background: "#faf9f5",
        foreground: "#1f1e1a",
        card: "#ffffff",
        cardForeground: "#1f1e1a",
        muted: "#f1efe9",
        mutedForeground: "#67635a",
        primary: "#2f6b4f",
        primaryForeground: "#f6faf7",
        border: "#e6e3da",
        ring: "#9aa793",
        success: "#2f6b4f",
        warning: "#b8860b",
        destructive: "#b3402e",
      },
      radius: 12,
      scale: 1.05,
      fonts: { display: "Fraunces", body: "Inter" },
    }),
  },
  cobalt: {
    name: "Cobalt (crisp product)",
    theme: clampTheme({
      colors: {
        background: "#f8fafc",
        foreground: "#0f172a",
        card: "#ffffff",
        cardForeground: "#0f172a",
        muted: "#eef2f7",
        mutedForeground: "#5b6472",
        primary: "#3b5bdb",
        primaryForeground: "#ffffff",
        border: "#e2e8f0",
        ring: "#93a5f0",
        success: "#0f9d58",
        warning: "#c2790c",
        destructive: "#d6453d",
      },
      radius: 6,
      scale: 0.95,
      fonts: { display: "Space Grotesk", body: "Inter" },
    }),
  },
};

export type PresetThemeId = keyof typeof PRESET_THEMES;
