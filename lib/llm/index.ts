import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, streamText, type LanguageModel } from "ai";
import { z } from "zod";
import { modelIdFor, type ModelRole } from "./config";

export { MODEL_DESIGNER, MODEL_FAST, modelIdFor } from "./config";
export type { ModelRole } from "./config";

function googleApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
}

/** "/" in the slug → OpenRouter, otherwise Google. */
export function resolveModel(id: string): LanguageModel {
  if (id.includes("/")) {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    return openrouter.chat(id);
  }
  const google = createGoogleGenerativeAI({ apiKey: googleApiKey() });
  return google(id);
}

export function modelFor(role: ModelRole): LanguageModel {
  return resolveModel(modelIdFor(role));
}

/**
 * The narrow interface lib/agent/ depends on. Tests inject fakes here —
 * nothing outside lib/llm/ touches the AI SDK directly.
 */
export interface LlmClient {
  /** Stream plain text; onChunk fires per delta; resolves to the full text. */
  streamHtml(opts: {
    role: ModelRole;
    system: string;
    prompt: string;
    onChunk?: (delta: string) => void;
    abortSignal?: AbortSignal;
  }): Promise<string>;

  /** One structured call, validated against the zod schema. Throws on failure. */
  generateJson<T>(opts: {
    role: ModelRole;
    schema: z.ZodType<T>;
    system?: string;
    prompt: string;
    abortSignal?: AbortSignal;
  }): Promise<T>;
}

export const liveLlm: LlmClient = {
  async streamHtml({ role, system, prompt, onChunk, abortSignal }) {
    const result = streamText({
      model: modelFor(role),
      system,
      prompt,
      abortSignal,
    });
    let full = "";
    for await (const delta of result.textStream) {
      full += delta;
      onChunk?.(delta);
    }
    return full;
  },

  async generateJson({ role, schema, system, prompt, abortSignal }) {
    const { object } = await generateObject({
      model: modelFor(role),
      schema,
      system,
      prompt,
      abortSignal,
    });
    return object;
  },
};
