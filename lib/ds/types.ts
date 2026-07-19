import { z } from "zod";

/**
 * A project Theme is the ONLY thing that varies between projects'
 * generated output. It maps 1:1 onto the CSS variables declared in
 * public/ds/tokens.css. Stored as jsonb on the project row.
 */

const hex = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "expected hex color");

export const ThemeColorsSchema = z.object({
  background: hex,
  foreground: hex,
  card: hex,
  cardForeground: hex,
  muted: hex,
  mutedForeground: hex,
  primary: hex,
  primaryForeground: hex,
  border: hex,
  ring: hex,
  success: hex,
  warning: hex,
  destructive: hex,
});

export const ThemeSchema = z.object({
  colors: ThemeColorsSchema,
  /** Base control radius in px. Cards derive +4, small elements -4. */
  radius: z.number(),
  /** Density knob multiplying the spacing scale. */
  scale: z.number(),
  fonts: z.object({
    /** Google Fonts family name, e.g. "Inter" or "Source Serif 4". */
    display: z.string().min(1),
    body: z.string().min(1),
  }),
});

export type ThemeColors = z.infer<typeof ThemeColorsSchema>;
export type Theme = z.infer<typeof ThemeSchema>;

export const RADIUS_MIN = 0;
export const RADIUS_MAX = 20;
export const SCALE_MIN = 0.85;
export const SCALE_MAX = 1.15;

/** Neutral default — also the fallback when a proposed theme is unusable. */
export const DEFAULT_THEME: Theme = {
  colors: {
    background: "#ffffff",
    foreground: "#18181b",
    card: "#ffffff",
    cardForeground: "#18181b",
    muted: "#f4f4f5",
    mutedForeground: "#6d6d76",
    primary: "#18181b",
    primaryForeground: "#fafafa",
    border: "#e4e4e7",
    ring: "#a1a1aa",
    success: "#16a34a",
    warning: "#d97706",
    destructive: "#dc2626",
  },
  radius: 8,
  scale: 1,
  fonts: { display: "Inter", body: "Inter" },
};
