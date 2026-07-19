import { LlmClient } from "@/lib/llm";
import { placeholderScreen } from "./placeholder";
import {
  assembleDesignerSystemPrompt,
  buildRetryPrompt,
  buildScreenPrompt,
  buildSimpleScreenPrompt,
  ScreenPromptContext,
} from "./prompts";
import { sanitizeHtml, validateScreen } from "./sanitize";

export type ScreenSource = "designer" | "designer-retry" | "fast" | "placeholder";

export interface GeneratedScreen {
  html: string;
  source: ScreenSource;
  /** Dev-visible notes: sanitizer removals + unknown classes. */
  warnings: string[];
}

/**
 * Fallback ladder (plan §6): designer → designer retry with the
 * validator's complaints → fast model, simple version → static
 * placeholder. The user ALWAYS gets a screen.
 */
export async function generateScreenHtml(opts: {
  ctx: ScreenPromptContext;
  llm: LlmClient;
  onChunk?: (delta: string) => void;
  abortSignal?: AbortSignal;
}): Promise<GeneratedScreen> {
  const { ctx, llm, onChunk, abortSignal } = opts;
  const system = assembleDesignerSystemPrompt(ctx.screen);

  const attempt = async (
    role: "designer" | "fast",
    prompt: string,
    source: ScreenSource,
  ): Promise<GeneratedScreen | { complaints: string[] }> => {
    const raw = await llm.streamHtml({
      role,
      system,
      prompt,
      onChunk,
      abortSignal,
    });
    const { html, removed, unknownClasses } = sanitizeHtml(raw);
    const complaints = validateScreen(html);
    if (complaints.length > 0) return { complaints };
    const warnings = [
      ...removed.map((r) => `sanitizer removed: ${r}`),
      ...(unknownClasses.length > 0
        ? [`unknown classes: ${unknownClasses.join(", ")}`]
        : []),
    ];
    return { html, source, warnings };
  };

  const rungs: Array<() => Promise<GeneratedScreen | { complaints: string[] }>> = [];
  let lastComplaints: string[] = [];

  rungs.push(() => attempt("designer", buildScreenPrompt(ctx), "designer"));
  rungs.push(() =>
    attempt("designer", buildRetryPrompt(ctx, lastComplaints), "designer-retry"),
  );
  rungs.push(() => attempt("fast", buildSimpleScreenPrompt(ctx), "fast"));

  for (const rung of rungs) {
    if (abortSignal?.aborted) break;
    try {
      const result = await rung();
      if ("html" in result) return result;
      lastComplaints = result.complaints;
      console.warn(`[agent] screen "${ctx.screen.name}" rejected:`, result.complaints);
    } catch (err) {
      if (abortSignal?.aborted) break;
      lastComplaints = ["The previous attempt errored before completing."];
      console.warn(`[agent] screen "${ctx.screen.name}" attempt threw:`, err);
    }
  }

  return {
    html: placeholderScreen(ctx.screen.name, ctx.screen.purpose),
    source: "placeholder",
    warnings: [`fell through ladder; last complaints: ${lastComplaints.join(" | ")}`],
  };
}
