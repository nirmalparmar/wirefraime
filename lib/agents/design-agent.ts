import { InMemoryRunner, LlmAgent } from "@google/adk";
import type { Content, Part } from "@google/genai";
import { z } from "zod";
import type { DesignSystem, Screen, Platform } from "../types";
import { VIEWPORTS } from "../constants";
import { loadSkillFromDir, streamWithGemini } from "./adk-helpers";
import { generateHtmlHead, generateSharedCSS, injectSharedCSS, extractReferencePatterns } from "../design-template";
import { randomUUID } from "crypto";
import path from "path";

const MODEL = "gemini-3.1-pro-preview";

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

const FastApplyResultSchema = z.object({
  operations: z.array(z.object({
    search: z.string().describe("Exact HTML snippet to find in the current document. Must match character-for-character including whitespace."),
    replace: z.string().describe("The HTML snippet to replace it with. Use empty string to delete an element."),
    description: z.string().describe("One-line human-readable summary, e.g. 'Change header background to blue'"),
  })).describe("Ordered list of search/replace operations to apply sequentially."),
});

type FastApplyResult = z.infer<typeof FastApplyResultSchema>;

export type DesignPlan = z.infer<typeof DesignPlanSchema>;
type ChatPlan = z.infer<typeof ChatPlanSchema>;

// ── Skill loading ─────────────────────────────────────────────

let cachedSkillContent: string | null = null;
async function getSkillInstructions(): Promise<string> {
  if (!cachedSkillContent || process.env.NODE_ENV === "development") {
    const skillPath = path.resolve(process.cwd(), "skill/frontend-design");
    const skill = await loadSkillFromDir(skillPath);
    cachedSkillContent = skill.instructions;
    console.log(`[DesignAgent] Skill loaded: ${cachedSkillContent.length} chars`);
    // Log reference sections found
    const refs = cachedSkillContent.match(/=== REFERENCE: .+ ===/g);
    if (refs) {
      console.log(`[DesignAgent] References loaded: ${refs.map(r => r.replace(/=== REFERENCE: | ===/g, '')).join(', ')}`);
    } else {
      console.log(`[DesignAgent] No references found`);
    }
  }
  return cachedSkillContent;
}

// ── Agents (lazy-initialized with skill) ──────────────────────

let _designSystemAgent: LlmAgent | null = null;
async function getDesignSystemAgent(): Promise<LlmAgent> {
  if (!_designSystemAgent) {
    const skillInstr = await getSkillInstructions();
    _designSystemAgent = new LlmAgent({
      name: "design_system_agent",
      model: MODEL,
      instruction: `You are a world-class design system architect. You create distinctive, memorable design systems — not generic "AI slop".

Before choosing colors/fonts, think about:
- The app's domain, audience, and emotional tone
- Pick a BOLD aesthetic direction: brutally minimal, luxury/refined, editorial/magazine, retro-futuristic, organic/natural, industrial, playful, etc.
- Colors should be a cohesive palette with a dominant color and sharp accents — NOT timid, evenly-distributed palettes

TYPOGRAPHY RULES:
- NEVER use Inter, Roboto, Arial, system-ui, or other overused fonts
- Choose distinctive Google Fonts that match the aesthetic. Examples by tone:
  - Editorial/luxury: "Playfair Display", "Cormorant Garamond", "Libre Baskerville"
  - Modern/geometric: "Outfit", "Sora", "General Sans", "Satoshi" (via CDN), "Plus Jakarta Sans"
  - Playful: "Fredoka", "Quicksand", "Baloo 2"
  - Technical/mono: "JetBrains Mono", "IBM Plex Mono", "Fira Code"
  - Brutalist: "Bebas Neue", "Anton", "Archivo Black"
- Pair a distinctive display/heading font with a refined body font

COLOR RULES:
- NEVER use generic purple-gradient-on-white or blue-gray corporate palettes
- Commit to a palette with PERSONALITY: warm terracotta, deep forest green, bold coral, midnight navy, sage + gold, etc.
- Background should set atmosphere — consider off-whites, warm grays, light tints, or dark themes
- Every color must feel intentional and cohesive

LAYOUT TOKEN RULES:
- Choose a border-radius philosophy: sharp (4-6px), standard (10-14px), rounded (16-24px), or pill (999px for buttons)
- Pick ONE shadow style: flat (0 0 0 transparent), subtle (0 1px 3px rgba(0,0,0,0.06)), elevated (0 4px 12px rgba(0,0,0,0.1)), dramatic (0 8px 24px rgba(0,0,0,0.15))
- Choose navigation: "sidebar" for dashboards/tools, "topbar" for marketing/content sites, "bottom-tabs" for mobile apps, "none" for simple pages
- Tokens must feel cohesive: sharp radius + flat shadow = minimalist; rounded radius + soft shadow = friendly; etc.
- Button height: 40-44px for compact, 48-52px for standard mobile, 56px for spacious
- All values must be concrete CSS values (e.g. "12px", "0 1px 3px rgba(0,0,0,0.06)")

=== DESIGN SKILL (apply these principles when choosing colors, fonts, and aesthetic direction) ===
${skillInstr}

Return valid JSON matching the required schema. No markdown, no explanation.`,
      outputSchema: DesignPlanSchema,
      generateContentConfig: { maxOutputTokens: 4096 },
    });
  }
  return _designSystemAgent;
}

const chatPlannerAgent = new LlmAgent({
  name: "chat_planner_agent",
  model: MODEL,
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
- "Update the header on every screen" → ALL

Examples of single-screen requests:
- "Add a search bar to the dashboard" → specific screen ID
- "Change the title on the settings page" → specific screen ID
- "Remove the sidebar from the profile screen" → specific screen ID

When in doubt and the request mentions "all", "every", "across", "everywhere", or is about global styles (colors, fonts, border radius, shadows), use "ALL".
Otherwise, use the exact screen ID from the provided list.
Return valid JSON matching the required schema.`,
  outputSchema: ChatPlanSchema,
  generateContentConfig: { maxOutputTokens: 1024, temperature: 0.3 },
});

let _screenEditorInstr: string | null = null;
async function getScreenEditorInstructions(): Promise<string> {
  if (!_screenEditorInstr) {
    const skillInstr = await getSkillInstructions();
    _screenEditorInstr = `You are an expert frontend editor. You modify HTML screens with surgical precision while maintaining design excellence.

EDITING RULES:
- Make ONLY the requested changes — preserve all other content, structure, and styling exactly
- Maintain the existing design language: same fonts, colors, spacing, border-radius, shadow system
- Any new elements you add must match the existing component patterns (same button styles, card styles, etc.)
- Keep CSS variables for colors — never replace var(--color-*) with hardcoded values
- Keep all ds-* CSS classes intact — they define the design system component styles
- If adding new sections, match the spacing rhythm of surrounding content
- Preserve all hover states, transitions, and visual refinements
- If the screen uses ds-card, ds-btn-primary, ds-input, ds-avatar etc., use those same classes for new elements
- ICONS: ALWAYS use Iconoir classes (<i class="iconoir-icon-name"></i>). NEVER use emoji or unicode for icons. Replace any existing emoji icons with Iconoir equivalents.

=== DESIGN SKILL ===
${skillInstr}

Output ONLY the complete modified HTML starting with <!DOCTYPE html>. No markdown, no explanation.`;
  }
  return _screenEditorInstr;
}

const fastApplyAgent = new LlmAgent({
  name: "fast_apply_agent",
  model: MODEL,
  instruction: `You are an expert HTML editor that produces surgical search/replace operations.

Given the current HTML of a screen and a description of changes to make, output a list of search/replace operations.

CRITICAL RULES:
1. Each "search" string must be an EXACT verbatim substring of the current HTML — copy it character-for-character including whitespace, quotes, and newlines.
2. Each "search" string must be UNIQUE in the document — it should appear exactly ONCE. Include enough surrounding context (parent tags, attributes) to ensure uniqueness.
3. Keep operations MINIMAL — only change what's needed. Don't rewrite large blocks when a small targeted change works.
4. Operations are applied SEQUENTIALLY — later operations see the result of earlier ones. Plan accordingly.
5. Maintain the same indentation style as the surrounding HTML.
6. For ADDING new elements: search for a nearby landmark (e.g. a closing tag) and replace it with the new content PLUS that landmark.
7. For DELETING elements: set "replace" to an empty string.
8. Preserve all ds-* CSS classes, CSS variables (var(--color-*)), and design system patterns.
9. When changing text content, include the surrounding HTML tags in the search to ensure uniqueness.
10. Keep each search string as SHORT as possible while guaranteeing uniqueness.
11. ICONS: Use Iconoir classes (<i class="iconoir-icon-name"></i>) for any new icons. NEVER add emoji or unicode symbols as icons.

Return valid JSON matching the required schema. No markdown, no explanation.`,
  outputSchema: FastApplyResultSchema,
  generateContentConfig: { maxOutputTokens: 4096, temperature: 0.2 },
});

/** Apply search/replace operations to HTML. Returns result with stats. */
function applyOperations(html: string, operations: FastApplyResult["operations"]): {
  html: string;
  applied: number;
  failed: string[];
} {
  let current = html;
  let applied = 0;
  const failed: string[] = [];

  for (const op of operations) {
    const idx = current.indexOf(op.search);
    if (idx === -1) {
      failed.push(op.description);
      continue;
    }
    // Replace only the first occurrence using indexOf + slice (avoids regex issues)
    current = current.slice(0, idx) + op.replace + current.slice(idx + op.search.length);
    applied++;
  }

  return { html: current, applied, failed };
}

let _screenGenInstructions: string | null = null;
async function getScreenGenInstructions(): Promise<string> {
  if (!_screenGenInstructions) {
    const skillInstr = await getSkillInstructions();
    _screenGenInstructions = `You are an elite frontend designer creating production-grade UI screens.
You generate complete, self-contained HTML that looks like REAL shipped products (Airbnb, Stripe, Linear quality).

CRITICAL RULES:
1. You will receive a pre-built <head> section with a shared CSS stylesheet containing ds-* component classes. USE THEM.
2. Use ds-card for ALL card/panel/container elements
3. Use ds-btn-primary for main CTA buttons, ds-btn-secondary for secondary actions
4. Use ds-input for all text inputs/fields
5. Use ds-avatar for user avatars/initials
6. Use ds-badge, ds-badge-secondary, ds-badge-success, ds-badge-error for badges/pills
7. Use ds-nav / ds-nav-bottom + ds-nav-item for navigation
8. Use ds-sidebar + ds-sidebar-item for sidebar navigation on web/tablet
9. Use ds-title, ds-heading, ds-subheading, ds-body, ds-caption, ds-small for typography
10. Use ds-section for spacing between major content blocks
11. Use ds-divider for horizontal separator lines
12. Combine ds-* classes with Tailwind utilities freely: flex, grid, gap-*, p-*, m-*, w-*, etc.
13. DO NOT write custom CSS that overrides ds-* class properties. The shared stylesheet handles consistency.
14. ALL content must be REALISTIC: real names, real numbers, real dates. ZERO Lorem ipsum.
15. NEVER let text render in default serif/Times New Roman — the shared CSS sets fonts on body.

ICONS — MANDATORY:
- The <head> includes the Iconoir CSS library (iconoir.css). Use Iconoir for ALL icons.
- NEVER use emoji or unicode symbols for icons. Always use Iconoir classes.
- Syntax: <i class="iconoir-icon-name"></i> — e.g. <i class="iconoir-home"></i>, <i class="iconoir-settings"></i>
- Common icons: iconoir-home, iconoir-search, iconoir-settings, iconoir-user, iconoir-plus, iconoir-edit, iconoir-trash,
  iconoir-heart, iconoir-star, iconoir-bell, iconoir-mail, iconoir-calendar, iconoir-clock, iconoir-check,
  iconoir-arrow-right, iconoir-arrow-left, iconoir-nav-arrow-down, iconoir-nav-arrow-up,
  iconoir-dashboard-dots, iconoir-graph-up, iconoir-wallet, iconoir-credit-card, iconoir-shopping-bag,
  iconoir-chat-bubble, iconoir-image, iconoir-folder, iconoir-lock, iconoir-log-out, iconoir-menu,
  iconoir-more-horiz, iconoir-more-vert, iconoir-filter, iconoir-sort, iconoir-download, iconoir-upload,
  iconoir-share-android, iconoir-link, iconoir-map-pin, iconoir-phone, iconoir-globe, iconoir-sun-light,
  iconoir-half-moon, iconoir-refresh-double, iconoir-eye-empty, iconoir-eye-off, iconoir-clipboard,
  iconoir-bookmark, iconoir-pin, iconoir-archive, iconoir-send, iconoir-attach, iconoir-camera,
  iconoir-mic, iconoir-play, iconoir-pause, iconoir-music-double-note, iconoir-headset,
  iconoir-people-tag, iconoir-group, iconoir-community, iconoir-trophy, iconoir-flash,
  iconoir-rocket, iconoir-shield-check, iconoir-verified-badge, iconoir-warning-triangle, iconoir-info-circle,
  iconoir-cancel, iconoir-check-circle, iconoir-arrow-up-circle, iconoir-arrow-down-circle,
  iconoir-undo, iconoir-redo, iconoir-copy, iconoir-cut, iconoir-list, iconoir-grid
- In nav items: <a class="ds-nav-item"><i class="iconoir-home"></i><span>Home</span></a>
- In sidebar items: <a class="ds-sidebar-item"><i class="iconoir-dashboard-dots"></i><span>Dashboard</span></a>
- In buttons: <button class="ds-btn-primary"><i class="iconoir-plus"></i> Add Item</button>
- Size classes: wrap with ds-icon (default), ds-icon-sm (small), ds-icon-lg (large)

DESIGN SYSTEM CONSISTENCY (mandatory):
- Every screen in the app MUST look like it belongs to the same product
- Same card appearance, same button style, same nav pattern, same typography scale
- If a reference screen is provided, match its exact visual patterns

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

function stripFences(text: string): string {
  return text
    .replace(/^```(?:json|html)?\s*\n?/gm, "")
    .replace(/\n?```\s*$/gm, "")
    .trim();
}

/** Extract JSON object from potentially noisy LLM output */
function extractJson(text: string): string {
  const cleaned = stripFences(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in response");
  }
  return cleaned.slice(start, end + 1);
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
- Name screens descriptively (e.g. "Transaction History", "Workout Tracker", "Chat Inbox") — not generic ("Screen 1", "Core Feature")

PLATFORM DETECTION:
- If the description mentions "mobile app", "iOS", "Android", "phone", "React Native", "Flutter" → platform: "mobile"
- If the description mentions "iPad", "tablet" → platform: "tablet"
- Otherwise → platform: "web"
- The platform affects viewport size: mobile=390×844, tablet=1024×768, web=1440×900

LAYOUT TOKENS:
- Include a "layout" object in the designSystem with these exact fields:
  borderRadius, borderRadiusLg, borderRadiusSm, shadow, shadowLg, spacingUnit, cardPadding, sectionGap, buttonHeight, inputHeight, navStyle, navHeight
- These tokens will be used to generate a shared CSS stylesheet for ALL screens, ensuring visual consistency
- Choose values that match the app's aesthetic direction

Pick a distinctive, on-brand color palette for the domain.
Use Google Font names as CSS font stacks, e.g. "Outfit, system-ui, sans-serif".`;

  return withRetry(async () => {
    const dsAgent = await getDesignSystemAgent();
    const raw = await collectAgent(dsAgent, "wirefraime-design", prompt);
    let json: unknown;
    try {
      json = JSON.parse(extractJson(raw));
    } catch (e) {
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

export async function generateScreenHtml(
  screenId: string,
  screenName: string,
  screenDescription: string,
  appName: string,
  appDescription: string,
  designSystem: DesignSystem,
  platform: Platform = "web",
  onHtmlChunk?: (screenId: string, chunk: string) => void,
  referenceScreenHtml?: string
): Promise<string> {
  const { colors, fonts } = designSystem;
  const vp = VIEWPORTS[platform];

  // Generate the shared head template with all ds-* classes
  const headTemplate = generateHtmlHead(designSystem, platform);

  // Build reference context if we have a previously generated screen
  const referenceCtx = referenceScreenHtml
    ? `\n\nREFERENCE SCREEN (your screen MUST match this exact visual style — same component classes, same layout patterns, same spacing):
<reference>
${extractReferencePatterns(referenceScreenHtml)}
</reference>
Match the reference screen's: navigation structure, card style, button style, typography, spacing rhythm, color usage. Your screen must look like it belongs in the SAME app.`
    : "";

  const platformGuidance = platform === "mobile"
    ? `MOBILE DESIGN (${vp.w}×${vp.h} — iPhone 14):

⚠️ FONT SIZE IS THE #1 PRIORITY — tiny text is the most common failure. ENFORCE these minimums:

TYPOGRAPHY (use ds-* classes: ds-title, ds-heading, ds-subheading, ds-body, ds-caption, ds-small):
  - Page titles: use class="ds-title" (30px, weight 700)
  - Section headings: use class="ds-heading" (22px, weight 600)
  - Card titles: use class="ds-subheading" (18px, weight 600)
  - Body text: use class="ds-body" (16px, weight 400, line-height 1.55)
  - Secondary text: use class="ds-caption" (14px, muted color)
  - Tab bar / small labels: use class="ds-small" (12px)
  - ABSOLUTE MINIMUM for ANY visible text: 12px. Nothing smaller. Ever.

LAYOUT RULES:
  - Single column, full-width cards (use class="ds-card"), generous padding (20-24px)
  - Touch targets: minimum 48px height for buttons
  - Bottom tab bar: use class="ds-nav-bottom" with ds-nav-item children
  - Sticky top header: use class="ds-nav"
  - Buttons: use class="ds-btn-primary" or "ds-btn-secondary"
  - Inputs: use class="ds-input"
  - Avatars: use class="ds-avatar" or "ds-avatar-lg"
  - Spacing rhythm: 8/12/16/20/24/32px — be generous`
    : platform === "tablet"
      ? `TABLET DESIGN (${vp.w}×${vp.h} — iPad):

TYPOGRAPHY (use ds-* classes for consistency):
  - Page titles: class="ds-title" (34px)
  - Section headings: class="ds-heading" (24px)
  - Body text: class="ds-body" (16px)
  - Captions: class="ds-caption" (14px)

LAYOUT RULES:
  - Use class="ds-sidebar" + ds-sidebar-item for sidebar navigation, or ds-nav for top bar
  - Split-view patterns: sidebar + main content
  - Touch-friendly: minimum 44px tap targets
  - Cards: use class="ds-card" — consistent padding and radius handled by CSS`
      : `WEB DESIGN (${vp.w}×${vp.h} — Desktop):

⚠️ FONT SIZE IS THE #1 PRIORITY — tiny text is the most common failure. ENFORCE these minimums:

TYPOGRAPHY (use ds-* classes for consistency):
  - Page titles: class="ds-title" (40px, weight 700)
  - Section headings: class="ds-heading" (26px, weight 600)
  - Card titles: class="ds-subheading" (19px, weight 600)
  - Body text: class="ds-body" (16px, line-height 1.6)
  - Captions: class="ds-caption" (14px, muted)
  - ABSOLUTE MINIMUM for ANY visible text: 13px.

LAYOUT RULES:
  - Use class="ds-sidebar" + ds-sidebar-item for sidebar navigation, or class="ds-nav" for top bar
  - Content max-width: 1200px centered, or sidebar+content fill
  - Cards: use class="ds-card" — consistent radius, padding, shadow from CSS
  - Buttons: class="ds-btn-primary" / "ds-btn-secondary"
  - Inputs: class="ds-input"
  - Hover states on ALL interactive elements`;

  const prompt = `Generate a complete, self-contained HTML document for the "${screenName}" screen of "${appName}".

Screen purpose: ${screenDescription}
App context: ${appDescription}
Platform: ${platform} (${vp.w}×${vp.h})

TECHNICAL REQUIREMENTS:
1. Use this EXACT <head> section (copy it verbatim — it contains the shared design system CSS):
${headTemplate}

2. After </head>, add <body> with your screen content. Do NOT add additional <style> blocks that override ds-* classes.

3. Use these pre-built component classes for ALL components:
   - Cards/panels: class="ds-card" or "ds-card-lg"
   - Buttons: class="ds-btn-primary" or "ds-btn-secondary"
   - Inputs: class="ds-input"
   - Badges: class="ds-badge", "ds-badge-secondary", "ds-badge-success", "ds-badge-error"
   - Avatars: class="ds-avatar" or "ds-avatar-lg" (add inline background-color for each)
   - Navigation: class="ds-nav" (top) or "ds-nav-bottom" (mobile bottom tab bar) with ds-nav-item children
   - Sidebar: class="ds-sidebar" with ds-sidebar-item children (add class="active" for current)
   - Typography: class="ds-title", "ds-heading", "ds-subheading", "ds-body", "ds-caption", "ds-small"
   - Sections: class="ds-section" for spacing between major blocks
   - Dividers: <div class="ds-divider"></div>
   - Status dots: <span class="ds-dot ds-dot-success"></span>

4. Combine ds-* classes freely with Tailwind utilities for layout: flex, grid, gap-*, p-*, m-*, w-*, etc.
   Example: <div class="ds-card flex items-center gap-4">

5. DO NOT write custom CSS that redefines card, button, input, or navigation appearance.
   The shared CSS handles all component styling for consistency across screens.

${platformGuidance}

ICONS — MANDATORY (Iconoir library is loaded in <head>):
- NEVER use emoji or unicode symbols for icons. ALWAYS use Iconoir CSS classes.
- Syntax: <i class="iconoir-icon-name"></i>
- Nav items: <a class="ds-nav-item"><i class="iconoir-home"></i><span>Home</span></a>
- Sidebar: <a class="ds-sidebar-item"><i class="iconoir-dashboard-dots"></i><span>Dashboard</span></a>
- Buttons with icon: <button class="ds-btn-primary"><i class="iconoir-plus"></i> Add</button>
- Common: iconoir-home, iconoir-search, iconoir-settings, iconoir-user, iconoir-plus, iconoir-edit,
  iconoir-trash, iconoir-heart, iconoir-star, iconoir-bell, iconoir-mail, iconoir-calendar,
  iconoir-clock, iconoir-check, iconoir-arrow-right, iconoir-arrow-left, iconoir-dashboard-dots,
  iconoir-graph-up, iconoir-wallet, iconoir-credit-card, iconoir-shopping-bag, iconoir-chat-bubble,
  iconoir-image, iconoir-folder, iconoir-lock, iconoir-log-out, iconoir-menu, iconoir-filter,
  iconoir-download, iconoir-upload, iconoir-share-android, iconoir-link, iconoir-map-pin,
  iconoir-phone, iconoir-globe, iconoir-eye-empty, iconoir-bookmark, iconoir-send, iconoir-camera,
  iconoir-people-tag, iconoir-group, iconoir-community, iconoir-trophy, iconoir-rocket,
  iconoir-shield-check, iconoir-warning-triangle, iconoir-info-circle, iconoir-check-circle,
  iconoir-list, iconoir-grid, iconoir-more-horiz, iconoir-more-vert, iconoir-nav-arrow-down

PROFESSIONAL DESIGN QUALITY (non-negotiable):
- REALISTIC content: real names (Sarah Chen, Marcus Williams), real numbers ($12,450.00), real dates (Mar 5, 2026). ZERO Lorem ipsum.
- STRONG visual hierarchy: ds-title for page titles, ds-heading for sections, ds-body for content
- Use var(--color-primary) sparingly for CTAs and active states — don't overuse it
- Surface (ds-card) must contrast with background
- Navigation: active ds-nav-item gets class="active", ALL icons must be Iconoir (no emoji)
${referenceCtx}

Output ONLY the HTML starting with <!DOCTYPE html>. No markdown fences, no explanation.`;

  const sysInstr = await getScreenGenInstructions();
  let fullHtml = "";
  for await (let chunk of streamWithGemini(sysInstr, prompt, {
    model: MODEL,
    temperature: 0.7,
    maxOutputTokens: 65536,
  })) {
    if (fullHtml === "" && chunk.startsWith("```html\n")) {
      chunk = chunk.replace(/^```html\n/, "");
    } else if (fullHtml === "" && chunk.startsWith("```\n")) {
      chunk = chunk.replace(/^```\n/, "");
    }
    fullHtml += chunk;
    try {
      onHtmlChunk?.(screenId, chunk);
    } catch {
      /* SSE closed, keep collecting */
    }
  }

  // Post-process: strip fences and ensure shared CSS is injected
  let html = stripFences(fullHtml);
  html = injectSharedCSS(html, designSystem, platform);
  return html;
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

/** Parse a data URL into mime type and base64 data */
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

    // Emit screen_start so the UI can set up the iframe for streaming
    yield {
      type: "screen_start",
      screenId: newScreenId,
      screenName: newScreenName,
      index: 1,
      total: 1,
    };

    // Stream the new screen generation so UI updates live
    const referenceScreen = screens[0];
    const vp = VIEWPORTS[platform];
    const headTemplate = generateHtmlHead(designSystem, platform);
    const referenceCtx = referenceScreen?.html
      ? `\n\nREFERENCE SCREEN (match this exact visual style):\n<reference>\n${extractReferencePatterns(referenceScreen.html)}\n</reference>`
      : "";

    const createPrompt = `Generate a complete, self-contained HTML document for the "${newScreenName}" screen of "${appName || "App"}".

Screen purpose: ${plan.changeDescription}
App context: ${appDescription || ""}
Platform: ${platform} (${vp.w}×${vp.h})

TECHNICAL REQUIREMENTS:
1. Use this EXACT <head> section:
${headTemplate}

2. Use ds-* component classes (ds-card, ds-btn-primary, ds-btn-secondary, ds-input, ds-badge, ds-avatar, ds-nav, ds-sidebar, ds-title, ds-heading, ds-body, ds-caption, ds-section, ds-divider).
3. Combine with Tailwind utilities for layout.
4. ALL content must be REALISTIC — zero Lorem ipsum.
5. ICONS: Use Iconoir CSS classes for ALL icons (<i class="iconoir-icon-name"></i>). NEVER use emoji or unicode symbols.
${referenceCtx}

Output ONLY the HTML starting with <!DOCTYPE html>. No markdown fences.`;

    const sysInstr = await getScreenGenInstructions();
    let fullHtml = "";
    for await (let chunk of streamWithGemini(sysInstr, createPrompt, {
      model: MODEL,
      temperature: 0.7,
      maxOutputTokens: 65536,
    })) {
      if (fullHtml === "" && chunk.startsWith("```html\n")) {
        chunk = chunk.replace(/^```html\n/, "");
      } else if (fullHtml === "" && chunk.startsWith("```\n")) {
        chunk = chunk.replace(/^```\n/, "");
      }
      fullHtml += chunk;
      yield { type: "html_chunk", screenId: newScreenId, chunk };
    }

    const html = injectSharedCSS(stripFences(fullHtml), designSystem, platform);

    yield {
      type: "screen_created",
      screenId: newScreenId,
      screenName: newScreenName,
      html,
    };

    return;
  }

  // ── Handle EDIT action (existing flow) ───────────────────
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
  const sharedCSS = generateSharedCSS(designSystem, platform);

  for (let screenIdx = 0; screenIdx < targetScreens.length; screenIdx++) {
    const currentScreen = targetScreens[screenIdx];

    // For multi-screen, emit a screen_start event so the UI can track progress
    if (isMultiScreen) {
      yield {
        type: "screen_start",
        screenId: currentScreen.id,
        screenName: currentScreen.name,
        index: screenIdx + 1,
        total: targetScreens.length,
      };
    }

    // ── Fast Apply (surgical search/replace) ────────
    const fastApplyPromptText = `Current HTML of "${currentScreen.name}":
${currentScreen.html}

Design system: primary=${designSystem.colors.primary}, secondary=${designSystem.colors.secondary}, background=${designSystem.colors.background}, fonts: "${designSystem.fonts.primary}"

Changes to make: ${plan.changeDescription}${imageCtx}
${!isMultiScreen && selectedElement ? `\nTarget element: XPath="${selectedElement.xpath}", tag=<${selectedElement.tagName}>, text="${selectedElement.textContent || ""}".` : ""}

Produce the minimum search/replace operations to make these changes. Each search string must appear EXACTLY ONCE in the HTML above.`;

    const fastApplyMessage = parsedImage
      ? multimodalMessage(fastApplyPromptText, parsedImage.data, parsedImage.mimeType)
      : fastApplyPromptText;

    let fastApplySucceeded = false;

    try {
      const fastApplyRaw = await withRetry(
        () => collectAgent(fastApplyAgent, "wirefraime-fast-apply", fastApplyMessage),
        1 // only 1 retry before falling back
      );

      const parsed = FastApplyResultSchema.safeParse(JSON.parse(extractJson(fastApplyRaw)));
      if (!parsed.success) throw new Error("Invalid fast-apply schema");

      const ops = parsed.data.operations;
      if (ops.length === 0) throw new Error("No operations returned");

      const result = applyOperations(currentScreen.html, ops);

      // Stream each applied operation as a visible step
      for (let i = 0; i < ops.length; i++) {
        const didApply = !result.failed.includes(ops[i].description);
        if (didApply) {
          yield {
            type: "apply_op",
            screenId: currentScreen.id,
            index: i + 1,
            total: ops.length,
            description: ops[i].description,
          };
        }
      }

      // If ALL operations failed, fall back to full regen
      if (result.applied === 0) {
        throw new Error("All operations failed to match");
      }

      // Report partial failures
      if (result.failed.length > 0) {
        yield { type: "apply_failed", screenId: currentScreen.id, failedOps: result.failed, fallback: false };
      }

      // Post-process and emit final HTML
      const html = injectSharedCSS(result.html, designSystem, platform);
      yield { type: "screen_done", screenId: currentScreen.id, html };
      fastApplySucceeded = true;
    } catch (err) {
      console.warn(`Fast-apply failed for "${currentScreen.name}", falling back to full regen:`, err);
    }

    // ── Fallback: Full HTML regeneration (per screen) ──────
    if (!fastApplySucceeded) {
      yield { type: "apply_failed", screenId: currentScreen.id, failedOps: [], fallback: true };

      const editPromptText = `You are editing the "${currentScreen.name}" screen of a wireframe app.

Current HTML:
${currentScreen.html}

Design system: primary=${designSystem.colors.primary}, secondary=${designSystem.colors.secondary}, background=${designSystem.colors.background}, surface=${designSystem.colors.surface}, text=${designSystem.colors.text}, textMuted=${designSystem.colors.textMuted}, border=${designSystem.colors.border}, fonts: primary="${designSystem.fonts.primary}"

DESIGN SYSTEM CSS CLASSES (preserve these — they ensure cross-screen consistency):
The HTML uses ds-* classes: ds-card, ds-btn-primary, ds-btn-secondary, ds-input, ds-badge, ds-avatar, ds-nav, ds-nav-item, ds-sidebar, ds-sidebar-item, ds-title, ds-heading, ds-body, ds-caption, ds-section, ds-divider.
When adding new elements, use the SAME ds-* classes. Do NOT write custom CSS overriding these classes.

Shared CSS variables available:
${sharedCSS.slice(0, 1500)}

${!isMultiScreen && selectedElement ? `\nTarget element (user selected): XPath="${selectedElement.xpath}", tag=<${selectedElement.tagName}>, text="${selectedElement.textContent || ""}".\nFocus your changes on this element and its immediate context.\n` : ""}
Changes to make: ${plan.changeDescription}${imageCtx}

Output the COMPLETE modified HTML. Preserve all unchanged parts exactly as-is.`;

      const editorInstr = await getScreenEditorInstructions();
      let fullHtml = "";
      for await (const chunk of streamWithGemini(editorInstr, editPromptText, {
        model: MODEL,
        temperature: 0.5,
        maxOutputTokens: 16384,
        image: parsedImage ?? undefined,
      })) {
        fullHtml += chunk;
        yield { type: "html_chunk", screenId: currentScreen.id, chunk };
      }

      const html = stripFences(fullHtml);
      const finalHtml = injectSharedCSS(html, designSystem, platform);
      yield { type: "screen_done", screenId: currentScreen.id, html: finalHtml };
    }
  }
}
