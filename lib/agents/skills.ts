/**
 * Artifact-shape skills loader (the "Shape" axis).
 *
 * Reads `skills/<artifactType>/SKILL.md` and returns the body (markdown after
 * the YAML frontmatter). The frontmatter `od.craft.requires` documents which
 * craft sections the shape needs; the composer pulls the actual craft set from
 * `craftForArtifact()` so there's a single code source of truth.
 */
import fs from "fs";
import path from "path";
import type { ArtifactType } from "../design/types";

const SKILLS_DIR = path.resolve(process.cwd(), "skills");
const cache = new Map<ArtifactType, string>();

/** Body of skills/<type>/SKILL.md (frontmatter stripped). "" if missing. */
export function loadArtifactSkill(type: ArtifactType): string {
  if (cache.has(type) && process.env.NODE_ENV !== "development") {
    return cache.get(type) ?? "";
  }
  try {
    const raw = fs.readFileSync(path.join(SKILLS_DIR, type, "SKILL.md"), "utf8");
    const m = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
    const body = (m ? m[1] : raw).trim();
    cache.set(type, body);
    return body;
  } catch {
    return "";
  }
}
