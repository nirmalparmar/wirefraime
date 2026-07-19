import { Theme } from "./types";

/** Map a Theme onto the tokens.css variable names. */
export function themeToCssVars(theme: Theme): Record<string, string> {
  const c = theme.colors;
  return {
    "--background": c.background,
    "--foreground": c.foreground,
    "--card": c.card,
    "--card-foreground": c.cardForeground,
    "--muted": c.muted,
    "--muted-foreground": c.mutedForeground,
    "--primary": c.primary,
    "--primary-foreground": c.primaryForeground,
    "--border": c.border,
    "--ring": c.ring,
    "--success": c.success,
    "--warning": c.warning,
    "--destructive": c.destructive,
    "--radius": `${theme.radius}px`,
    "--scale": String(theme.scale),
    "--font-display": `"${theme.fonts.display}", ui-sans-serif, system-ui, sans-serif`,
    "--font-body": `"${theme.fonts.body}", ui-sans-serif, system-ui, sans-serif`,
  };
}

/** `:root{--background:#fff;…}` — injected by the preview wrapper. */
export function themeToCssBlock(theme: Theme): string {
  const vars = themeToCssVars(theme);
  const body = Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("");
  return `:root{${body}}`;
}

/** Google Fonts stylesheet URL for the theme's families. */
export function themeFontsHref(theme: Theme): string {
  const families = [...new Set([theme.fonts.display, theme.fonts.body])];
  const params = families
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
