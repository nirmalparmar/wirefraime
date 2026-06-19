/**
 * Skill selection — the routing step that runs BEFORE the design system is built.
 *
 * Mirrors the Claude agent flow: a cheap planner sees only each candidate
 * skill's `name` + `description` (a manifest, never the full bodies), picks the
 * single best-fit skill for the app brief, and the downstream agents then load
 * ONLY that skill's full instructions.
 *
 * Selection never blocks generation — any failure (bad JSON, empty response,
 * "none") degrades to DEFAULT_SKILL_SLUG, which preserves the previous behaviour
 * (saas-landing-page was always injected into the planner).
 */
import fs from "fs";
import path from "path";
import { InMemoryRunner, LlmAgent } from "@google/adk";
import type { Content } from "@google/genai";
import { z } from "zod";
// Importing from adk-helpers also runs its module side-effect that mirrors
// GOOGLE_API_KEY → GEMINI_API_KEY, so the ADK runner authenticates.
import { loadSkillFromDir } from "./adk-helpers";
import { tryParseJsonLoose } from "./html-utils";

/** gemini pro: flash-lite returns malformed JSON for structured routing. */
const SELECTION_MODEL = "gemini-3.1-pro-preview";

/** Curated pool the selector may choose from. Add a skill by adding its dir. */
const ELIGIBLE: { slug: string; dir: string }[] = [
  { slug: "landing-page-builder", dir: ".agents/skills/landing-page-builder" },
  { slug: "frontend-design", dir: ".agents/skills/frontend-design" },
];

/** Floor when the model abstains or selection fails. */
export const DEFAULT_SKILL_SLUG = "saas-landing-page";

export interface SkillMeta {
  slug: string;
  name: string;
  description: string;
  dir: string;
}

export interface SelectedSkill extends SkillMeta {
  /** One-line rationale from the router (or why we fell back). */
  reasoning: string;
}

// ── Frontmatter (name + description only — cheap, no bodies) ─────────

/** Pull a scalar out of YAML frontmatter, tolerant of folded/literal blocks. */
function readFrontmatterField(fm: string, key: string): string {
  const lines = fm.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(new RegExp(`^${key}:[ \\t]*(.*)$`));
    if (!m) continue;
    const inline = m[1].trim();
    // Block scalar (>, >-, |, |-) or empty → gather the indented lines below it.
    if (inline === "" || /^[>|]-?$/.test(inline)) {
      const folded = inline === "" || inline.startsWith(">");
      const body: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        // A non-indented `key:` line ends the block.
        if (/^\S/.test(lines[j]) && /:/.test(lines[j])) break;
        body.push(lines[j].trim());
      }
      return body.join(folded ? " " : "\n").replace(/\s+/g, " ").trim();
    }
    return inline.replace(/^["']|["']$/g, "");
  }
  return "";
}

function loadSkillMeta(slug: string, dir: string): SkillMeta | null {
  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), dir, "SKILL.md"), "utf8");
    const fm = raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    return {
      slug,
      name: readFrontmatterField(fm, "name") || slug,
      description: readFrontmatterField(fm, "description"),
      dir,
    };
  } catch {
    return null;
  }
}

let _manifest: SkillMeta[] | null = null;
/** Eligible skills as { slug, name, description } — never reads skill bodies. */
export function getSkillManifest(): SkillMeta[] {
  if (_manifest && process.env.NODE_ENV !== "development") return _manifest;
  _manifest = ELIGIBLE.map((s) => loadSkillMeta(s.slug, s.dir)).filter(
    (m): m is SkillMeta => m !== null
  );
  return _manifest;
}

function findMeta(slug: string): SkillMeta | undefined {
  return getSkillManifest().find((m) => m.slug === slug);
}

function defaultSelection(reasoning: string): SelectedSkill {
  const meta = findMeta(DEFAULT_SKILL_SLUG) ?? {
    slug: DEFAULT_SKILL_SLUG,
    name: DEFAULT_SKILL_SLUG,
    description: "",
    dir: `.agents/skills/${DEFAULT_SKILL_SLUG}`,
  };
  return { ...meta, reasoning };
}

// ── Full-body loader (used by the planner + screen generators) ──────

const _bodyCache = new Map<string, string>();
/**
 * Full instructions (body + auto-loaded references) for a selected skill.
 * Cached by slug. Returns "" for an unknown slug — callers degrade gracefully.
 */
export async function loadSelectedSkillBody(slug: string | null): Promise<string> {
  if (!slug) return "";
  const cached = _bodyCache.get(slug);
  if (cached !== undefined && process.env.NODE_ENV !== "development") return cached;
  const meta = findMeta(slug);
  if (!meta) return "";
  try {
    const skill = await loadSkillFromDir(path.resolve(process.cwd(), meta.dir));
    _bodyCache.set(slug, skill.instructions);
    return skill.instructions;
  } catch {
    return "";
  }
}

// ── The selection agent ─────────────────────────────────────────────

const SkillChoiceSchema = z.object({
  skill: z
    .string()
    .describe("The exact slug of the best-fit skill from the candidate list, or 'none' if no candidate clearly fits."),
  reasoning: z.string().describe("One short sentence explaining the choice."),
});

let _selectorAgent: LlmAgent | null = null;
function getSelectorAgent(): LlmAgent {
  if (_selectorAgent) return _selectorAgent;
  const instruction = `You are a design-skill router. You are given an app brief and a list of candidate design skills, each with a slug and a description of when to use it.

Pick the SINGLE skill whose description best matches what the user wants to build. Weigh the artifact type (landing/marketing page vs. app/dashboard UI), the aesthetic, and the explicit "use this when..." guidance in each description. If a reference image is attached, factor in its visual style.

Return JSON with two fields: "skill" (the exact slug you chose, or the literal string none if nothing clearly fits) and "reasoning" (one short sentence). Choose only from the provided slugs.`;
  _selectorAgent = new LlmAgent({
    name: "skill_selector_agent",
    model: SELECTION_MODEL,
    instruction,
    outputSchema: SkillChoiceSchema,
    generateContentConfig: { maxOutputTokens: 4096, temperature: 0.2 },
  });
  return _selectorAgent;
}

/**
 * Choose the best-fit skill for an app brief. Runs first, before the design
 * system is built. Always resolves to a real skill — falls back to
 * DEFAULT_SKILL_SLUG on abstention or any error.
 */
export async function selectDesignSkill(
  appName: string,
  appDescription: string,
  image?: { data: string; mimeType: string }
): Promise<SelectedSkill> {
  const manifest = getSkillManifest();
  if (manifest.length === 0) return defaultSelection("no eligible skills found");
  if (manifest.length === 1) return { ...manifest[0], reasoning: "only candidate" };

  const candidates = manifest
    .map((m) => `- slug: ${m.slug}\n  description: ${m.description}`)
    .join("\n");
  const userPrompt = `App: ${appName} — ${appDescription}

Candidate skills:
${candidates}

Choose the best-fit slug.`;

  try {
    const parts: Content["parts"] = [{ text: userPrompt }];
    if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });

    const runner = new InMemoryRunner({ agent: getSelectorAgent(), appName: "wirefraime" });
    let text = "";
    for await (const event of runner.runEphemeral({
      userId: "system",
      newMessage: { role: "user", parts },
    })) {
      for (const part of event.content?.parts ?? []) {
        if (typeof part.text === "string") text += part.text;
      }
    }

    const json = tryParseJsonLoose(text);
    const parsed = SkillChoiceSchema.safeParse(json);
    if (!parsed.success) return defaultSelection("selector returned invalid output");

    const chosen = parsed.data.skill.trim();
    const meta = findMeta(chosen);
    if (!meta) return defaultSelection(`'${chosen}' is not an eligible skill`);
    return { ...meta, reasoning: parsed.data.reasoning };
  } catch (err) {
    console.warn(
      "[SkillSelector] selection failed — using default:",
      err instanceof Error ? err.message : err
    );
    return defaultSelection("selection failed");
  }
}
