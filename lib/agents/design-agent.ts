import { InMemoryRunner, LlmAgent } from "@google/adk";
import type { Content, Part } from "@google/genai";
import { z } from "zod";
import type { DesignSystem, Screen, Platform } from "../types";
import { VIEWPORTS } from "../constants";
import { loadSkillFromDir, streamWithGemini } from "./adk-helpers";
import {
  generateHtmlHead,
  injectSharedCSS,
  extractReferencePatterns,
  extractMultiScreenPatterns,
} from "../design-template";
import {
  extractJson,
  stripLeadingFence,
  validateAndRepairHtml,
  applyPatchOps,
} from "./html-utils";
import { randomUUID } from "crypto";
import path from "path";

/**
 * Model selection by task.
 * - PLANNING_MODEL: used for JSON-structured planners (design system, chat plan, patch ops).
 *   Flash-lite frequently returns malformed JSON here — pro is worth the cost.
 * - STREAMING_MODEL: used for long HTML bodies where speed matters more than reasoning.
 * - CRITIC_MODEL: used for the critique/refine pass (short structured output).
 */
const PLANNING_MODEL = "gemini-3.1-pro-preview";
const STREAMING_MODEL = "gemini-3.1-flash-lite-preview";
const CRITIC_MODEL = "gemini-3.1-pro-preview";

// ── Zod schemas ───────────────────────────────────────────────

const DesignPlanSchema = z.object({
  platform: z
    .enum(["web", "mobile", "tablet"])
    .describe("Target platform inferred from the app description. Use 'mobile' for phone apps, 'tablet' for iPad/tablet apps, 'web' for desktop/web apps. Default to 'web' if unclear."),
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
      borderRadius: z.string().describe("Card/component border radius, e.g. '12px'"),
      borderRadiusLg: z.string().describe("Large container border radius, e.g. '16px'"),
      borderRadiusSm: z.string().describe("Button/input border radius, e.g. '8px'"),
      shadow: z.string().describe("Default card shadow, e.g. '0 1px 3px rgba(0,0,0,0.06)'"),
      shadowLg: z.string().describe("Elevated shadow, e.g. '0 4px 12px rgba(0,0,0,0.1)'"),
      spacingUnit: z.number().describe("Base spacing unit in px, typically 8"),
      cardPadding: z.string().describe("Default card inner padding, e.g. '24px'"),
      sectionGap: z.string().describe("Gap between major sections, e.g. '32px'"),
      buttonHeight: z.string().describe("Primary button height, e.g. '44px'"),
      inputHeight: z.string().describe("Input field height, e.g. '40px'"),
      navStyle: z.enum(["sidebar", "topbar", "bottom-tabs", "none"]).describe("Navigation pattern"),
      navHeight: z.string().describe("Navigation bar height, e.g. '56px'"),
    }).optional(),
  }),
  screens: z.array(
    z.object({ id: z.string(), name: z.string(), description: z.string() })
  ),
});

const ChatPlanSchema = z.object({
  reply: z.string().describe("One sentence acknowledging what you will do."),
  action: z
    .enum(["edit", "create"])
    .describe("Use 'create' when the user wants a NEW screen added (e.g. 'create a login page', 'add a settings screen'). Use 'edit' when modifying existing screens."),
  targetScreenId: z
    .string()
    .describe("For 'edit': exact ID of the screen to modify, or 'ALL' for global changes. For 'create': set to 'NEW'."),
  newScreenName: z
    .string()
    .optional()
    .describe("For 'create' action only: name of the new screen to create, e.g. 'Login', 'Settings', 'Profile'."),
  changeDescription: z
    .string()
    .describe("Precise, detailed description of every change to make in the HTML, or for 'create': description of what the new screen should contain."),
});

const PatchOpsSchema = z.object({
  operations: z.array(z.object({
    search: z.string().describe("HTML snippet to find. Must appear exactly ONCE in the document. Whitespace-tolerant matching is used, so slight indentation drift is OK — but structural content must match character-for-character."),
    replace: z.string().describe("The HTML snippet to replace it with. Use empty string to delete an element. Preserve surrounding Tailwind class patterns."),
    description: z.string().describe("One-line summary of this operation, e.g. 'Change header background to primary'"),
  })).describe("Ordered list of patch operations. Each applies to the result of the previous."),
});

const CritiqueSchema = z.object({
  score: z.number().min(0).max(10).describe("Overall quality score 0-10"),
  passes: z.boolean().describe("true if score >= 7 AND no critical issues"),
  issues: z.array(z.string()).describe("Specific, actionable issues. Empty if the screen is good."),
  refineInstruction: z.string().optional().describe("If passes=false, a concrete instruction for how to fix the issues in one regeneration pass."),
});

export type DesignPlan = z.infer<typeof DesignPlanSchema>;
type ChatPlan = z.infer<typeof ChatPlanSchema>;
type Critique = z.infer<typeof CritiqueSchema>;

// ── Skill loading ─────────────────────────────────────────────

let cachedSkillContent: string | null = null;
async function getSkillInstructions(): Promise<string> {
  if (!cachedSkillContent || process.env.NODE_ENV === "development") {
    const skillPath = path.resolve(process.cwd(), "skill/frontend-design");
    const skill = await loadSkillFromDir(skillPath);
    cachedSkillContent = skill.instructions;
    console.log(`[DesignAgent] Skill loaded: ${cachedSkillContent.length} chars`);
    const refs = cachedSkillContent.match(/=== REFERENCE: .+ ===/g);
    if (refs) {
      console.log(`[DesignAgent] References loaded: ${refs.map(r => r.replace(/=== REFERENCE: | ===/g, "")).join(", ")}`);
    }
  }
  return cachedSkillContent;
}

// ── Tailwind-first generation guidance (shared across prompts) ──────

const TAILWIND_COMPONENT_GUIDE = `
TAILWIND-FIRST RULES (NON-NEGOTIABLE):

Generated HTML MUST use Tailwind utility classes directly. Do NOT use opaque component classes like "ds-card" or "ds-btn-primary". Every styling decision is visible in the class attribute so it can be edited by swapping classes.

SEMANTIC TOKENS (registered in tailwind.config — use these everywhere):
  Colors:
    - bg-primary / text-primary / border-primary / bg-primary-soft / hover:bg-primary-hover
    - bg-secondary / text-secondary
    - bg-background (page) / bg-surface (cards/panels)
    - text-foreground (body text) / text-muted (secondary text)
    - border-border
    - bg-success / text-success / bg-success-soft
    - bg-error / text-error / bg-error-soft
  Radii:
    - rounded-card (default card/container)
    - rounded-card-lg (large containers)
    - rounded-btn (buttons, inputs)
    - rounded-pill (badges, pill buttons)
    - rounded-full (avatars, circle icons)
  Shadows:
    - shadow-card (default elevation)
    - shadow-card-lg (elevated panels, modals)
    - shadow-focus (focus rings)
  Heights:
    - h-btn (standard button height)
    - h-input (standard input height)
    - h-nav (navbar height)
  Spacing aliases:
    - p-card (card inner padding)
    - gap-section / mb-section (section spacing)
  Fonts:
    - font-sans (default — body font, auto-loaded)
    - font-mono (for code, numbers)

COMPONENT PATTERNS — write these explicitly with Tailwind classes:

Card (default):
  <div class="bg-surface border border-border rounded-card shadow-card p-card">...</div>

Card (large):
  <div class="bg-surface border border-border rounded-card-lg shadow-card-lg p-card">...</div>

Primary button:
  <button class="inline-flex items-center justify-center gap-2 h-btn px-6 bg-primary text-white font-semibold rounded-btn transition hover:bg-primary-hover active:scale-[.98]">
    <i class="iconoir-plus"></i> Add item
  </button>

Secondary button:
  <button class="inline-flex items-center justify-center gap-2 h-btn px-6 bg-transparent text-foreground font-medium border border-border rounded-btn transition hover:bg-surface">
    Cancel
  </button>

Ghost button:
  <button class="inline-flex items-center gap-2 h-9 px-3 text-muted font-medium rounded-btn transition hover:bg-surface hover:text-foreground">
    More
  </button>

Input:
  <input class="h-input w-full px-3 bg-surface border border-border rounded-btn text-foreground placeholder:text-muted transition focus:border-primary focus:shadow-focus outline-none" placeholder="Search..." />

Badge (solid):
  <span class="inline-flex items-center px-2.5 py-0.5 bg-primary text-white text-xs font-semibold rounded-pill">New</span>

Badge (soft success):
  <span class="inline-flex items-center px-2.5 py-0.5 bg-success-soft text-success text-xs font-semibold rounded-pill">Active</span>

Avatar:
  <img src="https://i.pravatar.cc/80?u=ada" class="w-10 h-10 rounded-full object-cover" alt="Ada Chen" />

Top nav:
  <header class="flex items-center h-nav px-6 bg-surface border-b border-border gap-2 sticky top-0 z-10">...</header>

Bottom tab bar (mobile):
  <nav class="fixed bottom-0 left-0 right-0 flex items-center justify-around h-nav bg-surface border-t border-border">
    <a class="flex flex-col items-center gap-0.5 flex-1 text-xs text-muted hover:text-foreground [&.active]:text-primary [&.active]:font-semibold active">
      <i class="iconoir-home text-[22px]"></i><span>Home</span>
    </a>
    ...
  </nav>

Sidebar nav:
  <aside class="w-64 shrink-0 flex flex-col bg-surface border-r border-border py-5">
    <a class="flex items-center gap-3 px-5 py-2.5 text-[15px] text-muted transition hover:bg-background hover:text-foreground [&.active]:text-primary [&.active]:bg-primary-soft [&.active]:font-semibold">
      <i class="iconoir-dashboard-dots text-[20px]"></i>Dashboard
    </a>
    ...
  </aside>

Divider:
  <div class="h-px bg-border my-4 w-full"></div>

Status dot:
  <span class="w-2 h-2 rounded-full bg-success shrink-0"></span>

TYPOGRAPHY — use Tailwind utilities directly (NOT ds-* classes):
  Page title:      class="text-4xl font-bold tracking-tight text-foreground"  (mobile: text-3xl)
  Section heading: class="text-2xl font-semibold tracking-tight text-foreground"
  Card title:      class="text-lg font-semibold text-foreground"
  Body:            class="text-base text-foreground leading-relaxed"
  Caption:         class="text-sm text-muted"
  Small:           class="text-xs text-muted"
  ABSOLUTE MIN on mobile: 12px (text-xs). ABSOLUTE MIN on web: 13px.

ICONS — MANDATORY Iconoir (never emoji):
  <i class="iconoir-home text-[20px]"></i>
  Common: iconoir-home, iconoir-search, iconoir-settings, iconoir-user, iconoir-plus, iconoir-edit,
  iconoir-trash, iconoir-heart, iconoir-star, iconoir-bell, iconoir-mail, iconoir-calendar,
  iconoir-clock, iconoir-check, iconoir-arrow-right, iconoir-arrow-left, iconoir-dashboard-dots,
  iconoir-graph-up, iconoir-wallet, iconoir-credit-card, iconoir-shopping-bag, iconoir-chat-bubble,
  iconoir-image, iconoir-folder, iconoir-lock, iconoir-log-out, iconoir-menu, iconoir-filter,
  iconoir-more-horiz, iconoir-more-vert, iconoir-download, iconoir-upload, iconoir-share-android,
  iconoir-music-double-note, iconoir-play, iconoir-pause, iconoir-shuffle, iconoir-skip-next.

IMAGES — use real Unsplash URLs, not placeholders:
  Product/album/food: <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop" class="w-full aspect-square object-cover rounded-card" />
  Avatars: <img src="https://i.pravatar.cc/80?u=unique-name" class="w-10 h-10 rounded-full" />

FORBIDDEN (these make the output unusable):
  - ds-card / ds-btn-primary / ds-input etc. (OLD opaque classes — DO NOT emit)
  - bg-white / bg-black / bg-gray-* / bg-blue-* etc. (HARDCODED colors — always use semantic tokens)
  - Inline style="background:..." (always use Tailwind utilities)
  - Custom <style> blocks that redefine component look (breaks the design system)
  - Lorem ipsum content (use realistic names, numbers, dates)
`;

// ── Agents (lazy-initialized with skill) ──────────────────────

let _designSystemAgent: LlmAgent | null = null;
async function getDesignSystemAgent(): Promise<LlmAgent> {
  if (!_designSystemAgent) {
    const skillInstr = await getSkillInstructions();
    _designSystemAgent = new LlmAgent({
      name: "design_system_agent",
      model: PLANNING_MODEL,
      instruction: `You are a world-class design system architect. You create distinctive, memorable design systems — not generic "AI slop".

Before choosing colors/fonts, think about:
- The app's domain, audience, and emotional tone
- Pick a BOLD aesthetic direction: brutally minimal, luxury/refined, editorial/magazine, retro-futuristic, organic/natural, industrial, playful, etc.
- Colors should be a cohesive palette with a dominant color and sharp accents — NOT timid, evenly-distributed palettes

TYPOGRAPHY RULES:
- NEVER use Inter, Roboto, Arial, system-ui, or other overused fonts
- Choose distinctive Google Fonts that match the aesthetic. Examples by tone:
  - Editorial/luxury: "Playfair Display", "Cormorant Garamond", "Libre Baskerville"
  - Modern/geometric: "Outfit", "Sora", "General Sans", "Plus Jakarta Sans"
  - Playful: "Fredoka", "Quicksand", "Baloo 2"
  - Technical/mono: "JetBrains Mono", "IBM Plex Mono", "Fira Code"
  - Brutalist: "Bebas Neue", "Anton", "Archivo Black"
- Pair a distinctive display/heading font with a refined body font

COLOR RULES:
- NEVER use generic purple-gradient-on-white or blue-gray corporate palettes
- Commit to a palette with PERSONALITY: warm terracotta, deep forest green, bold coral, midnight navy, sage + gold, etc.
- Background should set atmosphere — off-whites, warm grays, light tints, or dark themes
- Every color must feel intentional and cohesive
- Use HEX format (#RRGGBB) for all colors — no rgba, no hsl

LAYOUT TOKEN RULES:
- Border-radius philosophy: sharp (4-6px), standard (10-14px), rounded (16-24px), or pill-first (999px on buttons only)
- ONE shadow style: flat (0 0 0 transparent), subtle (0 1px 3px rgba(0,0,0,0.06)), elevated (0 4px 12px rgba(0,0,0,0.1)), dramatic (0 8px 24px rgba(0,0,0,0.15))
- Navigation: "sidebar" for dashboards/tools, "topbar" for marketing/content sites, "bottom-tabs" for mobile apps, "none" for simple pages
- Button height: 40-44px for compact, 48-52px for standard mobile, 56px for spacious
- All values must be concrete CSS values (e.g. "12px", "0 1px 3px rgba(0,0,0,0.06)")

=== DESIGN SKILL ===
${skillInstr}

Return valid JSON matching the required schema. No markdown, no explanation.`,
      outputSchema: DesignPlanSchema,
      generateContentConfig: { maxOutputTokens: 4096, temperature: 0.7 },
    });
  }
  return _designSystemAgent;
}

const chatPlannerAgent = new LlmAgent({
  name: "chat_planner_agent",
  model: PLANNING_MODEL,
  instruction: `You are an AI assistant for a wireframe design tool.
Given an app's screens and a user request, determine the action to take: edit existing screens or create a new one.

ACTION DETECTION:
- "create a login screen" → action: "create", newScreenName: "Login", targetScreenId: "NEW"
- "add a settings page" → action: "create", newScreenName: "Settings", targetScreenId: "NEW"
- "I need a profile page" → action: "create", newScreenName: "Profile", targetScreenId: "NEW"
- "build me a checkout flow" → action: "create", newScreenName: "Checkout", targetScreenId: "NEW"
- "make the header blue" → action: "edit", targetScreenId: specific ID
- "change the font everywhere" → action: "edit", targetScreenId: "ALL"

Use action: "create" when the user wants a NEW screen that doesn't exist yet.
Use action: "edit" when modifying existing screens.

MULTI-SCREEN DETECTION (for edit action):
If the user's request applies to ALL screens (not just one), set targetScreenId to "ALL".
Examples of multi-screen requests:
- "Change the primary color to blue" → ALL (affects every screen)
- "Update the font to Inter" → ALL (global style)
- "Make all buttons rounded" → ALL (affects buttons on every screen)
- "Change the nav background across all pages" → ALL
- "Use a darker background everywhere" → ALL

Examples of single-screen requests:
- "Add a search bar to the dashboard" → specific screen ID
- "Change the title on the settings page" → specific screen ID
- "Remove the sidebar from the profile screen" → specific screen ID

When in doubt and the request mentions "all", "every", "across", "everywhere", or is about global styles (colors, fonts, border radius, shadows), use "ALL".
Otherwise, use the exact screen ID from the provided list.
Return valid JSON matching the required schema.`,
  outputSchema: ChatPlanSchema,
  generateContentConfig: { maxOutputTokens: 1024, temperature: 0.2 },
});

const patchAgent = new LlmAgent({
  name: "patch_agent",
  model: PLANNING_MODEL,
  instruction: `You produce surgical patch operations on HTML documents.

Given the current HTML and a change description, output the MINIMUM search/replace operations to achieve the change.

CRITICAL RULES:
1. Each "search" string is an exact substring of the current HTML — copy it verbatim.
2. Each "search" string must be UNIQUE in the document (appears exactly ONCE). Add surrounding context if needed.
3. Operations are applied SEQUENTIALLY — later operations see the result of earlier ones.
4. Keep operations MINIMAL. Don't rewrite a whole <div> when swapping two class names works.
5. For ADDING elements: search for a nearby landmark (closing tag of a parent) and replace it with new content + that landmark.
6. For DELETING elements: set "replace" to empty string.
7. Prefer CLASS-SWAP operations for style changes. Example: to change a button's color, replace just the class attribute, not the whole button.
8. When changing text content, include the surrounding HTML tags in the search to ensure uniqueness.
9. ICONS: Use Iconoir classes (<i class="iconoir-icon-name"></i>). NEVER emoji or unicode icons.
10. COLORS: Use semantic Tailwind tokens — bg-primary, text-foreground, border-border. NEVER hardcoded bg-blue-500 etc.
11. Preserve the existing Tailwind class patterns used elsewhere in the document.

Return valid JSON matching the required schema. No markdown, no explanation.`,
  outputSchema: PatchOpsSchema,
  generateContentConfig: { maxOutputTokens: 4096, temperature: 0.1 },
});

const criticAgent = new LlmAgent({
  name: "critic_agent",
  model: CRITIC_MODEL,
  instruction: `You are a senior product designer reviewing a generated UI screen against a strict rubric.

Rate 0-10 on:
- Visual hierarchy (ONE primary focus, supporting elements subordinate)
- Content realism (real names/numbers/dates, NOT lorem ipsum or "User 1", "$XX.XX")
- Density (enough content — e.g. 8+ products on a store screen, 15+ songs on a music home)
- Typography (proper size scale, no tiny text, readable line-heights)
- Icon usage (Iconoir icons throughout, ZERO emoji)
- Consistency (uses Tailwind semantic tokens: bg-primary, text-foreground, rounded-card — no hardcoded bg-blue-500, no ds-* classes)

CRITICAL FAILURES (auto-fail, score ≤ 4):
- Contains lorem ipsum, "Name Here", "User 1", "$XX.XX", or obvious placeholders
- Uses emoji instead of Iconoir icons
- Uses hardcoded Tailwind colors (bg-blue-500, text-red-600) instead of semantic tokens
- Uses ds-* classes (ds-card, ds-btn-primary) — these are forbidden
- Completely empty sections (<div></div> with no content)
- Text smaller than 12px
- Severely misaligned layout (e.g. overlapping elements)

passes = true iff score >= 7 AND no critical failures.

If passes=false, write a concise refineInstruction (1-3 sentences) telling the generator exactly what to fix.

Return valid JSON matching the required schema.`,
  outputSchema: CritiqueSchema,
  generateContentConfig: { maxOutputTokens: 1024, temperature: 0.2 },
});

let _screenEditorInstr: string | null = null;
async function getScreenEditorInstructions(): Promise<string> {
  if (!_screenEditorInstr) {
    const skillInstr = await getSkillInstructions();
    _screenEditorInstr = `You are an expert frontend editor. You modify HTML screens with surgical precision while maintaining design excellence.

${TAILWIND_COMPONENT_GUIDE}

EDITING RULES:
- Make ONLY the requested changes — preserve all other content, structure, and styling exactly
- Maintain the existing design language: same fonts, Tailwind semantic tokens, spacing, radius
- Any new elements you add must match the existing component patterns (same button/card class stacks)
- Keep CSS variables for colors — never replace var(--color-*) with hardcoded values
- Use the Tailwind semantic tokens above (bg-primary, text-foreground, rounded-card, shadow-card, h-btn, etc.) — NEVER opaque ds-* classes or raw colors like bg-blue-500
- Preserve all hover states, transitions, and visual refinements
- ICONS: ALWAYS use Iconoir classes. NEVER emoji or unicode.

=== DESIGN SKILL ===
${skillInstr}

Output ONLY the complete modified HTML starting with <!DOCTYPE html>. No markdown, no explanation.`;
  }
  return _screenEditorInstr;
}

let _screenGenInstructions: string | null = null;
async function getScreenGenInstructions(): Promise<string> {
  if (!_screenGenInstructions) {
    const skillInstr = await getSkillInstructions();
    _screenGenInstructions = `You are an elite frontend designer creating production-grade UI screens.
You generate complete, self-contained HTML that looks like REAL shipped products — not wireframes, not mockups, but ACTUAL premium app screens.

QUALITY BAR: Think Apple Music, Spotify, Stripe Dashboard, Linear, Notion, Nike App. Every screen must look like it was designed by a senior designer at a top company. If it looks like a template or wireframe, you have FAILED.

${TAILWIND_COMPONENT_GUIDE}

VISUAL RICHNESS — MANDATORY:
- Use real images from Unsplash with specific photo URLs matching content (album art, food, products, landscapes). NEVER colored rectangles or placeholder shapes.
- Real avatars: https://i.pravatar.cc/80?u=unique-name
- Cards need depth — proper shadow-card, rounded-card, hover states, clear hierarchy
- Decorative gradients (via bg-gradient-to-br from-primary to-secondary) ONLY when aesthetically purposeful

LAYOUT EXCELLENCE:
- Every screen needs clear visual hierarchy — ONE primary focus element
- Generous negative space — cramped layouts look cheap
- Align to grid — consistent gutters (Tailwind gap-4, gap-6, gap-8)
- Mobile: full-width edge-to-edge, safe areas, bottom nav with pb-20 on content
- Web: max-width containers (max-w-6xl, max-w-7xl), sidebar + content layouts

CONTENT — REALISTIC AND DENSE:
- Real names (Sarah Chen, Marcus Williams, Ada Patel), real numbers ($4,280.50), real dates (Mar 15, 2026)
- ZERO Lorem ipsum, "User 1", "$XX.XX", or placeholder text
- Music home needs 15+ songs; e-commerce needs 8+ products; dashboard needs real metrics

DESIGN CONSISTENCY:
- Every screen MUST look like it belongs to the same product
- Same Tailwind class patterns for nav, cards, buttons, typography
- If a reference screen is provided, MATCH its class patterns character-by-character

Output ONLY raw HTML starting with <!DOCTYPE html>. No markdown.

=== DESIGN SKILL ===
${skillInstr}`;
  }
  return _screenGenInstructions;
}

// ── Runner helpers ────────────────────────────────────────────

function makeRunner(agent: LlmAgent, appName: string) {
  return new InMemoryRunner({ agent, appName });
}

function userMessage(text: string): Content {
  return { role: "user", parts: [{ text }] };
}

function buildMessage(prompt: string | Content): Content {
  return typeof prompt === "string" ? userMessage(prompt) : prompt;
}

function multimodalMessage(text: string, imageBase64?: string, mimeType?: string): Content {
  const parts: Part[] = [{ text }];
  if (imageBase64 && mimeType) {
    parts.push({ inlineData: { mimeType, data: imageBase64 } });
  }
  return { role: "user", parts };
}

async function* streamAgent(
  agent: LlmAgent,
  appName: string,
  prompt: string | Content
): AsyncGenerator<string> {
  const runner = makeRunner(agent, appName);
  for await (const event of runner.runEphemeral({
    userId: "system",
    newMessage: buildMessage(prompt),
  })) {
    if (!event.content?.parts) continue;
    for (const part of event.content.parts) {
      if (typeof part.text === "string" && part.text) yield part.text;
    }
  }
}

async function collectAgent(
  agent: LlmAgent,
  appName: string,
  prompt: string | Content
): Promise<string> {
  let result = "";
  for await (const chunk of streamAgent(agent, appName, prompt)) result += chunk;
  return result;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error("unreachable");
}

// ── Public API ────────────────────────────────────────────────

export async function generateDesignSystem(
  name: string,
  description: string
): Promise<DesignPlan> {
  const prompt = `Create a design system and screen plan for this app:
App: ${name} — ${description}

SCREEN PLANNING RULES:
- Analyze the app description and plan ONLY the screens that make sense for THIS specific app
- A simple utility might need 3-4 screens, a full SaaS product might need 6-8, a landing page might need just 1-2
- Each screen must have a clear, distinct purpose — no filler screens
- Name screens descriptively (e.g. "Transaction History", "Workout Tracker", "Chat Inbox")

PLATFORM DETECTION:
- If the description mentions "mobile app", "iOS", "Android", "phone", "React Native", "Flutter" → platform: "mobile"
- If the description mentions "iPad", "tablet" → platform: "tablet"
- Otherwise → platform: "web"
- The platform affects viewport size: mobile=390×844, tablet=1024×768, web=1440×900

LAYOUT TOKENS (required, under designSystem.layout):
- borderRadius, borderRadiusLg, borderRadiusSm, shadow, shadowLg, spacingUnit, cardPadding, sectionGap, buttonHeight, inputHeight, navStyle, navHeight
- These become Tailwind utilities (rounded-card, shadow-card, h-btn, p-card, h-nav) used throughout every screen
- Choose values that match the app's aesthetic

COLOR VALUES: use HEX format only (#RRGGBB). No rgba(), no hsl().
FONTS: use Google Font names as CSS font stacks, e.g. "Outfit, system-ui, sans-serif".`;

  return withRetry(async () => {
    const dsAgent = await getDesignSystemAgent();
    const raw = await collectAgent(dsAgent, "wirefraime-design", prompt);
    let json: unknown;
    try {
      json = JSON.parse(extractJson(raw));
    } catch {
      console.error("Failed to parse design plan JSON:", raw.slice(0, 500));
      throw new Error("Design system returned invalid JSON — retrying");
    }
    const parsed = DesignPlanSchema.safeParse(json);
    if (!parsed.success) {
      console.error("Design plan validation failed:", parsed.error.flatten());
      throw new Error("Design system generation returned invalid schema");
    }
    return parsed.data;
  });
}

/**
 * Generate a screen. Uses streaming for live iframe rendering.
 * Post-processes with HTML validation + repair before returning.
 *
 * Optionally runs a critique/refine pass if enableCritique=true.
 */
export async function generateScreenHtml(
  screenId: string,
  screenName: string,
  screenDescription: string,
  appName: string,
  appDescription: string,
  designSystem: DesignSystem,
  platform: Platform = "web",
  onHtmlChunk?: (screenId: string, chunk: string) => void,
  referenceScreensHtml?: string | string[],
  enableCritique = true
): Promise<string> {
  const vp = VIEWPORTS[platform];
  const headTemplate = generateHtmlHead(designSystem, platform);

  // Build reference context. Accepts either a single HTML string (legacy) or an array
  // for multi-screen consistency.
  const refHtmls = Array.isArray(referenceScreensHtml)
    ? referenceScreensHtml.filter(Boolean)
    : referenceScreensHtml
      ? [referenceScreensHtml]
      : [];
  const referenceCtx = refHtmls.length > 1
    ? `\n\n${extractMultiScreenPatterns(refHtmls, designSystem)}\n`
    : refHtmls.length === 1
      ? `\n\n${extractReferencePatterns(refHtmls[0])}\n`
      : "";

  const platformGuidance = platform === "mobile"
    ? `MOBILE (${vp.w}×${vp.h} — iPhone 14):
  - Single column, full-width content, generous padding
  - Touch targets: buttons ≥ 48px (use h-btn which is already sized for mobile)
  - Bottom tab bar fixed, main content has pb-20 to clear it
  - Page titles: text-3xl font-bold tracking-tight
  - Min text size: 12px (text-xs). Body: 16px (text-base).`
    : platform === "tablet"
      ? `TABLET (${vp.w}×${vp.h} — iPad):
  - Split-view: sidebar (w-64 or w-72) + main content
  - Touch targets ≥ 44px
  - Page titles: text-3xl font-bold
  - Body: text-base`
      : `WEB (${vp.w}×${vp.h} — Desktop):
  - Sidebar + content layout OR top nav + centered max-width container (max-w-6xl)
  - Page titles: text-4xl font-bold tracking-tight
  - Cards in grids: grid-cols-2/3/4 with gap-6 or gap-8
  - Hover states on ALL interactive elements`;

  const prompt = `Generate a complete, self-contained HTML document for the "${screenName}" screen of "${appName}".

Screen purpose: ${screenDescription}
App context: ${appDescription}
Platform: ${platform} (${vp.w}×${vp.h})

1. Use this EXACT <head> section verbatim — it loads Tailwind, the semantic tokens, fonts, and Iconoir:
${headTemplate}

2. After </head>, add <body class="..."> and your screen content. The <body> should use Tailwind utilities like "min-h-screen bg-background text-foreground font-sans".

3. Use Tailwind semantic tokens for ALL styling — bg-primary, text-foreground, rounded-card, shadow-card, h-btn, p-card, etc. See the component patterns in the system instructions.

4. Do NOT write custom <style> blocks that override component appearance. All style comes from Tailwind classes + the injected semantic tokens.

${platformGuidance}

CONTENT DENSITY (non-negotiable):
- Fill screens with REAL content at realistic density
- Use Iconoir icons (never emoji)
- Real names (Sarah Chen, Marcus Williams, Ada Patel), prices ($4,280.50), dates (Mar 15, 2026)
${referenceCtx}

Output ONLY the HTML starting with <!DOCTYPE html>. No markdown fences.`;

  const sysInstr = await getScreenGenInstructions();
  const html = await streamScreen(sysInstr, prompt, screenId, onHtmlChunk);
  let finalHtml = injectSharedCSS(html, designSystem, platform);

  if (enableCritique) {
    finalHtml = await critiqueAndRefine(
      finalHtml,
      screenName,
      screenDescription,
      sysInstr,
      designSystem,
      platform,
      screenId,
      onHtmlChunk
    );
  }

  return finalHtml;
}

/**
 * Stream HTML generation and collect. Applies fence stripping on first chunk
 * and validates/repairs the final output.
 */
async function streamScreen(
  sysInstr: string,
  prompt: string,
  screenId: string,
  onHtmlChunk?: (screenId: string, chunk: string) => void,
  opts?: { image?: { data: string; mimeType: string }; maxTokens?: number }
): Promise<string> {
  let fullHtml = "";
  let isFirstChunk = true;

  for await (let chunk of streamWithGemini(sysInstr, prompt, {
    model: STREAMING_MODEL,
    temperature: 0.7,
    maxOutputTokens: opts?.maxTokens ?? 65536,
    image: opts?.image,
  })) {
    if (isFirstChunk) {
      chunk = stripLeadingFence(chunk);
      isFirstChunk = false;
    }
    fullHtml += chunk;
    try {
      onHtmlChunk?.(screenId, chunk);
    } catch {
      /* SSE closed, keep collecting */
    }
  }

  const { repaired, errors } = validateAndRepairHtml(fullHtml);
  if (errors.length > 0) {
    console.warn(`[${screenId}] HTML repaired:`, errors.join(", "));
  }
  return repaired;
}

/**
 * Run a critique pass; if it fails, regenerate with fix instructions (once).
 * Bounded cost: one extra critic call + optionally one extra generate call.
 */
async function critiqueAndRefine(
  html: string,
  screenName: string,
  screenDescription: string,
  sysInstr: string,
  designSystem: DesignSystem,
  platform: Platform,
  screenId: string,
  onHtmlChunk?: (screenId: string, chunk: string) => void
): Promise<string> {
  try {
    const critique = await runCritique(html, screenName);
    if (!critique || critique.passes) {
      if (critique) {
        console.log(`[${screenId}] critique passed (score: ${critique.score})`);
      }
      return html;
    }

    console.log(
      `[${screenId}] critique failed (score: ${critique.score}): ${critique.issues.join("; ")}`
    );

    if (!critique.refineInstruction) return html;

    const headTemplate = generateHtmlHead(designSystem, platform);
    const refinePrompt = `Regenerate the "${screenName}" screen. The previous version had these issues:

${critique.issues.map((i) => `- ${i}`).join("\n")}

Fix instruction: ${critique.refineInstruction}

Original screen purpose: ${screenDescription}

Use this EXACT <head> section:
${headTemplate}

Output ONLY the complete fixed HTML starting with <!DOCTYPE html>. No markdown.`;

    const refinedHtml = await streamScreen(sysInstr, refinePrompt, screenId, onHtmlChunk);
    return injectSharedCSS(refinedHtml, designSystem, platform);
  } catch (err) {
    console.warn(`[${screenId}] critique/refine failed, keeping original:`, err);
    return html;
  }
}

async function runCritique(html: string, screenName: string): Promise<Critique | null> {
  // Strip the <head> block so the critic only reviews body content — saves tokens
  // and the head is template-generated anyway.
  const bodyMatch = html.match(/<body[\s\S]*<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[0] : html;
  const truncated = bodyHtml.length > 12000 ? bodyHtml.slice(0, 12000) + "\n...(truncated)" : bodyHtml;

  const prompt = `Screen name: "${screenName}"

Screen HTML (body):
${truncated}

Evaluate against the rubric. Return JSON.`;

  try {
    const raw = await collectAgent(criticAgent, "wirefraime-critique", prompt);
    const parsed = CritiqueSchema.safeParse(JSON.parse(extractJson(raw)));
    return parsed.success ? parsed.data : null;
  } catch (e) {
    console.warn("Critique call failed:", e);
    return null;
  }
}

// ── Chat editing ──────────────────────────────────────────────

export type ChatEditEvent =
  | { type: "plan"; reply: string; targetScreenId: string; targetScreenName: string; multiScreen: boolean; screenCount?: number; action?: "edit" | "create"; newScreenName?: string }
  | { type: "screen_start"; screenId: string; screenName: string; index: number; total: number }
  | { type: "apply_op"; screenId: string; index: number; total: number; description: string }
  | { type: "apply_failed"; screenId: string; failedOps: string[]; fallback: boolean }
  | { type: "html_chunk"; screenId: string; chunk: string }
  | { type: "screen_done"; screenId: string; html: string }
  | { type: "screen_created"; screenId: string; screenName: string; html: string };

export interface SelectedElementContext {
  xpath: string;
  tagName: string;
  textContent: string;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export async function* streamChatEdit(
  message: string,
  screens: Screen[],
  designSystem: DesignSystem,
  messages: { role: string; content: string }[],
  platform: Platform = "web",
  image?: string,
  selectedElement?: SelectedElementContext | null,
  appName?: string,
  appDescription?: string,
  activeScreenId?: string | null
): AsyncGenerator<ChatEditEvent> {
  // ── Phase 1: Plan ─────────────────────────────────────────
  const screenList = screens
    .map((s) => `  - id: "${s.id}", name: "${s.name}"`)
    .join("\n");

  const history = messages
    .slice(-8)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const selectionCtx = selectedElement
    ? `\n\nUser has selected an element on the active screen:\n  - XPath: ${selectedElement.xpath}\n  - Tag: <${selectedElement.tagName}>\n  - Text: "${selectedElement.textContent || "(no direct text)"}"\nThe user's request likely refers to this specific element or its surrounding section.`
    : "";

  const imageCtx = image ? "\n\nThe user has also attached a reference image. Use it to understand the visual changes they want." : "";

  const activeScreenCtx = activeScreenId
    ? `\nUser is currently viewing screen with id: "${activeScreenId}". If the request is ambiguous about which screen to edit, prefer this one.`
    : "";

  const planPromptText = `App screens:
${screenList}

Design system: primary=${designSystem.colors.primary}, background=${designSystem.colors.background}, text=${designSystem.colors.text}, fonts: "${designSystem.fonts.primary}"

Recent conversation:
${history || "(none)"}
${activeScreenCtx}
User request: "${message}"${selectionCtx}${imageCtx}

Decide the action: "create" if the user wants a brand new screen, or "edit" to modify existing ones.
For "edit": choose the most appropriate screen id from the list, or use "ALL" if the change applies to every screen.
For "create": set targetScreenId to "NEW" and provide a newScreenName.`;

  const parsedImage = image ? parseDataUrl(image) : null;
  const planMessage = parsedImage
    ? multimodalMessage(planPromptText, parsedImage.data, parsedImage.mimeType)
    : planPromptText;

  const planRaw = await withRetry(() =>
    collectAgent(chatPlannerAgent, "wirefraime-plan", planMessage)
  );

  let plan: ChatPlan;
  try {
    const parsed = ChatPlanSchema.safeParse(JSON.parse(extractJson(planRaw)));
    if (!parsed.success) throw new Error("Invalid plan");
    plan = parsed.data;
  } catch {
    const fallback = screens[0];
    plan = {
      reply: "Updating that for you.",
      action: "edit",
      targetScreenId: fallback?.id ?? "",
      changeDescription: message,
    };
  }

  // ── Handle CREATE action ─────────────────────────────────
  if (plan.action === "create") {
    const newScreenName = plan.newScreenName || "New Screen";
    const newScreenId = randomUUID();

    yield {
      type: "plan",
      reply: plan.reply,
      targetScreenId: "NEW",
      targetScreenName: newScreenName,
      multiScreen: false,
      action: "create",
      newScreenName,
    };

    yield {
      type: "screen_start",
      screenId: newScreenId,
      screenName: newScreenName,
      index: 1,
      total: 1,
    };

    const referenceScreen = screens[0];
    const vp = VIEWPORTS[platform];
    const headTemplate = generateHtmlHead(designSystem, platform);
    const referenceCtx = referenceScreen?.html
      ? `\n\n${extractReferencePatterns(referenceScreen.html)}\n\nMatch the existing screen's Tailwind class patterns exactly.`
      : "";

    const createPrompt = `Generate a complete, self-contained HTML document for the "${newScreenName}" screen of "${appName || "App"}".

Screen purpose: ${plan.changeDescription}
App context: ${appDescription || ""}
Platform: ${platform} (${vp.w}×${vp.h})

Use this EXACT <head> section:
${headTemplate}

Use Tailwind semantic tokens (bg-primary, text-foreground, rounded-card, shadow-card, h-btn, p-card). Never use ds-* classes, hardcoded colors like bg-blue-500, or emoji icons.

Realistic content, real names/numbers/dates, Iconoir icons throughout.
${referenceCtx}

Output ONLY the HTML starting with <!DOCTYPE html>. No markdown fences.`;

    const sysInstr = await getScreenGenInstructions();
    let fullHtml = "";
    let isFirstChunk = true;
    for await (let chunk of streamWithGemini(sysInstr, createPrompt, {
      model: STREAMING_MODEL,
      temperature: 0.7,
      maxOutputTokens: 65536,
    })) {
      if (isFirstChunk) {
        chunk = stripLeadingFence(chunk);
        isFirstChunk = false;
      }
      fullHtml += chunk;
      yield { type: "html_chunk", screenId: newScreenId, chunk };
    }

    const { repaired, errors } = validateAndRepairHtml(fullHtml);
    if (errors.length > 0) console.warn(`[${newScreenId}] HTML repaired:`, errors.join(", "));
    const html = injectSharedCSS(repaired, designSystem, platform);

    yield {
      type: "screen_created",
      screenId: newScreenId,
      screenName: newScreenName,
      html,
    };

    return;
  }

  // ── Handle EDIT action ───────────────────────────────────
  const isMultiScreen = plan.targetScreenId === "ALL";
  const targetScreens = isMultiScreen
    ? screens
    : [screens.find((s) => s.id === plan.targetScreenId) ?? screens[0]];

  if (targetScreens.length === 0 || !targetScreens[0]) throw new Error("No screens to edit");

  yield {
    type: "plan",
    reply: plan.reply,
    targetScreenId: isMultiScreen ? "ALL" : targetScreens[0].id,
    targetScreenName: isMultiScreen ? "All screens" : targetScreens[0].name,
    multiScreen: isMultiScreen,
    screenCount: isMultiScreen ? targetScreens.length : undefined,
    action: "edit",
  };

  // ── Phase 2: Apply changes to each target screen ────────
  for (let screenIdx = 0; screenIdx < targetScreens.length; screenIdx++) {
    const currentScreen = targetScreens[screenIdx];

    if (isMultiScreen) {
      yield {
        type: "screen_start",
        screenId: currentScreen.id,
        screenName: currentScreen.name,
        index: screenIdx + 1,
        total: targetScreens.length,
      };
    }

    // ── Try patch flow first ─────────────────────────
    const patchPromptText = `Current HTML of "${currentScreen.name}":
${currentScreen.html}

Design system tokens available as Tailwind classes:
  Colors: bg-primary, text-primary, bg-surface, text-foreground, text-muted, border-border, bg-success, bg-error
  Radii: rounded-card, rounded-card-lg, rounded-btn, rounded-pill, rounded-full
  Shadows: shadow-card, shadow-card-lg, shadow-focus
  Heights: h-btn, h-input, h-nav

Changes to make: ${plan.changeDescription}${imageCtx}
${!isMultiScreen && selectedElement ? `\nTarget element: XPath="${selectedElement.xpath}", tag=<${selectedElement.tagName}>, text="${selectedElement.textContent || ""}".\nFocus patches on this element and its immediate context.` : ""}

Produce minimum patch operations. Each search string must appear EXACTLY ONCE in the HTML above. Prefer class-attribute swaps over full element rewrites.`;

    const patchMessage = parsedImage
      ? multimodalMessage(patchPromptText, parsedImage.data, parsedImage.mimeType)
      : patchPromptText;

    let patchSucceeded = false;

    try {
      const patchRaw = await withRetry(
        () => collectAgent(patchAgent, "wirefraime-patch", patchMessage),
        1
      );

      const parsed = PatchOpsSchema.safeParse(JSON.parse(extractJson(patchRaw)));
      if (!parsed.success) throw new Error("Invalid patch schema");

      const ops = parsed.data.operations;
      if (ops.length === 0) throw new Error("No operations returned");

      const result = applyPatchOps(currentScreen.html, ops);

      if (result.applied === 0) {
        throw new Error("All patch operations failed to match");
      }

      // Emit success events for applied ops
      for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        const didFail = result.failed.some((f) => f.description === op.description);
        if (!didFail) {
          yield {
            type: "apply_op",
            screenId: currentScreen.id,
            index: i + 1,
            total: ops.length,
            description: op.description,
          };
        }
      }

      if (result.failed.length > 0) {
        yield {
          type: "apply_failed",
          screenId: currentScreen.id,
          failedOps: result.failed.map((f) => `${f.description}: ${f.reason}`),
          fallback: false,
        };
      }

      const { repaired } = validateAndRepairHtml(result.html);
      const html = injectSharedCSS(repaired, designSystem, platform);
      yield { type: "screen_done", screenId: currentScreen.id, html };
      patchSucceeded = true;
    } catch (err) {
      console.warn(`Patch flow failed for "${currentScreen.name}", falling back to regen:`, err);
    }

    // ── Fallback: full regen for this screen ──────────
    if (!patchSucceeded) {
      yield { type: "apply_failed", screenId: currentScreen.id, failedOps: [], fallback: true };

      const editPromptText = `You are editing the "${currentScreen.name}" screen.

Current HTML:
${currentScreen.html}

Available Tailwind semantic tokens (use these — never hardcode colors):
  Colors: bg-primary, text-primary, bg-surface, text-foreground, text-muted, border-border, bg-success, bg-error
  Radii: rounded-card, rounded-btn, rounded-pill, rounded-full
  Shadows: shadow-card, shadow-card-lg
  Heights: h-btn, h-input, h-nav

${!isMultiScreen && selectedElement ? `\nTarget element (user selected): XPath="${selectedElement.xpath}", tag=<${selectedElement.tagName}>, text="${selectedElement.textContent || ""}".\nFocus changes on this element and its immediate context.\n` : ""}
Changes to make: ${plan.changeDescription}${imageCtx}

Output the COMPLETE modified HTML. Preserve all unchanged parts exactly.`;

      const editorInstr = await getScreenEditorInstructions();
      let fullHtml = "";
      let isFirstChunk = true;
      for await (let chunk of streamWithGemini(editorInstr, editPromptText, {
        model: STREAMING_MODEL,
        temperature: 0.4,
        maxOutputTokens: 24576,
        image: parsedImage ?? undefined,
      })) {
        if (isFirstChunk) {
          chunk = stripLeadingFence(chunk);
          isFirstChunk = false;
        }
        fullHtml += chunk;
        yield { type: "html_chunk", screenId: currentScreen.id, chunk };
      }

      const { repaired, errors } = validateAndRepairHtml(fullHtml);
      if (errors.length > 0) console.warn(`[${currentScreen.id}] HTML repaired:`, errors.join(", "));
      const finalHtml = injectSharedCSS(repaired, designSystem, platform);
      yield { type: "screen_done", screenId: currentScreen.id, html: finalHtml };
    }
  }
}
