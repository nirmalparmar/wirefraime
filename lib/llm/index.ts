import { generateText, streamText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { modelIdFor, type ModelRole } from "./config";
import { getModel } from "./provider";

export { modelIdFor } from "./config";
export type { ModelRole } from "./config";
export {
  getProvider,
  getModel,
  providerNameFor,
} from "./provider";
export type { ProviderName, ModelProvider } from "./provider";

/** Resolve a role to its AI SDK model: env config → provider routing. */
function modelForRole(role: ModelRole): LanguageModel {
  return getModel(modelIdFor(role));
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
      model: modelForRole(role),
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
    const { output } = await generateText({
      model: modelForRole(role),
      system,
      prompt,
      abortSignal,
      output: Output.object({ schema }),
    });
    return output;
  },
};
