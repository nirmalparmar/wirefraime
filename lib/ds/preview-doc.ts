import { Theme } from "./types";
import { themeToCssBlock, themeFontsHref } from "./css-vars";

/**
 * Deterministically wrap a generated HTML fragment into a full document
 * for <iframe srcdoc> rendering: doctype + fonts + the three ds/
 * stylesheets + the project's theme variables + the fragment. This is
 * the ONLY place generated markup meets a document shell.
 */
export function buildPreviewDoc(fragment: string, theme: Theme): string {
  return [
    "<!doctype html>",
    '<html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link rel="stylesheet" href="${themeFontsHref(theme)}">`,
    '<link rel="stylesheet" href="/ds/tokens.css">',
    '<link rel="stylesheet" href="/ds/components.css">',
    '<link rel="stylesheet" href="/ds/layout.css">',
    `<style>${themeToCssBlock(theme)}</style>`,
    "</head><body>",
    fragment,
    "</body></html>",
  ].join("\n");
}
