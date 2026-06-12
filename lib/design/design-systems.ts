/**
 * Brand design-system catalog loader.
 *
 * Reads committed packages from `design-systems/<id>/` (manifest.json +
 * design-system.json + DESIGN.md). `listBrandPackages()` powers the picker;
 * `loadBrandPackage(id)` returns the renderable DesignSystem plus a framed
 * brand-direction context string for prompt injection.
 *
 * The renderable design-system.json IS a Wirefraime DesignSystem, so brand
 * colors/fonts flow through the existing token pipeline (--color-primary →
 * bg-primary) and the live editor keeps working. DESIGN.md is direction only.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import type { DesignSystem } from "../types";
import { BrandManifestSchema, type BrandManifest } from "../../design-systems/_schema/manifest.schema";

const DIR = path.resolve(process.cwd(), "design-systems");
const dev = () => process.env.NODE_ENV === "development";

const DesignSystemSchema = z.object({
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    background: z.string(),
    surface: z.string(),
    text: z.string(),
    textMuted: z.string(),
    border: z.string(),
    success: z.string(),
    error: z.string(),
  }),
  fonts: z.object({ primary: z.string(), mono: z.string() }),
  layout: z
    .object({
      borderRadius: z.string(),
      borderRadiusLg: z.string(),
      borderRadiusSm: z.string(),
      shadow: z.string(),
      shadowLg: z.string(),
      spacingUnit: z.number(),
      cardPadding: z.string(),
      sectionGap: z.string(),
      buttonHeight: z.string(),
      inputHeight: z.string(),
      navStyle: z.enum(["sidebar", "topbar", "bottom-tabs", "none"]),
      navHeight: z.string(),
    })
    .optional(),
});

export interface BrandPackage {
  manifest: BrandManifest;
  designSystem: DesignSystem;
  /** Framed, truncated DESIGN.md for injection into the generation prompt. */
  brandContext: string;
}

let manifestCache: BrandManifest[] | null = null;
const pkgCache = new Map<string, BrandPackage | null>();

/** Public catalog metadata for the picker, sorted by category then name. */
export function listBrandPackages(): BrandManifest[] {
  if (manifestCache && !dev()) return manifestCache;
  const out: BrandManifest[] = [];
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(DIR);
  } catch {
    return [];
  }
  for (const slug of entries) {
    if (slug.startsWith("_") || slug.startsWith(".")) continue;
    const manifestPath = path.join(DIR, slug, "manifest.json");
    try {
      const parsed = BrandManifestSchema.safeParse(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
      if (parsed.success) out.push(parsed.data);
    } catch {
      // Not a valid package dir — skip.
    }
  }
  out.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  manifestCache = out;
  return out;
}

function buildBrandContext(manifest: BrandManifest, designMd: string): string {
  const MAX = 2400;
  let prose = designMd;
  if (prose.length > MAX) {
    const cut = prose.slice(0, MAX);
    // Trim back to the last paragraph break so we don't cut mid-sentence.
    const lastBreak = cut.lastIndexOf("\n\n");
    prose = (lastBreak > MAX * 0.6 ? cut.slice(0, lastBreak) : cut).trim() + "\n\n…";
  }
  return `=== BRAND DIRECTION: ${manifest.name} (${manifest.category}) ===
This screen uses the "${manifest.name}" brand. Its colors and fonts are ALREADY applied through the design-system tokens (bg-primary, bg-surface, text-foreground, text-muted, border-border, font-sans, …). Use those tokens — do NOT hardcode the hex values or font names mentioned below. Treat the notes as visual DIRECTION: mood, proportions, type feel, component shapes, spacing rhythm, and anti-patterns.

${prose}`;
}

/** Load a brand package by id, or null if it doesn't exist / is invalid. */
export function loadBrandPackage(id: string): BrandPackage | null {
  if (!id) return null;
  if (pkgCache.has(id) && !dev()) return pkgCache.get(id) ?? null;
  const base = path.join(DIR, id);
  try {
    const manifest = BrandManifestSchema.parse(
      JSON.parse(fs.readFileSync(path.join(base, "manifest.json"), "utf8"))
    );
    const designSystem = DesignSystemSchema.parse(
      JSON.parse(fs.readFileSync(path.join(base, "design-system.json"), "utf8"))
    ) as DesignSystem;
    let designMd = "";
    try {
      designMd = fs.readFileSync(path.join(base, "DESIGN.md"), "utf8").trim();
    } catch {
      /* DESIGN.md optional */
    }
    const pkg: BrandPackage = {
      manifest,
      designSystem,
      brandContext: designMd ? buildBrandContext(manifest, designMd) : "",
    };
    pkgCache.set(id, pkg);
    return pkg;
  } catch (e) {
    console.warn(`[design-systems] failed to load brand "${id}":`, (e as Error).message);
    pkgCache.set(id, null);
    return null;
  }
}

/**
 * Merge a brand package's visual tokens over an AI-generated DesignSystem,
 * keeping the app-specific structure the planner produced (shell.navHtml,
 * componentLibrary, and the chosen navStyle/navHeight) but adopting the brand's
 * colors, fonts, and layout feel (radius/shadow/padding).
 */
export function mergeBrandIntoDesignSystem(ai: DesignSystem, brand: DesignSystem): DesignSystem {
  return {
    ...ai,
    colors: brand.colors,
    fonts: brand.fonts,
    layout: {
      // Brand owns the visual feel…
      ...(brand.layout ?? {}),
      // …but the app keeps the nav style/height the planner chose for this app type.
      navStyle: ai.layout?.navStyle ?? brand.layout?.navStyle ?? "topbar",
      navHeight: ai.layout?.navHeight ?? brand.layout?.navHeight ?? "56px",
    } as DesignSystem["layout"],
  };
}
