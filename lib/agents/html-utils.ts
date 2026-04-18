/**
 * HTML validation, repair, and patch utilities.
 * Used by design-agent to keep LLM output safe before it reaches the iframe.
 */

/** Strip markdown code fences that leak into model output. */
export function stripFences(text: string): string {
  return text
    .replace(/^```(?:json|html|xml)?\s*\n?/gm, "")
    .replace(/\n?```\s*$/gm, "")
    .trim();
}

/** Extract the first `{...}` JSON object from messy text. */
export function extractJson(text: string): string {
  const cleaned = stripFences(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in response");
  }
  return cleaned.slice(start, end + 1);
}

/** Fence stripping that also handles partial-fence prefixes during streaming. */
export function stripLeadingFence(chunk: string): string {
  if (chunk.startsWith("```html\n")) return chunk.replace(/^```html\n/, "");
  if (chunk.startsWith("```\n")) return chunk.replace(/^```\n/, "");
  return chunk;
}

/* ── HTML validation ────────────────────────────────────────── */

const RAW_TEXT_ELEMENTS = new Set(["script", "style", "noscript", "template"]);

export interface HtmlValidationResult {
  ok: boolean;
  errors: string[];
  repaired: string;
}

/**
 * Lightweight HTML validator + repair pass.
 *
 * Catches:
 *  - Unclosed `<style>`, `<script>`, `<div>` tags (common LLM failure)
 *  - Stray markdown fences (```html, ```)
 *  - Missing `<!DOCTYPE html>` / root element
 *  - Obviously-truncated HTML (no </body> or </html>)
 *  - Leading/trailing prose the model added outside the HTML
 *
 * Does NOT try to be a full parser — this is a safety net, not a compiler.
 */
export function validateAndRepairHtml(input: string): HtmlValidationResult {
  const errors: string[] = [];
  let html = stripFences(input);

  // 1. Trim any leading prose before <!DOCTYPE or <html.
  const doctypeIdx = html.search(/<!DOCTYPE\s+html/i);
  const htmlTagIdx = html.indexOf("<html");
  const start = doctypeIdx >= 0 ? doctypeIdx : htmlTagIdx;
  if (start > 0) {
    errors.push(`trimmed ${start} chars of leading non-HTML`);
    html = html.slice(start);
  } else if (start === -1) {
    errors.push("no <!DOCTYPE html> or <html> found");
    // Best-effort: wrap whatever we have
    if (!html.toLowerCase().includes("<html")) {
      html = `<!DOCTYPE html>\n<html><head></head><body>\n${html}\n</body></html>`;
    }
  }

  // 2. Trim trailing prose after </html>.
  const htmlCloseIdx = html.toLowerCase().lastIndexOf("</html>");
  if (htmlCloseIdx > 0 && htmlCloseIdx + 7 < html.length) {
    const trailing = html.slice(htmlCloseIdx + 7).trim();
    if (trailing.length > 0) {
      errors.push(`trimmed ${trailing.length} chars of trailing non-HTML`);
      html = html.slice(0, htmlCloseIdx + 7);
    }
  }

  // 3. Check for unclosed <style> / <script>.
  const unclosed = findUnclosedRawTextElement(html);
  if (unclosed) {
    errors.push(`unclosed <${unclosed}> tag`);
    html = html + `</${unclosed}>`;
  }

  // 4. Check for missing </body> / </html>.
  const lowerHtml = html.toLowerCase();
  if (!lowerHtml.includes("</body>")) {
    errors.push("missing </body>");
    const htmlCloseIdx2 = lowerHtml.lastIndexOf("</html>");
    if (htmlCloseIdx2 >= 0) {
      html = html.slice(0, htmlCloseIdx2) + "</body>" + html.slice(htmlCloseIdx2);
    } else {
      html = html + "</body>";
    }
  }
  if (!lowerHtml.includes("</html>")) {
    errors.push("missing </html>");
    html = html + "</html>";
  }

  // 5. Balance div tags (rough count — real parsers would be better).
  const divOpens = (html.match(/<div\b/gi) || []).length;
  const divCloses = (html.match(/<\/div>/gi) || []).length;
  if (divOpens > divCloses) {
    const missing = divOpens - divCloses;
    errors.push(`${missing} unclosed <div> tag${missing > 1 ? "s" : ""}`);
    // Add closing divs before </body>
    const bodyClose = html.toLowerCase().lastIndexOf("</body>");
    const closers = "</div>".repeat(missing);
    if (bodyClose >= 0) {
      html = html.slice(0, bodyClose) + closers + html.slice(bodyClose);
    } else {
      html = html + closers;
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    repaired: html,
  };
}

function findUnclosedRawTextElement(html: string): string | null {
  for (const tag of RAW_TEXT_ELEMENTS) {
    const opens = new RegExp(`<${tag}\\b[^>]*>`, "gi");
    const closes = new RegExp(`</${tag}>`, "gi");
    const openCount = (html.match(opens) || []).length;
    const closeCount = (html.match(closes) || []).length;
    if (openCount > closeCount) return tag;
  }
  return null;
}

/* ── Patch operations ───────────────────────────────────────── */

export interface PatchOp {
  /** Exact or near-exact substring of the document to match. */
  search: string;
  /** Replacement HTML (empty string = delete). */
  replace: string;
  /** Human-readable summary for UI / logs. */
  description: string;
}

export interface PatchResult {
  html: string;
  applied: number;
  failed: Array<{ description: string; reason: string }>;
}

/**
 * Apply patch operations to HTML with whitespace-tolerant matching.
 *
 * Strategy:
 *   1. Try exact match (fastest path).
 *   2. Fall back to whitespace-normalized match — lets the model be sloppy
 *      about indentation while preserving the user's actual whitespace.
 *   3. Report failure per-op (vs silently dropping like the old flow).
 */
export function applyPatchOps(html: string, ops: PatchOp[]): PatchResult {
  let current = html;
  let applied = 0;
  const failed: PatchResult["failed"] = [];

  for (const op of ops) {
    if (!op.search) {
      failed.push({ description: op.description, reason: "empty search string" });
      continue;
    }

    // 1. Exact match.
    let idx = current.indexOf(op.search);

    // 2. Whitespace-tolerant match.
    if (idx === -1) {
      idx = fuzzyIndexOf(current, op.search);
    }

    if (idx === -1) {
      failed.push({
        description: op.description,
        reason: `search string not found (first 60 chars: "${op.search.slice(0, 60).replace(/\n/g, "\\n")}")`,
      });
      continue;
    }

    // For fuzzy matches we need to figure out how much of the source to replace.
    // Strategy: collapse whitespace on both sides and find the span length.
    const spanLength = computeMatchLength(current, idx, op.search);
    current = current.slice(0, idx) + op.replace + current.slice(idx + spanLength);
    applied++;
  }

  return { html: current, applied, failed };
}

/** Find a substring with whitespace collapsed on both sides. */
function fuzzyIndexOf(haystack: string, needle: string): number {
  const collapsedNeedle = needle.replace(/\s+/g, " ").trim();
  if (!collapsedNeedle) return -1;

  // Walk through haystack collapsing whitespace as we go.
  let collapsedHay = "";
  const offsets: number[] = []; // collapsedHay[i] came from haystack[offsets[i]]
  let inWhitespace = false;

  for (let i = 0; i < haystack.length; i++) {
    const ch = haystack[i];
    if (/\s/.test(ch)) {
      if (!inWhitespace && collapsedHay.length > 0) {
        collapsedHay += " ";
        offsets.push(i);
      }
      inWhitespace = true;
    } else {
      collapsedHay += ch;
      offsets.push(i);
      inWhitespace = false;
    }
  }

  const matchIdx = collapsedHay.indexOf(collapsedNeedle);
  if (matchIdx === -1) return -1;
  return offsets[matchIdx];
}

function computeMatchLength(haystack: string, startIdx: number, needle: string): number {
  // If exact match from startIdx, use needle length.
  if (haystack.slice(startIdx, startIdx + needle.length) === needle) {
    return needle.length;
  }

  // Otherwise, walk forward consuming chars until the needle is exhausted.
  const needleChars = needle.replace(/\s+/g, " ").trim();
  let ni = 0;
  let hi = startIdx;
  let lastNonWsHi = startIdx;

  while (hi < haystack.length && ni < needleChars.length) {
    const hc = haystack[hi];
    const nc = needleChars[ni];

    if (/\s/.test(hc)) {
      if (nc === " ") ni++;
      hi++;
    } else if (/\s/.test(nc)) {
      // Needle expects whitespace but haystack has something else — advance needle.
      ni++;
    } else if (hc === nc) {
      ni++;
      hi++;
      lastNonWsHi = hi;
    } else {
      // Mismatch — return what we have.
      return lastNonWsHi - startIdx;
    }
  }

  return hi - startIdx;
}
