import fs from 'fs';
import path from 'path';
import { LlmAgent, InMemoryRunner } from "@google/adk";
import type { Content } from "@google/genai";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
  model: string;
  instructions: string;
  tools?: SkillToolset[];
  outputSchema?: any;
  temperature?: number;
}

export class Agent {
  private adkAgent: LlmAgent;
  private runner: InMemoryRunner;
  private systemInstruction: string;

  constructor(config: AgentConfig) {
    let combinedInstructions = config.instructions;

    // Inject skill instructions into the system prompt
    if (config.tools) {
      for (const toolset of config.tools) {
        if (toolset instanceof SkillToolset) {
          for (const skill of toolset.skills) {
             combinedInstructions += `\n\n=== SKILL: ${skill.frontmatter.name || 'Unknown'} ===\n${skill.frontmatter.description || ''}\n\n${skill.instructions}`;
          }
        }
      }
    }

    this.systemInstruction = combinedInstructions;

    this.adkAgent = new LlmAgent({
      name: config.name,
      model: config.model,
      instruction: this.systemInstruction,
      outputSchema: config.outputSchema,
      generateContentConfig: {
        maxOutputTokens: 16384,
        temperature: config.temperature ?? 0.7,
      }
    });

    this.runner = new InMemoryRunner({ agent: this.adkAgent, appName: "wirefraime" });
  }

  async *chatStream(prompt: string): AsyncGenerator<string> {
    const message: Content = { role: "user", parts: [{ text: prompt }] };
    for await (const event of this.runner.runEphemeral({
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

  async chat(prompt: string) {
    let text = "";
    for await (const chunk of this.chatStream(prompt)) {
      text += chunk;
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
  }
): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: opts?.model ?? "gemini-2.5-pro-preview-05-06",
    systemInstruction,
    generationConfig: {
      temperature: opts?.temperature ?? 0.7,
      maxOutputTokens: opts?.maxOutputTokens ?? 65536,
    },
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
    const text = chunk.text();
    if (text) yield text;
  }
}
