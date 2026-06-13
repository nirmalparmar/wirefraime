import fs from 'fs';
import path from 'path';
import { LlmAgent, InMemoryRunner, BaseLlm } from "@google/adk";
import type { Content } from "@google/genai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// The ADK runner (@google/genai) only reads GEMINI_API_KEY / GOOGLE_GENAI_API_KEY,
// while the rest of this codebase (and streamWithGemini) accepts GOOGLE_API_KEY.
// Mirror it so the Gemini-backed planner/critic agents authenticate regardless
// of which name the deployment env uses — without this, every planner call
// throws "API key must be provided…" and collapses into the fallback plan.
if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENAI_API_KEY && process.env.GOOGLE_API_KEY) {
  process.env.GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
}

export interface Skill {
  frontmatter: Record<string, string>;
  instructions: string;
}

export async function loadSkillFromDir(dirPath: string): Promise<Skill> {
  const skillPath = path.join(dirPath, 'SKILL.md');
  const content = await fs.promises.readFile(skillPath, 'utf8');

  // Basic frontmatter parser
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  let frontmatter: Record<string, string> = {};
  let instructions: string;

  if (!match) {
    instructions = content.trim();
  } else {
    const frontmatterRaw = match[1];
    instructions = match[2].trim();
    frontmatterRaw.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        frontmatter[key] = value;
      }
    });
  }

  // Auto-load reference files from references/ subdirectory
  const refsDir = path.join(dirPath, 'references');
  try {
    const files = await fs.promises.readdir(refsDir);
    const mdFiles = files.filter(f => f.endsWith('.md')).sort();
    for (const file of mdFiles) {
      const refContent = await fs.promises.readFile(path.join(refsDir, file), 'utf8');
      const refName = file.replace(/\.md$/, '').replace(/[-_]/g, ' ');
      instructions += `\n\n=== REFERENCE: ${refName} ===\n${refContent.trim()}`;
    }
  } catch {
    // No references directory — that's fine
  }

  return { frontmatter, instructions };
}

export class SkillToolset {
  skills: Skill[];
  constructor({ skills }: { skills: Skill[] }) {
    this.skills = skills;
  }
}

interface AgentConfig {
  name: string;
  model: string | BaseLlm;
  instructions: string;
  tools?: SkillToolset[];
  outputSchema?: any; // Zod schema
  temperature?: number;
}

/** Converts a Zod v4 schema to a plain JSON Schema object for OpenRouter structured outputs. */
function zodToJsonSchema(zodSchema: any): Record<string, unknown> {
  function convertField(field: any): Record<string, unknown> {
    const type = field._def?.type;
    if (type === "string") return { type: "string" };
    if (type === "number") return { type: "number" };
    if (type === "boolean") return { type: "boolean" };
    if (type === "optional") return convertField(field._def.innerType);
    if (type === "enum") {
      // Zod v4 enum: values is an object { key: value }
      const vals = field._def.values;
      const enumValues = typeof vals === "object" && !Array.isArray(vals)
        ? Object.values(vals)
        : vals;
      return { type: "string", enum: enumValues };
    }
    if (type === "array") {
      return { type: "array", items: convertField(field._def.element) };
    }
    if (type === "object") {
      const shape: Record<string, any> = field._def?.shape ?? {};
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [k, v] of Object.entries(shape)) {
        properties[k] = convertField(v);
        if ((v as any)._def?.type !== "optional") required.push(k);
      }
      return { type: "object", properties, ...(required.length ? { required } : {}) };
    }
    // fallback
    return { type: "string" };
  }

  try {
    const shape: Record<string, any> = zodSchema._def?.shape ?? zodSchema.shape ?? {};
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(shape)) {
      properties[k] = convertField(v);
      if ((v as any)._def?.type !== "optional") required.push(k);
    }
    return { type: "object", properties, ...(required.length ? { required } : {}) };
  } catch {
    return { type: "object" };
  }
}

export class Agent {
  private systemInstruction: string;
  private modelId: string;
  private adkAgent?: LlmAgent;
  private runner?: InMemoryRunner;
  private outputSchema?: any;
  private temperature: number;
  private isOpenRouter: boolean;

  constructor(config: AgentConfig) {
    let combinedInstructions = config.instructions;

    // Inject skill instructions into the system prompt
    if (config.tools) {
      for (const toolset of config.tools) {
        if (toolset instanceof SkillToolset) {
          for (const skill of toolset.skills) {
            combinedInstructions += `\n\n=== SKILL: ${skill.frontmatter.name || "Unknown"} ===\n${skill.frontmatter.description || ""}\n\n${skill.instructions}`;
          }
        }
      }
    }

    this.temperature = config.temperature ?? 0.7;
    this.outputSchema = config.outputSchema;

    // Resolve model string
    const modelStr = typeof config.model === "string"
      ? config.model
      : (config.model as any).model ?? "gemini-2.5-pro-preview-05-06";

    this.modelId = modelStr;
    this.isOpenRouter = modelStr.includes("/") && !modelStr.startsWith("gemini-");

    if (this.isOpenRouter) {
      // OpenRouter path: store plain instructions (no ADK escaping needed)
      this.systemInstruction = combinedInstructions;
    } else {
      // ADK/Gemini path: escape curly braces
      this.systemInstruction = combinedInstructions.replace(/([{}])/g, "\\$1");
      this.adkAgent = new LlmAgent({
        name: config.name,
        model: config.model,
        instruction: this.systemInstruction,
        outputSchema: config.outputSchema,
        generateContentConfig: {
          // Generous cap: thinking models (gemini-3.x pro) burn output budget on
          // reasoning tokens before emitting JSON — 16384 caused empty responses.
          maxOutputTokens: 32768,
          temperature: this.temperature,
        },
      });
      this.runner = new InMemoryRunner({ agent: this.adkAgent, appName: "wirefraime" });
    }
  }

  /**
   * Direct OpenRouter completion — non-streaming, with optional JSON schema enforcement.
   * Used for planning/structured calls when the model is an OpenRouter slug.
   */
  private async callOpenRouter(prompt: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

    const body: Record<string, unknown> = {
      model: this.modelId,
      stream: false,
      temperature: this.temperature,
      max_tokens: 16384,
      messages: [
        { role: "system", content: this.systemInstruction },
        { role: "user", content: prompt },
      ],
    };

    // If there's an output schema, enforce structured JSON output
    if (this.outputSchema) {
      const jsonSchema = zodToJsonSchema(this.outputSchema);
      body.response_format = {
        type: "json_schema",
        json_schema: {
          name: "structured_output",
          strict: true,
          schema: jsonSchema,
        },
      };
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://wirefraime.app",
        "X-Title": "Wirefraime",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`OpenRouter ${res.status}: ${txt.slice(0, 400)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  async *chatStream(
    prompt: string,
    image?: { data: string; mimeType: string }
  ): AsyncGenerator<string> {
    if (this.isOpenRouter) {
      // For structured calls, just do a single non-streaming call
      const text = await this.callOpenRouter(prompt);
      if (text) yield text;
      return;
    }
    // ADK/Gemini path. Optionally attach a reference image (multimodal) so the
    // planner can derive palette/typography from it.
    const parts: Content["parts"] = [{ text: prompt }];
    if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
    const message: Content = { role: "user", parts };
    for await (const event of this.runner!.runEphemeral({
      userId: "system",
      newMessage: message,
    })) {
      if (!event.content?.parts) continue;
      for (const part of event.content.parts) {
        if (typeof part.text === "string" && part.text) {
          yield part.text;
        }
      }
    }
  }

  async chat(prompt: string, image?: { data: string; mimeType: string }) {
    let text = "";
    for await (const chunk of this.chatStream(prompt, image)) {
      text += chunk;
    }
    if (!text.trim()) {
      throw new Error(
        `Model ${this.modelId} returned an empty response (safety block or output-token exhaustion)`
      );
    }
    return { text };
  }
}

/**
 * Direct Gemini streaming — bypasses ADK for true token-level streaming.
 * Use this for large HTML generation where progressive rendering matters.
 * Supports optional inline images for multimodal prompts.
 */
export async function* streamWithGemini(
  systemInstruction: string,
  prompt: string,
  opts?: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    image?: { data: string; mimeType: string };
    /** Receives thought-summary text when the model emits it. */
    onReasoning?: (text: string) => void;
  }
): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const genAI = new GoogleGenerativeAI(apiKey);

  // Thought summaries are opt-in (DESIGN_REASONING=1): the legacy SDK / model
  // support is uncertain, so we don't risk the main generation by default.
  const wantThoughts = opts?.onReasoning && process.env.DESIGN_REASONING === "1";
  const generationConfig: Record<string, unknown> = {
    temperature: opts?.temperature ?? 0.7,
    maxOutputTokens: opts?.maxOutputTokens ?? 65536,
    ...(wantThoughts ? { thinkingConfig: { includeThoughts: true } } : {}),
  };

  const model = genAI.getGenerativeModel({
    model: opts?.model ?? "gemini-2.5-pro-preview-05-06",
    systemInstruction,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generationConfig: generationConfig as any,
  });

  // Build content parts: text + optional image
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];
  if (opts?.image) {
    parts.push({ inlineData: { mimeType: opts.image.mimeType, data: opts.image.data } });
  }

  const result = await model.generateContentStream(parts);
  for await (const chunk of result.stream) {
    // Separate thought parts (reasoning) from content parts when present.
    const cparts = chunk.candidates?.[0]?.content?.parts as
      | Array<{ text?: string; thought?: boolean }>
      | undefined;
    if (cparts && cparts.length) {
      for (const p of cparts) {
        if (typeof p.text === "string" && p.text) {
          if (p.thought) opts?.onReasoning?.(p.text);
          else yield p.text;
        }
      }
    } else {
      const text = chunk.text();
      if (text) yield text;
    }
  }
}

/**
 * OpenRouter streaming via Chat Completions SSE.
 *
 * Used as an alternative streaming backend (e.g. xiaomi/mimo-v2.5-pro) when
 * OPENROUTER_API_KEY is set + the configured streaming model is an OpenRouter
 * slug (e.g. "xiaomi/mimo-v2.5-pro").
 *
 * Inline images are passed as data: URLs in the content array, matching the
 * OpenAI-compatible schema OpenRouter supports.
 */
export async function* streamWithOpenRouter(
  systemInstruction: string,
  prompt: string,
  opts: {
    model: string;
    temperature?: number;
    maxOutputTokens?: number;
    image?: { data: string; mimeType: string };
    /** Receives reasoning deltas for reasoning-capable models. */
    onReasoning?: (text: string) => void;
  }
): AsyncGenerator<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  type UserContent =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };
  const userContent: UserContent[] = [{ type: "text", text: prompt }];
  if (opts.image) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${opts.image.mimeType};base64,${opts.image.data}` },
    });
  }

  const body = {
    model: opts.model,
    stream: true,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxOutputTokens ?? 8192,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: userContent },
    ],
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://wirefraime.app",
      "X-Title": "Wirefraime",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${txt.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames separated by \n\n
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta;
          const reasoning = delta?.reasoning;
          if (typeof reasoning === "string" && reasoning) opts.onReasoning?.(reasoning);
          const content = delta?.content;
          if (typeof content === "string" && content) yield content;
        } catch {
          // Some providers send keep-alive or comment frames — ignore
        }
      }
    }
  }
}

/**
 * Provider-agnostic streaming. Picks OpenRouter if the model slug looks like
 * an OpenRouter route (vendor/model), otherwise falls back to Gemini.
 *
 * This is the entry point design-agent should use for HTML generation so
 * swapping models is a one-line config change.
 */
export async function* streamDesign(
  systemInstruction: string,
  prompt: string,
  opts: {
    model: string;
    temperature?: number;
    maxOutputTokens?: number;
    image?: { data: string; mimeType: string };
    /** Receives model reasoning/thinking text when available. */
    onReasoning?: (text: string) => void;
  }
): AsyncGenerator<string> {
  const isOpenRouter = opts.model.includes("/") && !opts.model.startsWith("gemini-");
  if (isOpenRouter) {
    yield* streamWithOpenRouter(systemInstruction, prompt, opts);
  } else {
    yield* streamWithGemini(systemInstruction, prompt, opts);
  }
}
