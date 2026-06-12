/**
 * Brand design-system package contract (Wirefraime "Brand" axis).
 *
 * A package is a committed folder under `design-systems/<id>/`:
 *
 *   design-systems/<id>/
 *   ├── manifest.json         ← metadata for the picker (this schema)
 *   ├── design-system.json    ← renderable Wirefraime DesignSystem (colors/fonts/layout)
 *   └── DESIGN.md             ← brand direction prose injected as generation context
 *
 * The renderable `design-system.json` uses Wirefraime's own token contract
 * (colors.primary → --color-primary → bg-primary, etc.) so the live editor and
 * iframe rendering keep working unchanged. DESIGN.md carries the visual
 * direction (mood, proportions, anti-patterns) for fidelity.
 *
 * Seed packages are adapted from Open Design's MIT-licensed catalog
 * (VoltAgent/awesome-design-md). They are aesthetic inspirations, not official
 * brand assets. See design-systems/README.md for attribution.
 */
import { z } from "zod";

export const BrandManifestSchema = z.object({
  schemaVersion: z.literal("wirefraime-brand/v1"),
  /** URL-safe slug; matches the folder name. */
  id: z.string(),
  /** Display name shown in the picker. */
  name: z.string(),
  /** Picker grouping, e.g. "Developer Tools", "Editorial", "Fintech". */
  category: z.string(),
  /** One-line summary shown under the name. */
  description: z.string(),
  /** Free-form search/keyword tags. */
  tags: z.array(z.string()).default([]),
  /** Google Font families loaded for this brand. */
  fonts: z.object({
    primary: z.string(),
    mono: z.string(),
  }),
  /** Provenance for attribution + re-sync. */
  source: z
    .object({
      type: z.string(),
      origin: z.string(),
      /** Upstream Open Design slug this was imported from. */
      slug: z.string().optional(),
    })
    .optional(),
});

export type BrandManifest = z.infer<typeof BrandManifestSchema>;
