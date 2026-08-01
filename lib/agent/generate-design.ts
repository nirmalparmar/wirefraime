import type { Theme } from "@/lib/ds";
import type { LlmClient } from "@/lib/llm";
import { generatePlan } from "./plan";
import { generateScreenHtml, type ScreenSource } from "./generate-screen";
import type { ScreenSpec } from "./prompts";

/**
 * The reasoning agent's orchestration loop (plan §6): plan the app, then
 * generate its screens through a concurrency-limited worker pool. It knows
 * nothing about SSE or the database — it emits typed events and the caller
 * decides how to persist / stream them.
 */

export type GenerationEvent =
  | {
      type: "plan";
      appName: string;
      theme: Theme;
      screens: ScreenSpec[];
      source: "model" | "fallback";
    }
  | { type: "screen_start"; index: number; screen: ScreenSpec }
  | { type: "screen_chunk"; index: number; delta: string }
  | {
      type: "screen_done";
      index: number;
      screen: ScreenSpec;
      html: string;
      source: ScreenSource;
      warnings: string[];
    };

const DEFAULT_CONCURRENCY = 3;

export async function generateDesign(opts: {
  prompt: string;
  llm: LlmClient;
  /** Max screens generated in parallel (default 3). */
  concurrency?: number;
  abortSignal?: AbortSignal;
  /** Awaited for lifecycle events; fire-and-forget is fine for chunks. */
  onEvent: (event: GenerationEvent) => void | Promise<void>;
}): Promise<{ appName: string; screens: ScreenSpec[] }> {
  const { prompt, llm, abortSignal, onEvent } = opts;
  const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;

  const { plan, source } = await generatePlan(prompt, llm);
  await onEvent({
    type: "plan",
    appName: plan.appName,
    theme: plan.theme,
    screens: plan.screens,
    source,
  });

  // Concurrency-limited worker pool over the screen list.
  let next = 0;
  const runOne = async (): Promise<void> => {
    while (next < plan.screens.length) {
      if (abortSignal?.aborted) return;
      const index = next++;
      const screen = plan.screens[index];
      await onEvent({ type: "screen_start", index, screen });

      const result = await generateScreenHtml({
        ctx: {
          appName: plan.appName,
          userPrompt: prompt,
          screens: plan.screens,
          screen,
        },
        llm,
        onChunk: (delta) => {
          void onEvent({ type: "screen_chunk", index, delta });
        },
        abortSignal,
      });

      await onEvent({
        type: "screen_done",
        index,
        screen,
        html: result.html,
        source: result.source,
        warnings: result.warnings,
      });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, plan.screens.length) }, () =>
      runOne(),
    ),
  );

  return { appName: plan.appName, screens: plan.screens };
}
