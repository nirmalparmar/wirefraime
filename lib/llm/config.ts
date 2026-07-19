/**
 * The ONLY place model IDs live (plan §2). Slugs containing "/" route to
 * OpenRouter, everything else to Google. Override per-environment with
 * DESIGNER_MODEL / FAST_MODEL.
 */
export const MODEL_DESIGNER =
  process.env.DESIGNER_MODEL || "gemini-3.1-pro-preview";

export const MODEL_FAST = process.env.FAST_MODEL || "gemini-flash-latest";

export type ModelRole = "designer" | "fast";

export function modelIdFor(role: ModelRole): string {
  return role === "designer" ? MODEL_DESIGNER : MODEL_FAST;
}
