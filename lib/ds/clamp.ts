import {
  DEFAULT_THEME,
  RADIUS_MAX,
  RADIUS_MIN,
  SCALE_MAX,
  SCALE_MIN,
  Theme,
  ThemeSchema,
} from "./types";
import { ensureContrast, parseHex } from "./color";

const AA_TEXT = 4.5;
/** Muted/secondary text still has to be readable, but 4.5 kills most
 * palettes' "muted" feel; WCAG large-text AA (3:1) is the floor there
 * would be too lax for 13px text, so muted pairs are held to 4.5 too —
 * matching shadcn's own zinc pairing (~4.75 on white). */
const AA_MUTED = 4.5;

function num(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function hexOr(value: string, fallback: string): string {
  return parseHex(value) ? value.trim().toLowerCase() : fallback;
}

/**
 * Take ANY proposed theme (model output, user edit) and return a valid,
 * accessible one. Never throws, never rejects — every field is clamped
 * to the nearest legal value, and text/surface pairs are adjusted to
 * WCAG AA. Idempotent: clampTheme(clampTheme(t)) === clampTheme(t).
 */
export function clampTheme(input: unknown): Theme {
  const parsed = ThemeSchema.safeParse(input);
  const raw: Theme = parsed.success
    ? parsed.data
    : mergeLoose(input, DEFAULT_THEME);

  const d = DEFAULT_THEME.colors;
  const c = {
    background: hexOr(raw.colors.background, d.background),
    foreground: hexOr(raw.colors.foreground, d.foreground),
    card: hexOr(raw.colors.card, d.card),
    cardForeground: hexOr(raw.colors.cardForeground, d.cardForeground),
    muted: hexOr(raw.colors.muted, d.muted),
    mutedForeground: hexOr(raw.colors.mutedForeground, d.mutedForeground),
    primary: hexOr(raw.colors.primary, d.primary),
    primaryForeground: hexOr(raw.colors.primaryForeground, d.primaryForeground),
    border: hexOr(raw.colors.border, d.border),
    ring: hexOr(raw.colors.ring, d.ring),
    success: hexOr(raw.colors.success, d.success),
    warning: hexOr(raw.colors.warning, d.warning),
    destructive: hexOr(raw.colors.destructive, d.destructive),
  };

  // AA text pairs — foreground colors move, surfaces stay.
  c.foreground = ensureContrast(c.foreground, c.background, AA_TEXT);
  c.cardForeground = ensureContrast(c.cardForeground, c.card, AA_TEXT);
  c.primaryForeground = ensureContrast(c.primaryForeground, c.primary, AA_TEXT);
  // Muted text sits on background, card AND muted surfaces; hold it to the
  // strictest of the three.
  c.mutedForeground = ensureContrast(c.mutedForeground, c.background, AA_MUTED);
  c.mutedForeground = ensureContrast(c.mutedForeground, c.card, AA_MUTED);
  c.mutedForeground = ensureContrast(c.mutedForeground, c.muted, AA_MUTED);

  return {
    colors: c,
    radius: Math.round(num(raw.radius, RADIUS_MIN, RADIUS_MAX, DEFAULT_THEME.radius)),
    scale: round2(num(raw.scale, SCALE_MIN, SCALE_MAX, DEFAULT_THEME.scale)),
    fonts: {
      display: fontOr(raw.fonts?.display, DEFAULT_THEME.fonts.display),
      body: fontOr(raw.fonts?.body, DEFAULT_THEME.fonts.body),
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fontOr(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/["'<>;{}\\]/g, "").trim();
  return cleaned.length > 0 && cleaned.length <= 60 ? cleaned : fallback;
}

/** Salvage whatever fields exist on a non-conforming input. */
function mergeLoose(input: unknown, base: Theme): Theme {
  const o = (input ?? {}) as Record<string, unknown>;
  const colors = (o.colors ?? {}) as Record<string, unknown>;
  const fonts = (o.fonts ?? {}) as Record<string, unknown>;
  const pickHex = (k: keyof Theme["colors"]) =>
    typeof colors[k] === "string" ? (colors[k] as string) : base.colors[k];
  return {
    colors: {
      background: pickHex("background"),
      foreground: pickHex("foreground"),
      card: pickHex("card"),
      cardForeground: pickHex("cardForeground"),
      muted: pickHex("muted"),
      mutedForeground: pickHex("mutedForeground"),
      primary: pickHex("primary"),
      primaryForeground: pickHex("primaryForeground"),
      border: pickHex("border"),
      ring: pickHex("ring"),
      success: pickHex("success"),
      warning: pickHex("warning"),
      destructive: pickHex("destructive"),
    },
    radius: typeof o.radius === "number" ? o.radius : base.radius,
    scale: typeof o.scale === "number" ? o.scale : base.scale,
    fonts: {
      display: typeof fonts.display === "string" ? fonts.display : base.fonts.display,
      body: typeof fonts.body === "string" ? fonts.body : base.fonts.body,
    },
  };
}
