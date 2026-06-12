/**
 * Anti-AI-slop linter.
 *
 * Deterministic, regex-based detection of the cardinal sins from
 * craft/anti-ai-slop.md. Runs on generated HTML (no LLM). P0 findings are
 * unambiguous, high-confidence patterns whose fix is mechanical — the design
 * agent uses them to trigger one targeted fix pass. P1 findings are reported
 * for visibility but never auto-fixed (lower confidence / more subjective).
 *
 * IMPORTANT: only the rendered <body> markup is scanned. <head>, <style>, and
 * <script> are stripped first, so the design system's own tokens (which live
 * in CSS vars / the Tailwind config and are referenced in the body as
 * `bg-primary` etc.) never trip the palette detectors.
 */
import type { LintFinding, LintSeverity } from "./types";

/** Remove head, style, script, and comments so we only scan visible markup. */
function visibleMarkup(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

function countMatches(str: string, regex: RegExp): { count: number; sample?: string } {
  const matches = str.match(regex);
  if (!matches || matches.length === 0) return { count: 0 };
  return { count: matches.length, sample: matches[0].slice(0, 80) };
}

// ── Palette families ──────────────────────────────────────────────
// Indigo/violet/purple/fuchsia get their own finding (the #1 AI tell);
// the remaining scale colors are the general "hardcoded palette" sin.
const INDIGO_FAMILY = "indigo|violet|purple|fuchsia";
const OTHER_PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|pink|rose";
const COLOR_UTILS =
  "bg|text|border|ring|from|via|to|fill|stroke|divide|placeholder|decoration|outline|accent|caret|shadow";
const SCALE = "(?:50|[1-9]00|950)";

const RULES: Array<{
  rule: string;
  severity: LintSeverity;
  message: string;
  detect: (body: string) => { count: number; sample?: string };
}> = [
  {
    rule: "indigo-accent",
    severity: "P0",
    message:
      "Default indigo/violet/purple used as a color. This is the #1 AI-slop tell. Replace with the design-system token (bg-primary / text-primary / bg-primary-soft).",
    detect: (body) => {
      const cls = countMatches(
        body,
        new RegExp(`\\b(?:${COLOR_UTILS})-(?:${INDIGO_FAMILY})-${SCALE}\\b`, "g")
      );
      const hex = countMatches(
        body,
        /#(?:6366f1|4f46e5|4338ca|3730a3|818cf8|8b5cf6|7c3aed|6d28d9|a855f7|9333ea|c026d3)\b/gi
      );
      return { count: cls.count + hex.count, sample: cls.sample ?? hex.sample };
    },
  },
  {
    rule: "hardcoded-colors",
    severity: "P0",
    message:
      "Hardcoded Tailwind palette colors instead of design-system tokens. Breaks the brand contract and click-to-edit. Use bg-surface / text-muted / border-border / bg-primary. (text-white / text-black on a colored fill are fine.)",
    detect: (body) =>
      countMatches(body, new RegExp(`\\b(?:${COLOR_UTILS})-(?:${OTHER_PALETTE})-${SCALE}\\b`, "g")),
  },
  {
    rule: "trust-gradient",
    severity: "P0",
    message:
      "Two-stop cool/purple 'trust' gradient (purple→blue, blue→cyan). Use a flat bg-surface + type hierarchy, or a purposeful from-primary/to-secondary gradient.",
    detect: (body) => {
      const hasGradient = /\bbg-(?:gradient|linear)-to-[a-z]+\b/.test(body);
      if (!hasGradient) return { count: 0 };
      const cool = `(?:${INDIGO_FAMILY}|blue|cyan|sky|pink|rose)`;
      const from = countMatches(body, new RegExp(`\\bfrom-${cool}-${SCALE}\\b`, "g"));
      const to = countMatches(body, new RegExp(`\\b(?:to|via)-${cool}-${SCALE}\\b`, "g"));
      if (from.count > 0 && to.count > 0) {
        return { count: from.count, sample: from.sample ?? to.sample };
      }
      return { count: 0 };
    },
  },
  {
    rule: "emoji-icons",
    severity: "P0",
    message:
      "Emoji used as icons/decoration. Wirefraime mandates Iconoir — replace with <i class=\"iconoir-<name> text-[20px]\"></i>. Zero emoji anywhere.",
    detect: (body) =>
      countMatches(body, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu),
  },
  {
    rule: "filler-copy",
    severity: "P0",
    message:
      "Filler/placeholder copy. Use realistic content (real names, prices, dates) or solve the empty slot with composition.",
    detect: (body) =>
      countMatches(
        body,
        /lorem ipsum|\bfeature (?:one|two|three)\b|\$XX\.XX|\bplaceholder text\b|\bsample content\b|\byour (?:headline|text|content|title) here\b|\bName Here\b|\bUser [123]\b/gi
      ),
  },
  {
    rule: "invented-metrics",
    severity: "P1",
    message:
      "Likely-fabricated superlative metric ('10× faster', '99.9% uptime'). Ground it in a real source or label it as sample/pending.",
    detect: (body) =>
      countMatches(
        body,
        /\b\d+(?:\.\d+)?\s?[×x]\s?(?:faster|more|better|higher|cheaper|productive)\b|\b99\.9+\s?%\s?(?:uptime|reliable|availability|accuracy)\b/gi
      ),
  },
  {
    rule: "ai-tile",
    severity: "P1",
    message:
      "Rounded card with a colored left-border accent (the canonical 'AI dashboard tile'). Drop either the radius or the left border.",
    detect: (body) => {
      const classAttrs = body.match(/class="[^"]*"/gi) ?? [];
      let count = 0;
      let sample: string | undefined;
      for (const attr of classAttrs) {
        if (/\brounded-(?:card|lg|xl|2xl|3xl)\b/.test(attr) && /\bborder-l-(?:2|4|8)\b/.test(attr)) {
          count++;
          sample ??= attr.slice(0, 80);
        }
      }
      return { count, sample };
    },
  },
];

/** Scan generated HTML for AI-slop patterns. */
export function lintHtml(html: string): LintFinding[] {
  if (!html) return [];
  const body = visibleMarkup(html);
  const findings: LintFinding[] = [];
  for (const r of RULES) {
    const { count, sample } = r.detect(body);
    if (count > 0) {
      findings.push({ rule: r.rule, severity: r.severity, message: r.message, count, sample });
    }
  }
  return findings;
}

/** True when any P0 (auto-fixable) finding is present. */
export function hasBlockingFindings(findings: LintFinding[]): boolean {
  return findings.some((f) => f.severity === "P0");
}

/** One-line log summary, e.g. "indigo-accent×3, filler-copy×1". */
export function summarizeFindings(findings: LintFinding[]): string {
  if (findings.length === 0) return "clean";
  return findings.map((f) => `${f.rule}×${f.count}`).join(", ");
}

/**
 * Build a targeted fix instruction for the re-prompt pass. Defaults to P0
 * findings only — those are the high-confidence, mechanically-fixable ones.
 */
export function buildLintFixInstruction(findings: LintFinding[]): string {
  const blocking = findings.filter((f) => f.severity === "P0");
  if (blocking.length === 0) return "";
  const lines = blocking
    .map((f) => `- ${f.rule} (${f.count}×): ${f.message}${f.sample ? ` [e.g. \`${f.sample}\`]` : ""}`)
    .join("\n");
  return `The HTML below has these specific AI-slop violations. Fix ONLY these, changing as little else as possible — preserve all content, structure, layout, and every other class:\n\n${lines}`;
}
