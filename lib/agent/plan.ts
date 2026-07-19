import { z } from "zod";
import { clampTheme, DEFAULT_THEME, Theme } from "@/lib/ds";
import { LlmClient } from "@/lib/llm";
import { buildPlanPrompt, ScreenSpec } from "./prompts";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** What we ask MODEL_FAST for — a deliberately small theme surface;
 * the rest of the token set is derived then clamped. */
const PlanResponseSchema = z.object({
  appName: z.string().min(1).max(40),
  theme: z.object({
    background: hex,
    card: hex,
    muted: hex,
    border: hex,
    primary: hex,
    radius: z.number(),
    displayFont: z.string(),
    bodyFont: z.string(),
  }),
  screens: z
    .array(
      z.object({
        name: z.string().min(1).max(30),
        purpose: z.string().min(1).max(200),
      }),
    )
    .min(1),
});

export type PlanResponse = z.infer<typeof PlanResponseSchema>;

export interface GenerationPlan {
  appName: string;
  theme: Theme;
  screens: ScreenSpec[];
}

function toTheme(t: PlanResponse["theme"]): Theme {
  return clampTheme({
    colors: {
      ...DEFAULT_THEME.colors,
      background: t.background,
      card: t.card,
      muted: t.muted,
      border: t.border,
      primary: t.primary,
      // Derived pairs — clampTheme repairs them to AA against the
      // surfaces the model chose.
      foreground: DEFAULT_THEME.colors.foreground,
      cardForeground: DEFAULT_THEME.colors.foreground,
      mutedForeground: DEFAULT_THEME.colors.mutedForeground,
      primaryForeground: "#ffffff",
      ring: t.primary,
    },
    radius: t.radius,
    scale: 1,
    fonts: { display: t.displayFont, body: t.bodyFont },
  });
}

/** Deterministic fallback — generation must always proceed (plan §2). */
export function fallbackPlan(userPrompt: string): GenerationPlan {
  const words = userPrompt
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  const appName = words.length > 0 ? words.join(" ") : "New App";
  const subject = userPrompt.trim() || "the product";
  return {
    appName,
    theme: DEFAULT_THEME,
    screens: [
      { name: "Overview", purpose: `Main dashboard summarizing key activity for ${subject}.` },
      { name: "Browse", purpose: `List of the primary records in ${subject}, with search and filters.` },
      { name: "Settings", purpose: `Account and workspace settings for ${subject}.` },
    ],
  };
}

export async function generatePlan(
  userPrompt: string,
  llm: LlmClient,
): Promise<{ plan: GenerationPlan; source: "model" | "fallback" }> {
  const prompt = buildPlanPrompt(userPrompt);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await llm.generateJson({
        role: "fast",
        schema: PlanResponseSchema,
        prompt,
      });
      return {
        source: "model",
        plan: {
          appName: raw.appName.trim(),
          theme: toTheme(raw.theme),
          screens: raw.screens.slice(0, 6).map((s) => ({
            name: s.name.trim(),
            purpose: s.purpose.trim(),
          })),
        },
      };
    } catch (err) {
      console.warn(`[agent] plan attempt ${attempt + 1} failed:`, err);
    }
  }
  return { plan: fallbackPlan(userPrompt), source: "fallback" };
}
