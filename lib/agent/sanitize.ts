import { loadKnownClasses } from "./references";

/**
 * The ONLY hard gate between model output and the preview iframe
 * (plan §1.6). Everything stored or rendered goes through here.
 * Strips active content and external resources; records (but does not
 * reject) unknown classes so we know when references/ needs work.
 */

export interface SanitizeResult {
  html: string;
  /** Things that were removed — dev-visible, never user-facing. */
  removed: string[];
  /** Classes used that ds/ doesn't define. */
  unknownClasses: string[];
}

const BLOCKED_TAGS = [
  "script", "style", "iframe", "object", "embed", "applet",
  "base", "meta", "title", "noscript", "template", "slot", "dialog",
];

export function sanitizeHtml(input: string): SanitizeResult {
  const removed: string[] = [];
  let html = input;

  // Markdown fences — models love wrapping output in ```html … ```
  const fenced = /```(?:html)?\s*([\s\S]*?)```/i.exec(html);
  if (fenced && fenced[1].trim().length > 0) {
    html = fenced[1];
    removed.push("markdown fences");
  }

  // Full-document wrappers → keep body content only.
  const body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  if (body) {
    html = body[1];
    removed.push("document wrapper");
  } else if (/<!doctype|<html[\s>]|<head[\s>]/i.test(html)) {
    html = html
      .replace(/<!doctype[^>]*>/gi, "")
      .replace(/<head(?![a-z])[^>]*>[\s\S]*?<\/head>/gi, "")
      .replace(/<\/?html[^>]*>/gi, "")
      .replace(/<\/?body[^>]*>/gi, "");
    removed.push("document wrapper");
  }

  // Paired dangerous tags with their content, then any stragglers.
  for (const tag of BLOCKED_TAGS) {
    const paired = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    const single = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
    if (paired.test(html) || single.test(html)) {
      html = html.replace(paired, "").replace(single, "");
      removed.push(`<${tag}>`);
    }
  }

  // <link> is single-tag (stylesheets, prefetch beacons).
  if (/<link\b/i.test(html)) {
    html = html.replace(/<link\b[^>]*\/?>/gi, "");
    removed.push("<link>");
  }

  // Event handlers: onclick="…", onload='…', onerror=bare
  const handlers = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
  if (handlers.test(html)) {
    html = html.replace(handlers, "");
    removed.push("event handlers");
  }

  // Inline styles — the design system is the only styling channel.
  const styles = /\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
  if (styles.test(html)) {
    html = html.replace(styles, "");
    removed.push("style attributes");
  }

  // srcdoc (nested-document smuggling)
  html = html.replace(/\ssrcdoc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // javascript:/vbscript:/data: URLs in href/src/action/formaction.
  const badUrl = /\s(href|src|action|formaction|xlink:href)\s*=\s*(["']?)\s*(javascript|vbscript|data)\s*:[^"'\s>]*\2/gi;
  if (badUrl.test(html)) {
    html = html.replace(badUrl, "");
    removed.push("scriptable URLs");
  }

  // External resources: generated fragments may not reference the network
  // at all (fonts + ds CSS are injected by the wrapper, not the fragment).
  const external = /\s(href|src|action|formaction|poster|xlink:href)\s*=\s*(["'])\s*(?:https?:)?\/\/[^"']*\2/gi;
  if (external.test(html)) {
    html = html.replace(external, "");
    removed.push("external URLs");
  }

  html = html.trim();

  // Unknown-class audit (warn-only).
  const known = loadKnownClasses();
  const unknown = new Set<string>();
  for (const m of html.matchAll(/class\s*=\s*"([^"]*)"/gi)) {
    for (const cls of m[1].split(/\s+/)) {
      if (cls && !known.has(cls)) unknown.add(cls);
    }
  }

  return { html, removed, unknownClasses: [...unknown] };
}

/** Share of class usages that ds/ doesn't define (0..1). */
export function unknownClassRate(html: string): number {
  const known = loadKnownClasses();
  let total = 0;
  let unknown = 0;
  for (const m of html.matchAll(/class\s*=\s*"([^"]*)"/gi)) {
    for (const cls of m[1].split(/\s+/)) {
      if (!cls) continue;
      total++;
      if (!known.has(cls)) unknown++;
    }
  }
  return total === 0 ? 0 : unknown / total;
}

/**
 * Post-sanitize validation for the fallback ladder. Returns complaints;
 * empty array = screen is acceptable.
 */
export function validateScreen(html: string): string[] {
  const complaints: string[] = [];
  if (html.length < 200) {
    complaints.push("Output is empty or far too short to be a real screen.");
    return complaints;
  }
  if (!/^<div\s+class\s*=\s*"shell[\s"]/i.test(html)) {
    complaints.push('The fragment must start with a shell: <div class="shell shell-sidebar|shell-topnav|shell-centered">.');
  }
  const rate = unknownClassRate(html);
  if (rate > 0.25) {
    complaints.push(
      `${Math.round(rate * 100)}% of the classes you used are not in the class catalog. Use ONLY documented classes.`,
    );
  }
  if (/\b(lorem ipsum|Item 1\b|Placeholder text)/i.test(html)) {
    complaints.push("Content must be realistic and domain-specific — no lorem ipsum or 'Item 1' filler.");
  }
  return complaints;
}
