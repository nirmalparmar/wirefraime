/**
 * Generates shared CSS, Tailwind config, and HTML head for a DesignSystem.
 *
 * Philosophy (v2): generated HTML is Tailwind-first.
 * Every semantic token (`--color-primary`, radii, shadows) is exposed as BOTH
 * a CSS variable AND a Tailwind utility (`bg-primary`, `rounded-card`, etc.).
 * This makes screens editable via simple class swaps — no opaque ds-* classes.
 */
import type { DesignSystem, Platform } from "./types";
import { VIEWPORTS } from "./constants";

/* ── Platform defaults ──────────────────────────────────────── */

const DEFAULTS = {
  web: {
    borderRadius: "12px",
    borderRadiusLg: "16px",
    borderRadiusSm: "8px",
    shadow: "0 1px 3px rgba(0,0,0,0.06)",
    shadowLg: "0 4px 12px rgba(0,0,0,0.1)",
    spacingUnit: 8,
    cardPadding: "24px",
    sectionGap: "32px",
    buttonHeight: "44px",
    inputHeight: "40px",
    navStyle: "sidebar" as const,
    navHeight: "56px",
  },
  mobile: {
    borderRadius: "16px",
    borderRadiusLg: "20px",
    borderRadiusSm: "10px",
    shadow: "0 1px 2px rgba(0,0,0,0.05)",
    shadowLg: "0 4px 8px rgba(0,0,0,0.08)",
    spacingUnit: 8,
    cardPadding: "16px",
    sectionGap: "24px",
    buttonHeight: "52px",
    inputHeight: "48px",
    navStyle: "bottom-tabs" as const,
    navHeight: "64px",
  },
  tablet: {
    borderRadius: "14px",
    borderRadiusLg: "18px",
    borderRadiusSm: "8px",
    shadow: "0 1px 3px rgba(0,0,0,0.06)",
    shadowLg: "0 4px 10px rgba(0,0,0,0.08)",
    spacingUnit: 8,
    cardPadding: "20px",
    sectionGap: "28px",
    buttonHeight: "48px",
    inputHeight: "44px",
    navStyle: "sidebar" as const,
    navHeight: "56px",
  },
};

function getLayout(ds: DesignSystem, platform: Platform) {
  const d = DEFAULTS[platform];
  const l = ds.layout;
  return {
    borderRadius: l?.borderRadius ?? d.borderRadius,
    borderRadiusLg: l?.borderRadiusLg ?? d.borderRadiusLg,
    borderRadiusSm: l?.borderRadiusSm ?? d.borderRadiusSm,
    shadow: l?.shadow ?? d.shadow,
    shadowLg: l?.shadowLg ?? d.shadowLg,
    spacingUnit: l?.spacingUnit ?? d.spacingUnit,
    cardPadding: l?.cardPadding ?? d.cardPadding,
    sectionGap: l?.sectionGap ?? d.sectionGap,
    buttonHeight: l?.buttonHeight ?? d.buttonHeight,
    inputHeight: l?.inputHeight ?? d.inputHeight,
    navStyle: l?.navStyle ?? d.navStyle,
    navHeight: l?.navHeight ?? d.navHeight,
  };
}

/* ── Tailwind config (injected into iframe via CDN) ─────────── */

/**
 * Builds a tailwind.config object so generated HTML can use semantic utilities:
 *   bg-primary / text-primary / border-primary
 *   bg-surface / bg-background / text-muted / border-border
 *   rounded-card / rounded-card-lg / rounded-btn / rounded-pill
 *   shadow-card / shadow-card-lg
 *   h-btn / h-input / h-nav
 *
 * All values reference CSS variables so changing `--color-primary` updates
 * every `bg-primary` / `text-primary` / `border-primary` in the iframe live.
 */
export function generateTailwindConfig(ds: DesignSystem, platform: Platform): string {
  const L = getLayout(ds, platform);
  const fontStack = ds.fonts.primary;
  const monoStack = ds.fonts.mono;

  return `
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: 'var(--color-primary)',
            soft: 'color-mix(in oklch, var(--color-primary) 12%, transparent)',
            hover: 'color-mix(in oklch, var(--color-primary) 88%, black)',
          },
          secondary: 'var(--color-secondary)',
          background: 'var(--color-background)',
          surface: 'var(--color-surface)',
          foreground: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          border: 'var(--color-border)',
          success: {
            DEFAULT: 'var(--color-success)',
            soft: 'color-mix(in oklch, var(--color-success) 15%, transparent)',
          },
          error: {
            DEFAULT: 'var(--color-error)',
            soft: 'color-mix(in oklch, var(--color-error) 15%, transparent)',
          },
        },
        fontFamily: {
          sans: ${JSON.stringify(fontStack.split(",").map((s) => s.trim()))},
          mono: ${JSON.stringify(monoStack.split(",").map((s) => s.trim()))},
        },
        borderRadius: {
          card: '${L.borderRadius}',
          'card-lg': '${L.borderRadiusLg}',
          btn: '${L.borderRadiusSm}',
          pill: '9999px',
        },
        boxShadow: {
          card: '${L.shadow}',
          'card-lg': '${L.shadowLg}',
          focus: '0 0 0 3px color-mix(in oklch, var(--color-primary) 25%, transparent)',
        },
        height: {
          btn: '${L.buttonHeight}',
          input: '${L.inputHeight}',
          nav: '${L.navHeight}',
        },
        spacing: {
          card: '${L.cardPadding}',
          section: '${L.sectionGap}',
        },
      },
    },
    corePlugins: { preflight: true },
  };
  `;
}

/* ── Base CSS (small — only things Tailwind can't do via utilities) ── */

export function generateBaseCSS(ds: DesignSystem, platform: Platform): string {
  const { colors, fonts } = ds;
  const L = getLayout(ds, platform);
  const vp = VIEWPORTS[platform];

  return `/* ds-base v2 — css variables + minimal base styles */
:root {
  --color-primary: ${colors.primary};
  --color-secondary: ${colors.secondary};
  --color-background: ${colors.background};
  --color-surface: ${colors.surface};
  --color-text: ${colors.text};
  --color-text-muted: ${colors.textMuted};
  --color-border: ${colors.border};
  --color-success: ${colors.success};
  --color-error: ${colors.error};
  --ds-radius: ${L.borderRadius};
  --ds-radius-lg: ${L.borderRadiusLg};
  --ds-radius-sm: ${L.borderRadiusSm};
  --ds-shadow: ${L.shadow};
  --ds-shadow-lg: ${L.shadowLg};
  --ds-nav-height: ${L.navHeight};
}

html, body {
  margin: 0;
  padding: 0;
  background: var(--color-background);
  color: var(--color-text);
  font-family: ${fonts.primary};
  font-feature-settings: "ss01", "cv11";
  width: ${vp.w}px;
  min-height: ${vp.h}px;
  -webkit-font-smoothing: antialiased;
}

/* Hide scrollbars — design tool shows full content */
::-webkit-scrollbar { display: none; }
body { -ms-overflow-style: none; scrollbar-width: none; }

/* Iconoir: consistent default sizing */
[class*="iconoir-"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

/* Input focus ring using design system primary */
input:focus, textarea:focus, select:focus, button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-primary) 25%, transparent);
  border-color: var(--color-primary);
}
`;
}

/* ── Backwards-compat: keep generateSharedCSS returning base CSS ── */

export function generateSharedCSS(ds: DesignSystem, platform: Platform): string {
  return generateBaseCSS(ds, platform);
}

/* ── Full <head> template ───────────────────────────────────── */

export function generateHtmlHead(ds: DesignSystem, platform: Platform): string {
  const { fonts } = ds;
  const vp = VIEWPORTS[platform];
  const primaryFont = fonts.primary.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
  const monoFont = fonts.mono.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
  const encodedPrimary = encodeURIComponent(primaryFont);
  const encodedMono = encodeURIComponent(monoFont);

  const baseCSS = generateBaseCSS(ds, platform);
  const twConfig = generateTailwindConfig(ds, platform);

  return `<!DOCTYPE html>
<html lang="en" style="width:${vp.w}px;overflow-x:hidden;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${vp.w}">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>${twConfig}<\/script>
  <link href="https://fonts.googleapis.com/css2?family=${encodedPrimary}:wght@300;400;500;600;700;800&family=${encodedMono}:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/iconoir/7.11.0/css/iconoir.css">
  <style>${baseCSS}</style>
</head>`;
}

/* ── Post-processing: inject base CSS + Tailwind config into generated HTML ── */

export function injectSharedCSS(html: string, ds: DesignSystem, platform: Platform): string {
  if (!html) return html;

  const baseCSS = generateBaseCSS(ds, platform);
  const twConfig = generateTailwindConfig(ds, platform);
  const headClose = html.indexOf("</head>");
  if (headClose === -1) return html;

  // If already has v2 markers, just update them in place
  const hasBase = html.includes("/* ds-base v2");
  const hasTwConfig = html.includes("tailwind.config = {");

  if (hasBase && hasTwConfig) return html;

  const baseBlock = hasBase
    ? ""
    : `<style data-ds="base-injected">${baseCSS}</style>\n`;

  const twBlock = hasTwConfig
    ? ""
    : `<script data-ds="tw-injected">${twConfig}</script>\n`;

  return html.slice(0, headClose) + baseBlock + twBlock + html.slice(headClose);
}

/* ── Reference pattern extraction ─────────────────────────── */

/**
 * Pull just enough from ONE screen to show the next screen what Tailwind
 * class patterns are already in use — without flooding the context.
 */
export function extractReferencePatterns(html: string): string {
  const snapshot = snapshotScreen(html);
  if (!snapshot) return "";

  return `REFERENCE PATTERNS FROM ANOTHER SCREEN IN THIS APP:

NAVIGATION / SIDEBAR:
${snapshot.nav || "(none detected)"}

REPRESENTATIVE CARD:
${snapshot.card || "(none detected)"}

REPRESENTATIVE BUTTON:
${snapshot.button || "(none detected)"}

REPRESENTATIVE TYPOGRAPHY:
${snapshot.typography || "(none detected)"}

→ Your screen MUST use the SAME Tailwind class patterns (nav container, card stack, button stack, heading scale).`;
}

interface ScreenSnapshot {
  nav: string;
  card: string;
  button: string;
  typography: string;
}

function snapshotScreen(html: string): ScreenSnapshot | null {
  if (!html) return null;

  // Strip style/script blocks — noise for references.
  const cleaned = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

  const nav = firstMatch(cleaned, /<(?:nav|header|aside)[^>]*>[\s\S]*?<\/(?:nav|header|aside)>/i, 1200);
  const card = firstMatch(
    cleaned,
    /<(?:div|article|section)\s+class="[^"]*(?:rounded-card|rounded-xl|rounded-2xl|shadow-card|border)[^"]*"[\s\S]{0,600}?<\/(?:div|article|section)>/i,
    800
  );
  const button = firstMatch(cleaned, /<button[^>]*class="[^"]*"[^>]*>[\s\S]{0,200}?<\/button>/i, 400);
  const typography = firstMatch(cleaned, /<h[12][^>]*class="[^"]*"[^>]*>[\s\S]{0,120}?<\/h[12]>/i, 200);

  return { nav, card, button, typography };
}

function firstMatch(s: string, re: RegExp, maxLen: number): string {
  const m = s.match(re);
  return m ? m[0].slice(0, maxLen) : "";
}

/**
 * Merge patterns from multiple reference screens, deduplicating by shape.
 * Used so that screens 4+ see patterns from multiple earlier screens — not just screen 1.
 */
export function extractMultiScreenPatterns(
  htmls: string[],
  designSystem: DesignSystem
): string {
  const snapshots = htmls
    .map(snapshotScreen)
    .filter((s): s is ScreenSnapshot => s !== null);

  if (snapshots.length === 0) return "";

  // Take the first nav (usually identical across screens), first N unique cards, first N unique buttons.
  const nav = snapshots[0].nav;
  const cards = dedupe(snapshots.map((s) => s.card).filter(Boolean)).slice(0, 2);
  const buttons = dedupe(snapshots.map((s) => s.button).filter(Boolean)).slice(0, 2);
  const typography = dedupe(snapshots.map((s) => s.typography).filter(Boolean)).slice(0, 2);

  const tokens = `TOKENS IN USE:
  Primary: ${designSystem.colors.primary}  |  Surface: ${designSystem.colors.surface}  |  Font: ${designSystem.fonts.primary.split(",")[0]}`;

  return `REFERENCE PATTERNS FROM ${snapshots.length} PRIOR SCREENS IN THIS APP (you MUST match these):

${tokens}

NAVIGATION / SIDEBAR (shared across all screens):
${nav || "(none detected)"}

CARD PATTERNS (reuse these Tailwind class stacks):
${cards.map((c, i) => `--- card ${i + 1} ---\n${c}`).join("\n\n") || "(none detected)"}

BUTTON PATTERNS:
${buttons.map((b, i) => `--- button ${i + 1} ---\n${b}`).join("\n\n") || "(none detected)"}

HEADING PATTERNS:
${typography.join("\n") || "(none detected)"}

→ Your new screen MUST reuse these exact Tailwind class stacks for nav, cards, buttons, and headings. Do not invent new patterns.`;
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    // Dedupe by the class attribute fingerprint — similar class stacks = same pattern.
    const fp = (item.match(/class="([^"]+)"/) || [])[1] ?? item.slice(0, 60);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(item);
  }
  return out;
}
