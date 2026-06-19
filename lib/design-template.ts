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

/* ── Image guardrail ──────────────────────────────────────────
 *
 * The model can't know real Unsplash photo IDs, so it hallucinates
 * `images.unsplash.com/photo-<id>` URLs (and uses the discontinued
 * `source.unsplash.com`) — both 404 into the broken-image glyph. Two layers,
 * both deterministic and model-agnostic:
 *   1. rewriteUnreliableImages — swap unreliable hosts for seeded Lorem Picsum
 *      URLs (stable, never 404), preserving the requested dimensions.
 *   2. IMG_FALLBACK_SCRIPT — a global `error` listener so ANY <img> that still
 *      fails (a flaky avatar host, a picsum hiccup) falls back to a seeded
 *      picsum image instead of showing a broken icon.
 * Both run from injectSharedCSS, which is on every generate/edit/create path.
 */

// Hosts that 404 on hallucinated or expired IDs. i.pravatar.cc, picsum.photos,
// placehold.co, dummyimage.com and data: URIs are reliable and left untouched.
const UNRELIABLE_IMG_HOST =
  /^(?:https?:)?\/\/(?:images\.unsplash\.com|source\.unsplash\.com|(?:www\.)?unsplash\.com|loremflickr\.com|placeimg\.com|placekitten\.com|placebear\.com|lorempixel\.com)\b/i;

function imgDimension(src: string, key: "w" | "h"): number | null {
  const m = src.match(new RegExp(`[?&](?:${key}|${key === "w" ? "width" : "height"})=(\\d{2,4})`, "i"));
  return m ? Math.min(parseInt(m[1], 10), 2000) : null;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Stable, descriptive seed for a Picsum URL: alt text → seed/u param → URL hash. */
function imgSeed(tag: string, src: string): string {
  const alt = tag.match(/\balt="([^"]+)"/i)?.[1];
  const param = src.match(/[?&](?:u|seed|sig|id|q)=([^&"]+)/i)?.[1];
  const slug = (alt || param || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || `wf${hashString(src) % 100000}`;
}

/** Rewrite <img src> on unreliable hosts to seeded Lorem Picsum URLs. */
export function rewriteUnreliableImages(html: string): string {
  if (!html || !html.includes("<img")) return html;
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\bsrc="([^"]*)"/i)?.[1];
    if (!src || !UNRELIABLE_IMG_HOST.test(src)) return tag;
    const w = imgDimension(src, "w") ?? imgDimension(src, "h") ?? 800;
    const h = imgDimension(src, "h") ?? imgDimension(src, "w") ?? 600;
    const replacement = `https://picsum.photos/seed/${encodeURIComponent(imgSeed(tag, src))}/${w}/${h}`;
    return tag.replace(/\bsrc="[^"]*"/i, `src="${replacement}"`);
  });
}

// Self-contained: no backticks / template-substitutions so it nests in the
// template literal below. The `wfImgFixed` flag makes it idempotent (a failing
// picsum fallback won't loop).
const IMG_FALLBACK_SCRIPT = `(function(){
  function fix(img){
    if(img.dataset.wfImgFixed)return;
    img.dataset.wfImgFixed="1";
    var w=Math.round(img.getAttribute("width")||img.clientWidth||800)||800;
    var h=Math.round(img.getAttribute("height")||img.clientHeight||600)||600;
    var seed=(img.getAttribute("alt")||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,32);
    img.src="https://picsum.photos/seed/"+(seed||"wf"+Math.floor(Math.random()*99999))+"/"+w+"/"+h;
  }
  document.addEventListener("error",function(e){
    var t=e.target;
    if(t&&t.tagName==="IMG")fix(t);
  },true);
})();`;

/* ── Post-processing: inject base CSS + Tailwind config into generated HTML ── */

export function injectSharedCSS(html: string, ds: DesignSystem, platform: Platform): string {
  if (!html) return html;

  // Deterministic image guardrail: rewrite hosts that 404 on hallucinated IDs.
  html = rewriteUnreliableImages(html);

  const headClose = html.indexOf("</head>");
  if (headClose === -1) return html;

  const baseCSS = generateBaseCSS(ds, platform);
  const twConfig = generateTailwindConfig(ds, platform);

  // If already has v2 markers, just update them in place
  const hasBase = html.includes("/* ds-base v2");
  const hasTwConfig = html.includes("tailwind.config = {");
  const hasImgFallback = html.includes('data-ds="img-fallback"');

  if (hasBase && hasTwConfig && hasImgFallback) return html;

  const baseBlock = hasBase
    ? ""
    : `<style data-ds="base-injected">${baseCSS}</style>\n`;

  const twBlock = hasTwConfig
    ? ""
    : `<script data-ds="tw-injected">${twConfig}</script>\n`;

  const imgBlock = hasImgFallback
    ? ""
    : `<script data-ds="img-fallback">${IMG_FALLBACK_SCRIPT}</script>\n`;

  return html.slice(0, headClose) + baseBlock + twBlock + imgBlock + html.slice(headClose);
}

/* ── Shared shell enforcement ──────────────────────────────────
 *
 * Guarantees the navigation chrome (sidebar / top nav / bottom tabs) is
 * byte-identical across every screen. The model is asked to include the shared
 * nav verbatim, but LLMs drift — so after generation we deterministically
 * replace whatever nav element the screen produced with the canonical one,
 * toggling only the active item. No HTML-parser dependency: container tags
 * (aside/header/nav) don't meaningfully self-nest, and the matcher below is
 * depth-aware for the same tag anyway.
 */

type NavStyle = "sidebar" | "topbar" | "bottom-tabs" | "none";

/** Find the full outerHTML span of the first `<tag>…</tag>`, depth-aware for
 *  nested same-tag elements. Returns null if not found. */
function findElementSpan(html: string, tag: string): { start: number; end: number } | null {
  const open = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "i");
  const m = open.exec(html);
  if (!m) return null;
  const start = m.index;
  const tagRe = new RegExp(`<(/?)${tag}(?:\\s[^>]*)?>`, "ig");
  tagRe.lastIndex = start;
  let depth = 0;
  let t: RegExpExecArray | null;
  while ((t = tagRe.exec(html))) {
    if (t[1] === "/") {
      depth--;
      if (depth === 0) return { start, end: t.index + t[0].length };
    } else {
      depth++;
    }
  }
  return null;
}

/** Toggle the `active` class on nav links by their `data-nav="<screen name>"`
 *  marker so only the current screen's item is highlighted. Links without the
 *  marker are left untouched (chrome stays identical regardless). */
function toggleActiveNav(navHtml: string, screenName: string): string {
  return navHtml.replace(
    /<(a|button|li)\b([^>]*\bdata-nav="([^"]*)"[^>]*)>/gi,
    (_full, tag: string, attrs: string, navName: string) => {
      const isActive = navName.trim().toLowerCase() === screenName.trim().toLowerCase();
      const classMatch = attrs.match(/\bclass="([^"]*)"/i);
      let cls = (classMatch ? classMatch[1] : "")
        .split(/\s+/)
        .filter((c) => c && c !== "active")
        .join(" ");
      if (isActive) cls = `${cls} active`.trim();
      const newAttrs = classMatch
        ? attrs.replace(/\bclass="[^"]*"/i, `class="${cls}"`)
        : `${attrs} class="${cls}"`;
      return `<${tag}${newAttrs}>`;
    }
  );
}

/** The nav element tag to look for, in priority order, given the nav style. */
function navTagPriority(navStyle: NavStyle): string[] {
  if (navStyle === "sidebar") return ["aside", "nav", "header"];
  if (navStyle === "bottom-tabs") return ["nav", "footer"];
  return ["header", "nav"]; // topbar
}

/**
 * Replace the screen's nav with the canonical shared nav (active item toggled).
 * If the screen has no detectable nav, inject the canonical one at the correct
 * position for the layout. Returns html unchanged when there's no shared nav.
 */
export function enforceSharedShell(
  html: string,
  navHtml: string | undefined,
  navStyle: NavStyle | undefined,
  screenName: string
): string {
  if (!html || !navHtml || !navStyle || navStyle === "none") return html;

  const canonical = toggleActiveNav(navHtml.trim(), screenName);

  // 1. Try to replace an existing nav element of the expected tag.
  for (const tag of navTagPriority(navStyle)) {
    const span = findElementSpan(html, tag);
    if (span) {
      return html.slice(0, span.start) + canonical + html.slice(span.end);
    }
  }

  // 2. None found — inject. Bottom tabs go before </body>; everything else
  //    becomes the first child of <body>.
  if (navStyle === "bottom-tabs") {
    const bodyClose = html.lastIndexOf("</body>");
    if (bodyClose !== -1) return html.slice(0, bodyClose) + canonical + html.slice(bodyClose);
    return html + canonical;
  }

  const bodyOpen = html.match(/<body[^>]*>/i);
  if (bodyOpen && bodyOpen.index !== undefined) {
    const at = bodyOpen.index + bodyOpen[0].length;
    return html.slice(0, at) + canonical + html.slice(at);
  }
  return html;
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
