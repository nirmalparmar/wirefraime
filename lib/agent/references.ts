import fs from "node:fs";
import path from "node:path";

/**
 * Loader for the agent's knowledge base. references/ is the product —
 * these files change constantly, so they are read from disk (cached in
 * prod, fresh in dev) rather than baked into code.
 */

const REFERENCES_DIR = path.join(process.cwd(), "references");
const EXAMPLES_DIR = path.join(REFERENCES_DIR, "examples");
const DS_DIR = path.join(process.cwd(), "public", "ds");

const cache = new Map<string, string>();

function read(file: string): string {
  if (process.env.NODE_ENV !== "development" && cache.has(file)) {
    return cache.get(file)!;
  }
  const content = fs.readFileSync(file, "utf8");
  cache.set(file, content);
  return content;
}

export function loadGuidelines(): string {
  return read(path.join(REFERENCES_DIR, "guidelines.md"));
}

export function loadComponentCatalog(): string {
  return read(path.join(REFERENCES_DIR, "components.md"));
}

export function listExampleNames(): string[] {
  return fs
    .readdirSync(EXAMPLES_DIR)
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(/\.html$/, ""))
    .sort();
}

export function loadExample(name: string): string {
  return read(path.join(EXAMPLES_DIR, `${name}.html`));
}

/** Every class name defined across the ds/ stylesheets. */
export function loadKnownClasses(): Set<string> {
  const css = ["tokens.css", "components.css", "layout.css"]
    .map((f) => read(path.join(DS_DIR, f)))
    .join("\n");
  const out = new Set<string>();
  for (const m of css.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)) out.add(m[1]);
  return out;
}

const EXAMPLE_MATCHERS: Array<{ pattern: RegExp; example: string }> = [
  { pattern: /analytic|report|chart|metric|insight|traffic|usage/i, example: "analytics" },
  { pattern: /dashboard|overview|home|summary/i, example: "dashboard" },
  { pattern: /setting|profile|account|preference|configur|notification/i, example: "settings" },
  { pattern: /list|table|customer|contact|directory|inventory|order|invoice|member|catalog|browse/i, example: "crm-list" },
  { pattern: /onboard|sign.?up|log.?in|welcome|setup|invite|auth|register/i, example: "onboarding" },
  { pattern: /pricing|plan|upgrade|billing|subscribe/i, example: "pricing" },
];

/**
 * Pick 1–2 reference examples most relevant to a screen. Falls back to
 * dashboard (our strongest all-round example) and pairs every pick with
 * a second, different example so the model sees layout variety.
 */
export function pickExamples(screenName: string, purpose: string): string[] {
  const hay = `${screenName} ${purpose}`;
  const available = new Set(listExampleNames());
  let primary = "dashboard";
  for (const { pattern, example } of EXAMPLE_MATCHERS) {
    if (pattern.test(hay) && available.has(example)) {
      primary = example;
      break;
    }
  }
  const secondary = primary === "dashboard" ? "crm-list" : "dashboard";
  return available.has(secondary) ? [primary, secondary] : [primary];
}
