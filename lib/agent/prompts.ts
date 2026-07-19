import {
  loadComponentCatalog,
  loadExample,
  loadGuidelines,
  pickExamples,
} from "./references";

/**
 * Prompt assembly (plan §6): the Designer's system prompt is built at
 * call time from references/ — guidelines + class catalog + 1–2 relevant
 * example screens. Improving output quality means editing those files,
 * never this one.
 */

export interface ScreenSpec {
  name: string;
  purpose: string;
}

export function assembleDesignerSystemPrompt(screen: ScreenSpec): string {
  const examples = pickExamples(screen.name, screen.purpose)
    .map((name) => `### Example screen: ${name}\n\n${loadExample(name).trim()}`)
    .join("\n\n");

  return [
    "You are the Designer for Wireframe. You write one complete, production-quality app screen as a single HTML fragment.",
    "",
    "OUTPUT CONTRACT — violating any of these makes the output unusable:",
    "- Output ONLY the HTML fragment. No markdown fences, no commentary, no <!doctype>, <html>, <head> or <body> tags.",
    "- The fragment starts with a shell div (see catalog) and uses ONLY classes from the class catalog below.",
    "- Never use inline style attributes, <style> blocks, <script>, event handlers, external images, or icon fonts.",
    "- All content is realistic and specific to the user's domain — never placeholders like \"Item 1\" or lorem ipsum.",
    "",
    "# Design guidelines",
    "",
    loadGuidelines().trim(),
    "",
    "# Class catalog",
    "",
    loadComponentCatalog().trim(),
    "",
    "# Reference examples (this is the quality bar — match it)",
    "",
    examples,
  ].join("\n");
}

export interface ScreenPromptContext {
  appName: string;
  userPrompt: string;
  screens: ScreenSpec[];
  screen: ScreenSpec;
}

export function buildScreenPrompt(ctx: ScreenPromptContext): string {
  const navList = ctx.screens
    .map((s) => (s.name === ctx.screen.name ? `${s.name} (this screen — mark active)` : s.name))
    .join(", ");

  return [
    `App: ${ctx.appName}`,
    `What the user asked for: ${ctx.userPrompt}`,
    "",
    `All screens in this app (keep the navigation identical across screens, in this order): ${navList}`,
    "",
    `Design the "${ctx.screen.name}" screen.`,
    `Purpose: ${ctx.screen.purpose}`,
    "",
    "Return the complete HTML fragment for this screen now.",
  ].join("\n");
}

/** Complaints from the validator, appended on the retry attempt. */
export function buildRetryPrompt(ctx: ScreenPromptContext, complaints: string[]): string {
  return [
    buildScreenPrompt(ctx),
    "",
    "Your previous attempt was rejected by the validator. Fix ALL of these problems:",
    ...complaints.map((c) => `- ${c}`),
    "",
    "Return only the corrected HTML fragment.",
  ].join("\n");
}

/** Simpler ask for the fast-model rung of the fallback ladder. */
export function buildSimpleScreenPrompt(ctx: ScreenPromptContext): string {
  return [
    buildScreenPrompt(ctx),
    "",
    "Keep it SIMPLE: one shell, a page header, and one or two sections (a stat row, a card list or a table). No charts. Short realistic content.",
  ].join("\n");
}

export function buildPlanPrompt(userPrompt: string): string {
  return [
    "A user wants an app designed. From their description, produce the generation plan.",
    "",
    `User description: ${userPrompt}`,
    "",
    "Rules:",
    "- 3 to 6 screens, each with a short name (1-3 words, e.g. \"Dashboard\", \"Customers\") and a one-sentence purpose specific to this domain.",
    "- The first screen is the main/overview screen.",
    "- appName: short product-style name (max 3 words).",
    "- theme: pick colors that fit the domain's mood. background/card/muted are light neutrals (background near-white, muted slightly darker, card usually white). primary is the accent. border is a light neutral. All colors as 6-digit hex.",
    "- fonts: pick from Google Fonts. displayFont for headings (can have character: Fraunces, Space Grotesk, Sora, Newsreader, DM Serif Display, Manrope), bodyFont clean and readable (Inter, DM Sans, Manrope, Work Sans).",
    "- radius: 4-16 (px). Sharper = techy, rounder = friendly.",
  ].join("\n");
}
