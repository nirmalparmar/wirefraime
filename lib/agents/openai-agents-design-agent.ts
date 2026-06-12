import { Agent as OpenAIAgent, run } from "@openai/agents";
import type { AgentOutputType } from "@openai/agents";
import { z } from "zod";
import type { DesignSystem, Platform } from "../types";
import { VIEWPORTS } from "../constants";
import {
  generateHtmlHead,
  injectSharedCSS,
  enforceSharedShell,
  extractReferencePatterns,
  extractMultiScreenPatterns,
} from "../design-template";
import { extractJson, stripLeadingFence, validateAndRepairHtml } from "./html-utils";
import { loadSkillFromDir } from "./adk-helpers";
import path from "path";

const PLANNING_MODEL = process.env.OPENAI_DESIGN_PLANNING_MODEL || process.env.OPENAI_DESIGN_MODEL || "gpt-5.5";
const STREAMING_MODEL = process.env.OPENAI_DESIGN_STREAM_MODEL || process.env.OPENAI_DESIGN_MODEL || "gpt-5.5";
const DEFAULT_LOW_RPM_INTERVAL_MS = 21_000;

const DesignPlanSchema = z.object({
  platform: z
    .enum(["web", "mobile", "tablet"])
    .describe("Target platform inferred from the app description. Default to 'web' if unclear."),
  designSystem: z.object({
    colors: z.object({
      primary: z.string(),
      secondary: z.string(),
      background: z.string(),
      surface: z.string(),
      text: z.string(),
      textMuted: z.string(),
      border: z.string(),
      success: z.string(),
      error: z.string(),
    }),
    fonts: z.object({
      primary: z.string(),
      mono: z.string(),
    }),
    layout: z.object({
      borderRadius: z.string(),
      borderRadiusLg: z.string(),
      borderRadiusSm: z.string(),
      shadow: z.string(),
      shadowLg: z.string(),
      spacingUnit: z.number(),
      cardPadding: z.string(),
      sectionGap: z.string(),
      buttonHeight: z.string(),
      inputHeight: z.string(),
      navStyle: z.enum(["sidebar", "topbar", "bottom-tabs", "none"]),
      navHeight: z.string(),
    }),
    shell: z.object({
      navHtml: z.string(),
    }),
    componentLibrary: z.object({
      buttonHtml: z.string(),
      cardHtml: z.string(),
      inputHtml: z.string(),
    }),
  }),
  screens: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
    })
  ),
});

export type DesignPlan = z.infer<typeof DesignPlanSchema>;

let cachedHallmarkInstructions: string | null = null;

async function getHallmarkInstructions(): Promise<string> {
  if (!cachedHallmarkInstructions || process.env.NODE_ENV === "development") {
    const skillPath = path.resolve(process.cwd(), ".agents/skills/gpt-taste");
    const skill = await loadSkillFromDir(skillPath);
    cachedHallmarkInstructions = skill.instructions;
    console.log(`[OpenAIDesignAgent] Hallmark skill loaded: ${cachedHallmarkInstructions.length} chars`);
  }
  return cachedHallmarkInstructions;
}

const TAILWIND_COMPONENT_GUIDE = `
TAILWIND-FIRST RULES:
- Generated HTML must use Tailwind utility classes directly.
- Use semantic tokens everywhere: bg-primary, text-primary, bg-primary-soft, bg-background, bg-surface, text-foreground, text-muted, border-border, bg-success, bg-error, rounded-card, rounded-card-lg, rounded-btn, rounded-pill, shadow-card, shadow-card-lg, shadow-focus, h-btn, h-input, h-nav, p-card, gap-section.
- Do not emit opaque ds-* classes, hardcoded color utilities like bg-blue-500, inline style colors, custom component CSS overrides, emoji icons, lorem ipsum, or placeholder data.
- Use Iconoir icon classes: <i class="iconoir-home text-[20px]"></i>.
- Use semantic HTML and add data-wf-name attributes to major structural containers.
- Keep nesting shallow enough for the live editor to target elements reliably.

COMPONENT PATTERNS:
Card: <div class="bg-surface border border-border rounded-card shadow-card p-card">...</div>
Primary button: <button class="inline-flex items-center justify-center gap-2 h-btn px-6 bg-primary text-white font-semibold rounded-btn transition hover:bg-primary-hover active:scale-[.98]">...</button>
Secondary button: <button class="inline-flex items-center justify-center gap-2 h-btn px-6 bg-transparent text-foreground font-medium border border-border rounded-btn transition hover:bg-surface">...</button>
Input: <input class="h-input w-full px-3 bg-surface border border-border rounded-btn text-foreground placeholder:text-muted transition focus:border-primary focus:shadow-focus outline-none" />
`;

async function makeAgent<TOutput extends AgentOutputType = "text">(config: {
  name: string;
  instructions: string;
  outputType?: TOutput;
  model?: string;
  temperature?: number;
}): Promise<OpenAIAgent<unknown, TOutput>> {
  const hallmark = await getHallmarkInstructions();
  const model = config.model || PLANNING_MODEL;
  const supportsTemperature = !/^(gpt-5|o[0-9])/.test(model);
  return new OpenAIAgent({
    name: config.name,
    model,
    instructions: `${config.instructions}

=== HALLMARK DESIGN SKILL ===
${hallmark}`,
    outputType: config.outputType,
    ...(supportsTemperature
      ? { modelSettings: { temperature: config.temperature ?? 0.7 } }
      : {}),
  });
}

async function* runTextStream(agent: OpenAIAgent<unknown, "text">, prompt: string): AsyncGenerator<string> {
  await waitForModelSlot(STREAMING_MODEL);
  const streamed = await run(agent, prompt, {
    stream: true,
    maxTurns: 1,
  });
  for await (const value of streamed.toTextStream({ compatibleWithNodeStreams: true })) {
    if (value) yield value.toString();
  }
}

const modelLastRequestAt = new Map<string, number>();
let modelThrottleQueue = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getModelMinIntervalMs(model: string): number {
  const override = Number(process.env.OPENAI_DESIGN_MIN_REQUEST_INTERVAL_MS);
  if (Number.isFinite(override) && override >= 0) return override;
  return /^gpt-5\.5/.test(model) ? DEFAULT_LOW_RPM_INTERVAL_MS : 0;
}

async function waitForModelSlot(model: string): Promise<void> {
  const minIntervalMs = getModelMinIntervalMs(model);
  if (minIntervalMs <= 0) return;

  const previous = modelThrottleQueue;
  let release!: () => void;
  modelThrottleQueue = previous.then(() => new Promise<void>((resolve) => {
    release = resolve;
  }));

  await previous;
  try {
    const lastRequestAt = modelLastRequestAt.get(model) ?? 0;
    const waitMs = Math.max(0, lastRequestAt + minIntervalMs - Date.now());
    if (waitMs > 0) {
      console.warn(`[OpenAIDesignAgent] Pacing ${model} request for ${Math.ceil(waitMs / 1000)}s to avoid RPM limits.`);
      await sleep(waitMs);
    }
    modelLastRequestAt.set(model, Date.now());
  } finally {
    release();
  }
}

function readHeader(headers: unknown, name: string): string | null {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(name);
  if (typeof headers === "object") {
    const value = (headers as Record<string, unknown>)[name] ?? (headers as Record<string, unknown>)[name.toLowerCase()];
    return typeof value === "string" ? value : null;
  }
  return null;
}

function getRateLimitDelayMs(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  const maybeError = err as {
    status?: number;
    code?: string;
    message?: string;
    headers?: unknown;
    error?: { message?: string };
  };
  if (maybeError.status !== 429 && maybeError.code !== "rate_limit_exceeded") return null;

  const retryAfter = readHeader(maybeError.headers, "retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.ceil(seconds * 1000) + 500;
    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) return Math.max(0, retryAt - Date.now()) + 500;
  }

  const message = `${maybeError.error?.message ?? ""} ${maybeError.message ?? ""}`;
  const secondsMatch = message.match(/try again in\s+(\d+(?:\.\d+)?)s/i);
  if (secondsMatch) return Math.ceil(Number(secondsMatch[1]) * 1000) + 500;

  return DEFAULT_LOW_RPM_INTERVAL_MS;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const rateLimitDelayMs = getRateLimitDelayMs(err);
      const delayMs = rateLimitDelayMs ?? 1000 * (attempt + 1);
      if (rateLimitDelayMs) {
        console.warn(`[OpenAIDesignAgent] Rate limited; retrying in ${Math.ceil(delayMs / 1000)}s.`);
      }
      await sleep(delayMs);
    }
  }
  throw new Error("unreachable");
}

async function getDesignSystemAgent() {
  return makeAgent<typeof DesignPlanSchema>({
    name: "hallmark_design_system_agent",
    model: PLANNING_MODEL,
    outputType: DesignPlanSchema,
    temperature: 0.6,
    instructions: `You are a world-class design system architect for Wirefraime.

Create distinctive, memorable design systems and screen plans using Hallmark's anti-slop discipline.

Rules:
- Return valid structured output matching the schema.
- Pick only screens that make sense for the app. Avoid filler screens.
- Use honest content: do not invent testimonials, impossible metrics, or fake proof.
- Choose a strong aesthetic direction based on audience, use case, and tone.
- Avoid generic purple-gradient SaaS, blue-gray corporate palettes, and one-note hue systems.
- Prefer distinctive Google Fonts. Avoid Inter, Roboto, Arial, and plain system-ui as the primary brand font.
- Use HEX color values only.
- layout, shell.navHtml, and componentLibrary are required.
- shell.navHtml must be one reusable nav element using semantic Tailwind tokens and Iconoir icons. Include one nav link per planned screen with data-nav set to the screen name.
- componentLibrary snippets must use semantic Tailwind tokens and be reusable blueprints for all screens.`,
  });
}

export async function generateDesignSystem(
  name: string,
  description: string
): Promise<DesignPlan> {
  const prompt = `Create a design system and screen plan for this app:
App: ${name} - ${description}

Platform detection:
- mobile/iOS/Android/phone/Flutter/React Native -> platform "mobile"
- iPad/tablet -> platform "tablet"
- otherwise -> platform "web"

Screen planning:
- Plan only necessary screens for this exact app.
- Name screens descriptively.
- Each screen must have a clear purpose.

Design-system output:
- Use HEX colors only.
- Use Google Font names as CSS stacks.
- Include layout tokens, shared navigation shell, and component library snippets.
- Navigation must contain one link per planned screen with data-nav equal to the screen name.
- No markdown.`;

  return withRetry(async () => {
    const agent = await getDesignSystemAgent();
    await waitForModelSlot(PLANNING_MODEL);
    const result = await run(agent, prompt, { maxTurns: 1 });
    const parsed = DesignPlanSchema.safeParse(result.finalOutput);
    if (!parsed.success) {
      const raw = typeof result.finalOutput === "string" ? result.finalOutput : JSON.stringify(result.finalOutput ?? "");
      const parsedFromJson = DesignPlanSchema.safeParse(JSON.parse(extractJson(raw)));
      if (parsedFromJson.success) return parsedFromJson.data;
      console.error("OpenAI design plan validation failed:", parsed.error.flatten());
      throw new Error("OpenAI design system generation returned invalid schema");
    }
    return parsed.data;
  });
}

async function getScreenAgent() {
  return makeAgent<"text">({
    name: "hallmark_screen_designer",
    model: STREAMING_MODEL,
    temperature: 0.7,
    instructions: `You are an elite frontend designer creating production-grade HTML app screens.

Every output must look like a real shipped product screen, not a wireframe or template.

${TAILWIND_COMPONENT_GUIDE}

Hallmark requirements:
- Apply the Hallmark design flow and slop-test discipline.
- Use structural variety appropriate to the brief.
- Do not fabricate proof, testimonials, logos, or performance metrics.
- Do not use fake browser/device/code chrome.
- No italic display headings.
- No decorative orb/blob backgrounds.
- Output a short HTML comment near the top with Hallmark pre-emit critique scores.
- Mobile must be robust: no horizontal scroll, text wraps cleanly, and controls remain tappable.

Output only raw HTML starting with <!DOCTYPE html>. No markdown fences.`,
  });
}

async function streamScreen(
  prompt: string,
  screenId: string,
  onHtmlChunk?: (screenId: string, chunk: string) => void
): Promise<string> {
  const agent = await getScreenAgent();
  let fullHtml = "";
  let isFirstChunk = true;

  for await (let chunk of runTextStream(agent, prompt)) {
    if (isFirstChunk) {
      chunk = stripLeadingFence(chunk);
      isFirstChunk = false;
    }
    fullHtml += chunk;
    try {
      onHtmlChunk?.(screenId, chunk);
    } catch {
      /* SSE closed; keep collecting for persistence. */
    }
  }

  const { repaired, errors } = validateAndRepairHtml(fullHtml);
  if (errors.length > 0) {
    console.warn(`[${screenId}] OpenAI Agents HTML repaired:`, errors.join(", "));
  }
  return repaired;
}

export async function generateScreenHtml(
  screenId: string,
  screenName: string,
  screenDescription: string,
  appName: string,
  appDescription: string,
  designSystem: DesignSystem,
  platform: Platform = "web",
  onHtmlChunk?: (screenId: string, chunk: string) => void,
  referenceScreensHtml?: string | string[]
): Promise<string> {
  const vp = VIEWPORTS[platform];
  const headTemplate = generateHtmlHead(designSystem, platform);

  const navHtml = designSystem.shell?.navHtml?.trim();
  const navStyle = designSystem.layout?.navStyle;
  const hasSharedNav = !!navHtml && !!navStyle && navStyle !== "none";
  const layoutHint =
    navStyle === "sidebar"
      ? 'Body is a flex row: <body class="min-h-screen flex bg-background text-foreground font-sans"> with the <aside> as the first child and a <main class="flex-1 min-w-0 overflow-y-auto"> holding this screen.'
      : navStyle === "bottom-tabs"
        ? "Place the <nav> fixed at the bottom; give the content wrapper pb-24 so it clears the tab bar."
        : "Place the <header> at the top; this screen's content goes below it in <main>.";

  const sharedNavCtx = hasSharedNav
    ? `\n\nShared navigation: include this element verbatim. Add the active class to its data-nav="${screenName}" link. ${layoutHint}\n${navHtml}\n`
    : "";

  const refHtmls = Array.isArray(referenceScreensHtml)
    ? referenceScreensHtml.filter(Boolean)
    : referenceScreensHtml
      ? [referenceScreensHtml]
      : [];
  const referenceCtx =
    refHtmls.length > 1
      ? `\n\n${extractMultiScreenPatterns(refHtmls, designSystem)}\n`
      : refHtmls.length === 1
        ? `\n\n${extractReferencePatterns(refHtmls[0])}\n`
        : "";

  const componentLibraryCtx = designSystem.componentLibrary
    ? `\n\nComponent library patterns to reuse:
Button:
${designSystem.componentLibrary.buttonHtml}

Card:
${designSystem.componentLibrary.cardHtml}

Input:
${designSystem.componentLibrary.inputHtml}
`
    : "";

  const platformGuidance =
    platform === "mobile"
      ? `Mobile ${vp.w}x${vp.h}: single column, touch targets >= 48px, page titles text-3xl, body text-base, min text size 12px.`
      : platform === "tablet"
        ? `Tablet ${vp.w}x${vp.h}: split-view layouts work well, touch targets >= 44px, page titles text-3xl.`
        : `Web ${vp.w}x${vp.h}: use clear desktop layout, max-width containers or sidebar/content, hover states on interactive elements.`;

  const prompt = `Generate a complete, self-contained HTML document for the "${screenName}" screen of "${appName}".

Screen purpose: ${screenDescription}
App context: ${appDescription}
Platform: ${platform} (${vp.w}x${vp.h})

Use this exact head section:
${headTemplate}

After </head>, add body and screen content. Body should use Tailwind utilities like min-h-screen bg-background text-foreground font-sans.

Styling:
- Use only Tailwind utilities and semantic tokens from the head.
- No custom style blocks that redefine component appearance.
- No ds-* classes, hardcoded Tailwind colors, emoji icons, lorem ipsum, fake metrics, or empty sections.
- Use real, domain-appropriate content at realistic density.
- Use Iconoir icons throughout.
- Add data-wf-name to major editable containers.
- Keep nav and component patterns consistent across screens.

${platformGuidance}
${sharedNavCtx}
${componentLibraryCtx}
${referenceCtx}

Output only the HTML starting with <!DOCTYPE html>.`;

  let html = await streamScreen(prompt, screenId, onHtmlChunk);
  html = injectSharedCSS(html, designSystem, platform);
  return enforceSharedShell(html, navHtml, navStyle, screenName);
}
