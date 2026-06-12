/**
 * Craft loader.
 *
 * Reads brand-agnostic craft rulebooks from `craft/<slug>.md` and concatenates
 * the requested ones for injection into the design agent's system prompt.
 * Only requested sections are loaded, so callers pay token cost for what they
 * use. Missing files are dropped silently (forward-compatible — a new slug can
 * be referenced before its file is vendored).
 */
import fs from "fs";
import path from "path";
import type { CraftRef, ArtifactType } from "./types";

const CRAFT_DIR = path.resolve(process.cwd(), "craft");

/**
 * The craft injected into generation by default in Phase 1 (one generation
 * path serving both landing pages and app UIs). The slop-killers plus the two
 * broadest "real product" levers. Phase 3 narrows this per artifact-type skill.
 */
export const DEFAULT_CRAFT: CraftRef[] = [
  "anti-ai-slop",
  "typography",
  "color",
  "copy-honesty",
  "state-coverage",
];

/** Per-artifact craft sets, used once Phase 3 routes by artifact type. */
export function craftForArtifact(type: ArtifactType): CraftRef[] {
  if (type === "landing-page") {
    return ["anti-ai-slop", "typography", "color", "copy-honesty", "laws-of-ux"];
  }
  // app-ui
  return ["anti-ai-slop", "typography", "color", "state-coverage", "accessibility-baseline"];
}

// Cache file contents per slug. Re-read in development so edits take effect.
const cache = new Map<string, string>();

function readCraftFile(slug: CraftRef): string | null {
  if (process.env.NODE_ENV !== "development" && cache.has(slug)) {
    return cache.get(slug) ?? null;
  }
  try {
    const body = fs.readFileSync(path.join(CRAFT_DIR, `${slug}.md`), "utf8").trim();
    cache.set(slug, body);
    return body;
  } catch {
    // Forward-compatible: a referenced-but-unvendored slug just contributes
    // nothing rather than throwing.
    return null;
  }
}

/**
 * Load and join the requested craft sections into one block, deduped and
 * ordered as requested. Returns "" if none resolve.
 */
export function loadCraftSections(refs: CraftRef[] = DEFAULT_CRAFT): string {
  const seen = new Set<CraftRef>();
  const parts: string[] = [];
  for (const ref of refs) {
    if (seen.has(ref)) continue;
    seen.add(ref);
    const body = readCraftFile(ref);
    if (body) parts.push(`### ${ref}\n\n${body}`);
  }
  if (parts.length === 0) return "";
  return `=== CRAFT REFERENCES (universal rules — apply on top of the design system) ===\n\n${parts.join("\n\n---\n\n")}`;
}
