/**
 * Prompt composer — the single source of truth for generation system prompts.
 *
 * Assembles the three axes for a given artifact shape:
 *   <artifact-type skill body>   (Shape — skills/<type>/SKILL.md)
 *   <tailwind token + component guide>  (passed in by the caller — wirefraime's
 *                                        token contract lives in design-agent)
 *   <craft references>            (universal rules — craftForArtifact(type))
 *
 * The Brand axis (the active design system's DESIGN.md) is injected separately,
 * per-screen, into the user prompt (see design-systems.ts brandContext), because
 * it varies per request while these system instructions are stable per type.
 *
 * The tailwind guide is passed in (not imported) to avoid an import cycle with
 * design-agent, which owns that constant.
 */
import type { ArtifactType } from "./types";
import { loadCraftSections, craftForArtifact } from "./craft";
import { loadArtifactSkill } from "../agents/skills";

const cache = new Map<ArtifactType, string>();

export function composeSystemPrompt(type: ArtifactType, tailwindGuide: string): string {
  if (cache.has(type) && process.env.NODE_ENV !== "development") {
    return cache.get(type)!;
  }
  const skill = loadArtifactSkill(type);
  const craft = loadCraftSections(craftForArtifact(type));
  const out = [skill, tailwindGuide, craft].filter(Boolean).join("\n\n");
  cache.set(type, out);
  return out;
}
