import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

/**
 * Phase A acceptance guard: the example screens are the agent's gold
 * standard, so every class they use must exist in the ds/ stylesheets,
 * and they must obey the same hard rules the sanitizer will enforce.
 */

const ROOT = path.join(import.meta.dir, "..");
const DS_DIR = path.join(ROOT, "public", "ds");
const EXAMPLES_DIR = path.join(ROOT, "references", "examples");

function definedClasses(): Set<string> {
  const css = ["tokens.css", "components.css", "layout.css"]
    .map((f) => fs.readFileSync(path.join(DS_DIR, f), "utf8"))
    .join("\n");
  const out = new Set<string>();
  for (const m of css.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)) out.add(m[1]);
  return out;
}

function exampleFiles(): string[] {
  return fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith(".html"));
}

function usedClasses(html: string): Set<string> {
  const out = new Set<string>();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/)) if (cls) out.add(cls);
  }
  return out;
}

describe("references/examples", () => {
  const defined = definedClasses();
  const files = exampleFiles();

  test("all six example screens exist", () => {
    const names = files.map((f) => f.replace(/\.html$/, "")).sort();
    expect(names).toEqual([
      "analytics", "crm-list", "dashboard", "onboarding", "pricing", "settings",
    ]);
  });

  for (const file of exampleFiles()) {
    const html = fs.readFileSync(path.join(EXAMPLES_DIR, file), "utf8");

    test(`${file} uses only classes defined in ds/`, () => {
      const unknown = [...usedClasses(html)].filter((c) => !defined.has(c));
      expect(unknown).toEqual([]);
    });

    test(`${file} obeys the hard rules (no scripts/handlers/inline styles)`, () => {
      expect(html).not.toMatch(/<script/i);
      expect(html).not.toMatch(/\son\w+=/i);
      expect(html).not.toMatch(/\sstyle="/i);
      expect(html).not.toMatch(/<style/i);
      expect(html).not.toMatch(/javascript:/i);
      expect(html).not.toMatch(/https?:\/\//i); // no external resources
    });

    test(`${file} starts with a shell and has exactly one h1 at most`, () => {
      expect(html.trimStart().startsWith('<div class="shell')).toBe(true);
      const h1s = html.match(/<h1[\s>]/g) ?? [];
      expect(h1s.length).toBeLessThanOrEqual(1);
    });
  }
});
