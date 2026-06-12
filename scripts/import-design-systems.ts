/**
 * One-time importer: builds Wirefraime brand packages from Open Design's
 * MIT-licensed catalog (../open-design/design-systems/<slug>).
 *
 * Why a script: the sibling repo does NOT exist in production — only the
 * emitted, self-contained packages under design-systems/<id>/ ship. Re-run
 * locally to re-sync or add brands.
 *
 *   bun scripts/import-design-systems.ts
 *
 * Mapping notes:
 * - Colors/radii come from the upstream structured `design-tokens.json`
 *   (--accent → primary, --bg → background, --fg → text, …).
 * - Fonts are HAND-CURATED to Google-Fonts-available families (upstream fonts
 *   are often proprietary, e.g. SF Pro, and Wirefraime loads from Google).
 * - DESIGN.md prose is copied with fenced code blocks stripped (they encode
 *   upstream var names like var(--accent); Wirefraime uses bg-primary tokens).
 */
import fs from "fs";
import path from "path";

const OD = path.resolve(process.cwd(), "../open-design/design-systems");
const OUT = path.resolve(process.cwd(), "design-systems");

interface Seed {
  id: string;          // wirefraime slug (folder)
  source: string;      // open-design slug
  name: string;
  category: string;
  description: string;
  font: string;        // Google Font for headings + body
  mono?: string;
  tags?: string[];
  secondary?: string;  // optional explicit secondary color
  shadow?: string;     // optional brand shadow override
  shadowLg?: string;
  buttonHeight?: string;
}

const SEEDS: Seed[] = [
  { id: "linear", source: "linear-app", name: "Linear", category: "Developer Tools",
    description: "Sharp, fast, dark-capable product UI. Tight type, restrained accent.",
    font: "Inter Tight", tags: ["saas", "dashboard", "dark", "minimal"] },
  { id: "vercel", source: "vercel", name: "Vercel", category: "Developer Tools",
    description: "Stark black-and-white, geometric, high-contrast. Engineering-grade.",
    font: "Geist", mono: "Geist Mono", tags: ["saas", "minimal", "mono", "stark"] },
  { id: "notion", source: "notion", name: "Notion", category: "Productivity",
    description: "Calm, warm-neutral, content-first. Quiet chrome, generous space.",
    font: "Sora", tags: ["productivity", "docs", "calm", "neutral"] },
  { id: "apple", source: "apple", name: "Apple", category: "Consumer",
    description: "Clean, cinematic, premium. Big imagery, thin chrome, one blue accent.",
    font: "Outfit", tags: ["consumer", "marketing", "premium", "clean"] },
  { id: "claude", source: "claude", name: "Claude", category: "AI & LLM",
    description: "Warm, literary, approachable. Coral accent on soft paper neutrals.",
    font: "DM Sans", tags: ["ai", "warm", "editorial", "friendly"] },
  { id: "coinbase", source: "coinbase", name: "Coinbase", category: "Fintech",
    description: "Trustworthy fintech blue, dense data, clear hierarchy.",
    font: "Plus Jakarta Sans", tags: ["fintech", "dashboard", "data", "trust"] },
  { id: "editorial", source: "warm-editorial", name: "Editorial", category: "Editorial",
    description: "Magazine-grade serif, warm paper, oversized display type.",
    font: "Fraunces", tags: ["editorial", "blog", "serif", "magazine"] },
  { id: "brutalist", source: "neobrutalism", name: "Brutalist", category: "Bold & Expressive",
    description: "Hard edges, hard shadows, raw grid, loud type. Zero softness.",
    font: "Space Grotesk", mono: "Space Mono", tags: ["bold", "brutalist", "raw", "loud"],
    shadow: "4px 4px 0 rgba(0,0,0,1)", shadowLg: "8px 8px 0 rgba(0,0,0,1)" },
  { id: "luxury", source: "luxury", name: "Luxury", category: "Luxury",
    description: "Refined, restrained, high-contrast serif. Quiet gold, deep neutrals.",
    font: "Cormorant Garamond", tags: ["luxury", "fashion", "serif", "refined"],
    shadow: "0 1px 2px rgba(0,0,0,0.04)", shadowLg: "0 20px 50px rgba(0,0,0,0.10)" },
  { id: "retro", source: "retro", name: "Retro", category: "Retro & Nostalgic",
    description: "Nostalgic palette, monospace voice, vintage warmth.",
    font: "Space Mono", mono: "Space Mono", tags: ["retro", "vintage", "mono", "nostalgic"] },
  { id: "playful", source: "duolingo", name: "Playful", category: "Playful",
    description: "Rounded, friendly, high-energy. Bouncy shapes, bright accents.",
    font: "Fredoka", tags: ["playful", "consumer", "rounded", "fun"],
    shadow: "0 2px 0 rgba(0,0,0,0.08)", shadowLg: "0 6px 0 rgba(0,0,0,0.10)" },
  { id: "minimal", source: "minimal", name: "Minimal", category: "Modern & Minimal",
    description: "Maximum whitespace, hairline borders, one quiet accent. Subtract.",
    font: "Geist", tags: ["minimal", "clean", "neutral", "spacious"] },
];

type TokenMap = Record<string, string>;

function readTokens(source: string): TokenMap {
  const p = path.join(OD, source, "design-tokens.json");
  const json = JSON.parse(fs.readFileSync(p, "utf8")) as {
    tokens: Array<{ name: string; value: string }>;
  };
  const map: TokenMap = {};
  for (const t of json.tokens) map[t.name] = t.value;
  return map;
}

function fontStack(name: string): string {
  return `${name}, system-ui, -apple-system, sans-serif`;
}
function monoStack(name: string): string {
  return `${name}, ui-monospace, "JetBrains Mono", Menlo, monospace`;
}

function buildDesignSystem(seed: Seed, m: TokenMap) {
  const v = (k: string, fb: string) => m[k] ?? fb;
  return {
    colors: {
      primary: v("--accent", "#2F6FEB"),
      secondary: seed.secondary ?? m["--accent-active"] ?? v("--accent", "#1f4fb0"),
      background: v("--bg", "#ffffff"),
      surface: m["--surface"] ?? v("--bg", "#f6f6f7"),
      text: v("--fg", "#111111"),
      textMuted: m["--muted"] ?? v("--fg", "#6b6b6b"),
      border: v("--border", "#e4e4e7"),
      success: v("--success", "#16a34a"),
      error: m["--danger"] ?? "#dc2626",
    },
    fonts: {
      primary: fontStack(seed.font),
      mono: monoStack(seed.mono ?? "JetBrains Mono"),
    },
    layout: {
      borderRadius: v("--radius-md", "12px"),
      borderRadiusLg: v("--radius-lg", "16px"),
      borderRadiusSm: v("--radius-sm", "8px"),
      shadow: seed.shadow ?? "0 1px 3px rgba(0,0,0,0.06)",
      shadowLg: seed.shadowLg ?? "0 4px 12px rgba(0,0,0,0.10)",
      spacingUnit: 8,
      cardPadding: v("--space-6", "24px"),
      sectionGap: v("--space-8", "32px"),
      buttonHeight: seed.buttonHeight ?? "44px",
      inputHeight: "40px",
      // navStyle/navHeight are placeholders — generation keeps the app-specific
      // nav style chosen by the planner and only adopts the brand's colors/fonts.
      navStyle: "topbar" as const,
      navHeight: "56px",
    },
  };
}

function cleanDesignMd(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, "") // strip fenced code (upstream var names)
    .replace(/~~~[\s\S]*?~~~/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

let ok = 0;
for (const seed of SEEDS) {
  try {
    const m = readTokens(seed.source);
    const ds = buildDesignSystem(seed, m);
    const designMd = cleanDesignMd(fs.readFileSync(path.join(OD, seed.source, "DESIGN.md"), "utf8"));

    const manifest = {
      schemaVersion: "wirefraime-brand/v1",
      id: seed.id,
      name: seed.name,
      category: seed.category,
      description: seed.description,
      tags: seed.tags ?? [],
      fonts: { primary: seed.font, mono: seed.mono ?? "JetBrains Mono" },
      source: { type: "imported", origin: "VoltAgent/awesome-design-md (MIT) via Open Design", slug: seed.source },
    };

    const dir = path.join(OUT, seed.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    fs.writeFileSync(path.join(dir, "design-system.json"), JSON.stringify(ds, null, 2) + "\n");
    fs.writeFileSync(path.join(dir, "DESIGN.md"), designMd + "\n");
    console.log(`✓ ${seed.id}  (accent ${ds.colors.primary}, font ${seed.font})`);
    ok++;
  } catch (e) {
    console.error(`✗ ${seed.id}: ${(e as Error).message}`);
  }
}
console.log(`\nImported ${ok}/${SEEDS.length} brand packages → design-systems/`);
