import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProvider,
} from "@ai-sdk/google";
import {
  createOpenRouter,
  type OpenRouterProvider,
} from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

/**
 * Provider resolution — the ONE place a model slug is mapped to an AI SDK
 * provider. No model IDs live here (they come from env via ./config); this
 * file only knows how to route a slug to Google or OpenRouter.
 *
 * Routing rules (first match wins):
 *   1. explicit prefix      "google:gemini-…" | "openrouter:anthropic/…"
 *   2. a "/" in the slug  → OpenRouter (its slugs are "vendor/model")
 *   3. everything else    → Google
 */

export type ProviderName = "google" | "openrouter";
export type ModelProvider = GoogleGenerativeAIProvider | OpenRouterProvider;

function googleApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
}

// Providers are cheap, stateless factories — memoize so repeated calls in a
// request don't rebuild them.
let googleSingleton: GoogleGenerativeAIProvider | undefined;
let openrouterSingleton: OpenRouterProvider | undefined;

function google(): GoogleGenerativeAIProvider {
  if (!googleSingleton) {
    const apiKey = googleApiKey();
    if (!apiKey) {
      throw new Error(
        "[llm] A Google model was requested but no API key is set. " +
          "Set GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY / GOOGLE_API_KEY).",
      );
    }
    googleSingleton = createGoogleGenerativeAI({ apiKey });
  }
  return googleSingleton;
}

function openrouter(): OpenRouterProvider {
  if (!openrouterSingleton) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "[llm] An OpenRouter model was requested but OPENROUTER_API_KEY is not set.",
      );
    }
    openrouterSingleton = createOpenRouter({ apiKey });
  }
  return openrouterSingleton;
}

/** Split an optional "provider:" prefix off the slug (see routing rules). */
function parseModelId(model: string): { provider: ProviderName; id: string } {
  const sep = model.indexOf(":");
  if (sep > 0) {
    const prefix = model.slice(0, sep);
    if (prefix === "google" || prefix === "openrouter") {
      return { provider: prefix, id: model.slice(sep + 1) };
    }
  }
  return { provider: model.includes("/") ? "openrouter" : "google", id: model };
}

/** Which provider a model slug routes to, without instantiating anything. */
export function providerNameFor(model: string): ProviderName {
  return parseModelId(model).provider;
}

/**
 * TOP-LEVEL provider selector: returns the AI SDK provider for a model slug.
 * Pair it with the un-prefixed id from {@link providerNameFor}, or just call
 * {@link getModel} which does both for you.
 */
export function getProvider(model: string): ModelProvider {
  return providerNameFor(model) === "openrouter" ? openrouter() : google();
}

/** Resolve a model slug straight to a ready-to-use AI SDK LanguageModel. */
export function getModel(model: string): LanguageModel {
  const { provider, id } = parseModelId(model);
  return provider === "openrouter"
    ? openrouter().languageModel(id)
    : google().languageModel(id);
}
