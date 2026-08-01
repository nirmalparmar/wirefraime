import fs from "fs";
import path from "path";
import { generateText, streamText, Output, type ModelMessage } from "ai";
import { getModel } from "@/lib/llm";

/**
 * Model-call layer for the design agents. Rebuilt on the Vercel AI SDK
 * (via lib/llm getModel → Google or OpenRouter by slug). No @google/adk,
 * @google/generative-ai, or hand-rolled fetch loops — one code path for
 * both providers. Public surface (Agent, streamDesign, loadSkillFromDir,
 * SkillToolset) is unchanged so callers don't move.
 */

type ImageInput = { data: string; mimeType: string };

/** Build a user message, attaching any images as base64 image parts. */
function userMessage(prompt: string, images: ImageInput[]): ModelMessage {
  if (images.length === 0) return { role: "user", content: prompt };
  return {
    role: "user",
    content: [
      { type: "text", text: prompt },
      ...images.map((img) => ({
        type: "image" as const,
        image: img.data,
        mediaType: img.mimeType,
      })),
    ],
  };
}

function normalizeImages(images?: ImageInput | ImageInput[]): ImageInput[] {
  if (!images) return [];
  return Array.isArray(images) ? images : [images];
}

export interface Skill {
  frontmatter: Record<string, string>;
  instructions: string;
}

export async function loadSkillFromDir(dirPath: string): Promise<Skill> {
  const skillPath = path.join(dirPath, "SKILL.md");
  const content = await fs.promises.readFile(skillPath, "utf8");

  // Basic frontmatter parser
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const frontmatter: Record<string, string> = {};
  let instructions: string;

  if (!match) {
    instructions = content.trim();
  } else {
    const frontmatterRaw = match[1];
    instructions = match[2].trim();
    frontmatterRaw.split("\n").forEach((line) => {
      const colonIndex = line.indexOf(":");
      if (colonIndex !== -1) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        frontmatter[key] = value;
      }
    });
  }

  // Auto-load reference files from references/ subdirectory
  const refsDir = path.join(dirPath, "references");
  try {
    const files = await fs.promises.readdir(refsDir);
    const mdFiles = files.filter((f) => f.endsWith(".md")).sort();
    for (const file of mdFiles) {
      const refContent = await fs.promises.readFile(path.join(refsDir, file), "utf8");
      const refName = file.replace(/\.md$/, "").replace(/[-_]/g, " ");
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
  model: string;
  instructions: string;
  tools?: SkillToolset[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outputSchema?: any; // Zod schema — enforced via generateText + Output.object
  temperature?: number;
}

/**
 * A single-turn model wrapper. With an outputSchema it does one structured
 * `generateText` + `Output.object` call (returning the object as JSON in
 * `.text`, preserving the previous contract); otherwise a plain text completion.
 */
export class Agent {
  private system: string;
  private modelId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private outputSchema?: any;
  private temperature: number;

  constructor(config: AgentConfig) {
    let combined = config.instructions;
    if (config.tools) {
      for (const toolset of config.tools) {
        if (toolset instanceof SkillToolset) {
          for (const skill of toolset.skills) {
            combined += `\n\n=== SKILL: ${skill.frontmatter.name || "Unknown"} ===\n${skill.frontmatter.description || ""}\n\n${skill.instructions}`;
          }
        }
      }
    }
    this.system = combined;
    this.modelId = config.model;
    this.outputSchema = config.outputSchema;
    this.temperature = config.temperature ?? 0.7;
  }

  async chat(
    prompt: string,
    images?: ImageInput | ImageInput[]
  ): Promise<{ text: string }> {
    const messages: ModelMessage[] = [userMessage(prompt, normalizeImages(images))];

    if (this.outputSchema) {
      const { output } = await generateText({
        model: getModel(this.modelId),
        system: this.system,
        messages,
        temperature: this.temperature,
        output: Output.object({ schema: this.outputSchema }),
      });
      return { text: JSON.stringify(output) };
    }

    const { text } = await generateText({
      model: getModel(this.modelId),
      system: this.system,
      messages,
      temperature: this.temperature,
    });
    if (!text.trim()) {
      throw new Error(
        `Model ${this.modelId} returned an empty response (safety block or output-token exhaustion)`
      );
    }
    return { text };
  }

  async *chatStream(
    prompt: string,
    images?: ImageInput | ImageInput[]
  ): AsyncGenerator<string> {
    const result = streamText({
      model: getModel(this.modelId),
      system: this.system,
      messages: [userMessage(prompt, normalizeImages(images))],
      temperature: this.temperature,
    });
    for await (const delta of result.textStream) yield delta;
  }
}

/**
 * Provider-agnostic streaming for long HTML bodies. The model slug decides the
 * provider (getModel); reasoning-capable models surface thinking via
 * `onReasoning`. This is the entry point design agents use for HTML generation
 * so swapping models is a one-line config change.
 */
export async function* streamDesign(
  systemInstruction: string,
  prompt: string,
  opts: {
    model: string;
    temperature?: number;
    maxOutputTokens?: number;
    image?: ImageInput;
    /** Additional inline images (multimodal). Appended after `image` if both given. */
    images?: ImageInput[];
    /** Receives model reasoning/thinking text when available. */
    onReasoning?: (text: string) => void;
  }
): AsyncGenerator<string> {
  const images = [...(opts.image ? [opts.image] : []), ...(opts.images ?? [])];
  const result = streamText({
    model: getModel(opts.model),
    system: systemInstruction,
    messages: [userMessage(prompt, images)],
    temperature: opts.temperature ?? 0.7,
    ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
  });

  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      if (part.text) yield part.text;
    } else if (part.type === "reasoning-delta") {
      if (part.text) opts.onReasoning?.(part.text);
    } else if (part.type === "error") {
      throw part.error;
    }
  }
}
