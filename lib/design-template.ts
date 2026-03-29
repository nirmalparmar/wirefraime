/**
 * Generates shared CSS and HTML head from a DesignSystem.
 * This ensures all screens in an app share identical component styles,
 * typography scale, and layout tokens — regardless of LLM variation.
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

/* ── Shared CSS generation ──────────────────────────────────── */

export function generateSharedCSS(ds: DesignSystem, platform: Platform): string {
  const { colors, fonts } = ds;
  const L = getLayout(ds, platform);
  const isMobile = platform === "mobile";

  // Typography scale per platform
  const typo = isMobile
    ? { title: "30px", heading: "22px", subheading: "18px", body: "16px", caption: "14px", small: "12px" }
    : platform === "tablet"
      ? { title: "34px", heading: "24px", subheading: "19px", body: "16px", caption: "14px", small: "12px" }
      : { title: "40px", heading: "26px", subheading: "19px", body: "16px", caption: "14px", small: "13px" };

  return `/* ds-shared — auto-generated design system CSS */
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
  --ds-card-padding: ${L.cardPadding};
  --ds-section-gap: ${L.sectionGap};
  --ds-btn-height: ${L.buttonHeight};
  --ds-input-height: ${L.inputHeight};
  --ds-nav-height: ${L.navHeight};
}

/* Typography */
.ds-title { font-size: ${typo.title}; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; color: var(--color-text); }
.ds-heading { font-size: ${typo.heading}; font-weight: 600; letter-spacing: -0.01em; line-height: 1.25; color: var(--color-text); }
.ds-subheading { font-size: ${typo.subheading}; font-weight: 600; line-height: 1.35; color: var(--color-text); }
.ds-body { font-size: ${typo.body}; font-weight: 400; line-height: 1.55; color: var(--color-text); }
.ds-caption { font-size: ${typo.caption}; font-weight: 400; line-height: 1.45; color: var(--color-text-muted); }
.ds-small { font-size: ${typo.small}; font-weight: 500; line-height: 1.3; color: var(--color-text-muted); }

/* Card */
.ds-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--ds-radius);
  padding: var(--ds-card-padding);
  box-shadow: var(--ds-shadow);
}
.ds-card-lg {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--ds-radius-lg);
  padding: var(--ds-card-padding);
  box-shadow: var(--ds-shadow-lg);
}

/* Buttons */
.ds-btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: var(--ds-btn-height);
  padding: 0 24px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--ds-radius-sm);
  font-family: inherit;
  font-size: ${isMobile ? "16px" : "15px"};
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s ease, transform 0.1s ease;
  white-space: nowrap;
}
.ds-btn-primary:hover { filter: brightness(0.92); }
.ds-btn-primary:active { transform: scale(0.98); }

.ds-btn-secondary {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: var(--ds-btn-height);
  padding: 0 24px;
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--ds-radius-sm);
  font-family: inherit;
  font-size: ${isMobile ? "16px" : "15px"};
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
  white-space: nowrap;
}
.ds-btn-secondary:hover { background: var(--color-surface); }

/* Input */
.ds-input {
  height: var(--ds-input-height);
  width: 100%;
  padding: 0 ${isMobile ? "16px" : "12px"};
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--ds-radius-sm);
  font-family: inherit;
  font-size: ${isMobile ? "16px" : "15px"};
  color: var(--color-text);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.ds-input::placeholder { color: var(--color-text-muted); opacity: 0.6; }
.ds-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px ${colors.primary}22; }

/* Badge */
.ds-badge {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 2px 10px;
  min-width: 22px;
  background: var(--color-primary);
  color: #fff;
  border-radius: 999px;
  font-size: ${typo.small};
  font-weight: 600;
  white-space: nowrap;
}
.ds-badge-secondary {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 2px 10px;
  min-width: 22px;
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: ${typo.small};
  font-weight: 500;
  white-space: nowrap;
}
.ds-badge-success {
  display: inline-flex; align-items: center; padding: 2px 10px;
  background: ${colors.success}22; color: var(--color-success); border-radius: 999px;
  font-size: ${typo.small}; font-weight: 600;
}
.ds-badge-error {
  display: inline-flex; align-items: center; padding: 2px 10px;
  background: ${colors.error}22; color: var(--color-error); border-radius: 999px;
  font-size: ${typo.small}; font-weight: 600;
}

/* Avatar */
.ds-avatar {
  width: ${isMobile ? "44px" : "40px"};
  height: ${isMobile ? "44px" : "40px"};
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: ${isMobile ? "16px" : "15px"};
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}
.ds-avatar-lg {
  width: ${isMobile ? "56px" : "48px"};
  height: ${isMobile ? "56px" : "48px"};
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: ${isMobile ? "20px" : "18px"};
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

/* Navigation */
.ds-nav {
  display: flex;
  align-items: center;
  height: var(--ds-nav-height);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0 ${isMobile ? "20px" : "24px"};
  gap: ${isMobile ? "0" : "8px"};
}
.ds-nav-bottom {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: var(--ds-nav-height);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  position: fixed;
  bottom: 0; left: 0; right: 0;
  padding: 0;
}
.ds-nav-item {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px;
  padding: ${isMobile ? "8px 0" : "8px 12px"};
  font-size: ${typo.small};
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 0.15s ease;
  cursor: pointer;
  ${isMobile ? "flex: 1;" : "border-radius: var(--ds-radius-sm);"}
}
.ds-nav-item:hover { color: var(--color-text); ${isMobile ? "" : "background: var(--color-background);"} }
.ds-nav-item.active { color: var(--color-primary); font-weight: 600; }

/* Section spacing */
.ds-section { margin-bottom: var(--ds-section-gap); }

/* Sidebar (web/tablet) */
.ds-sidebar {
  width: 260px;
  flex-shrink: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 0;
}
.ds-sidebar-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 20px;
  font-size: 15px;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  cursor: pointer;
}
.ds-sidebar-item:hover { background: var(--color-background); color: var(--color-text); }
.ds-sidebar-item.active { color: var(--color-primary); font-weight: 600; background: ${colors.primary}10; }

/* Divider */
.ds-divider { height: 1px; background: var(--color-border); margin: 16px 0; width: 100%; }

/* Status dot */
.ds-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ds-dot-success { background: var(--color-success); }
.ds-dot-error { background: var(--color-error); }

/* Icons (Iconoir) */
.ds-icon { font-size: ${isMobile ? "22px" : "20px"}; line-height: 1; display: inline-flex; align-items: center; justify-content: center; }
.ds-icon-sm { font-size: ${isMobile ? "18px" : "16px"}; line-height: 1; display: inline-flex; align-items: center; justify-content: center; }
.ds-icon-lg { font-size: ${isMobile ? "28px" : "24px"}; line-height: 1; display: inline-flex; align-items: center; justify-content: center; }
.ds-nav-item .iconoir, .ds-sidebar-item .iconoir { font-size: ${isMobile ? "24px" : "20px"}; }

/* Scrollbar hiding */
::-webkit-scrollbar { display: none; }
body { -ms-overflow-style: none; scrollbar-width: none; }
`;
}

/* ── Full <head> template ───────────────────────────────────── */

export function generateHtmlHead(ds: DesignSystem, platform: Platform): string {
  const { fonts } = ds;
  const vp = VIEWPORTS[platform];
  const primaryFont = fonts.primary.split(",")[0].trim();
  const monoFont = fonts.mono.split(",")[0].trim();
  const encodedPrimary = encodeURIComponent(primaryFont);
  const encodedMono = encodeURIComponent(monoFont);

  const sharedCSS = generateSharedCSS(ds, platform);

  return `<!DOCTYPE html>
<html lang="en" style="width:${vp.w}px;overflow-x:hidden;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${vp.w}">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link href="https://fonts.googleapis.com/css2?family=${encodedPrimary}:wght@300;400;500;600;700&family=${encodedMono}:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/iconoir/7.11.0/css/iconoir.css">
  <style>${sharedCSS}</style>
  <style>body{font-family:${fonts.primary};background:var(--color-background);color:var(--color-text);margin:0;width:${vp.w}px;min-height:${vp.h}px;}</style>
</head>`;
}

/* ── Post-processing: inject shared CSS into generated HTML ── */

export function injectSharedCSS(html: string, ds: DesignSystem, platform: Platform): string {
  // Already has shared CSS
  if (html.includes("/* ds-shared")) return html;

  const sharedCSS = generateSharedCSS(ds, platform);
  const headClose = html.indexOf("</head>");
  if (headClose === -1) return html;

  return html.slice(0, headClose) +
    `<style>/* ds-shared-injected */\n${sharedCSS}\n</style>\n` +
    html.slice(headClose);
}

/* ── Extract reference patterns from a completed screen ──── */

export function extractReferencePatterns(html: string): string {
  // Extract <style> blocks and first structural section for reference
  const styles: string[] = [];
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = styleRe.exec(html)) !== null) {
    styles.push(m[1]);
  }

  // Extract nav/header structure
  const navMatch = html.match(/<(?:nav|header)[^>]*>[\s\S]*?<\/(?:nav|header)>/i);
  const nav = navMatch ? navMatch[0] : "";

  // Extract first major content section (first div after body open, up to 2000 chars)
  const bodyStart = html.indexOf("<body");
  const bodyContent = bodyStart > -1 ? html.slice(bodyStart, bodyStart + 3000) : "";

  return `INLINE STYLES FROM SCREEN 1:\n${styles.join("\n").slice(0, 2000)}\n\nNAVIGATION STRUCTURE:\n${nav.slice(0, 1500)}\n\nBODY STRUCTURE:\n${bodyContent.slice(0, 2000)}`;
}
