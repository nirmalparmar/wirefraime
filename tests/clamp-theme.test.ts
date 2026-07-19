import { describe, expect, test } from "bun:test";
import { clampTheme } from "../lib/ds/clamp";
import { contrastHex } from "../lib/ds/color";
import { DEFAULT_THEME, RADIUS_MAX, SCALE_MAX, SCALE_MIN } from "../lib/ds/types";
import { PRESET_THEMES } from "../lib/ds/presets";
import { themeToCssVars, themeToCssBlock } from "../lib/ds/css-vars";

describe("clampTheme", () => {
  test("passes a valid theme through unchanged", () => {
    expect(clampTheme(DEFAULT_THEME)).toEqual(DEFAULT_THEME);
  });

  test("is idempotent", () => {
    const once = clampTheme({
      ...DEFAULT_THEME,
      colors: { ...DEFAULT_THEME.colors, foreground: "#cccccc" },
      radius: 99,
    });
    expect(clampTheme(once)).toEqual(once);
  });

  test("clamps radius and scale to bounds", () => {
    const t = clampTheme({ ...DEFAULT_THEME, radius: 99, scale: 3 });
    expect(t.radius).toBe(RADIUS_MAX);
    expect(t.scale).toBe(SCALE_MAX);
    const t2 = clampTheme({ ...DEFAULT_THEME, radius: -5, scale: 0.1 });
    expect(t2.radius).toBe(0);
    expect(t2.scale).toBe(SCALE_MIN);
  });

  test("repairs low-contrast text pairs to WCAG AA", () => {
    const t = clampTheme({
      ...DEFAULT_THEME,
      colors: {
        ...DEFAULT_THEME.colors,
        foreground: "#dddddd", // ~1.35:1 on white
        primary: "#ffe680",
        primaryForeground: "#ffffff", // white on pale yellow
        mutedForeground: "#cccccc",
      },
    });
    expect(contrastHex(t.colors.foreground, t.colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastHex(t.colors.primaryForeground, t.colors.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastHex(t.colors.mutedForeground, t.colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastHex(t.colors.mutedForeground, t.colors.muted)).toBeGreaterThanOrEqual(4.5);
    expect(contrastHex(t.colors.cardForeground, t.colors.card)).toBeGreaterThanOrEqual(4.5);
    // Surfaces are untouched — only text moves.
    expect(t.colors.background).toBe(DEFAULT_THEME.colors.background);
    expect(t.colors.primary).toBe("#ffe680");
  });

  test("never throws on garbage input, falls back to defaults", () => {
    for (const garbage of [null, undefined, 42, "theme", [], {}, { colors: "red" }]) {
      const t = clampTheme(garbage);
      expect(t.colors.background).toBe(DEFAULT_THEME.colors.background);
      expect(t.radius).toBe(DEFAULT_THEME.radius);
    }
  });

  test("salvages partial input (bad hex, missing fields, hostile font)", () => {
    const t = clampTheme({
      colors: { primary: "#3b5bdb", background: "not-a-color" },
      fonts: { display: '"><script>alert(1)</script>', body: "Inter" },
      radius: 12,
    });
    expect(t.colors.primary).toBe("#3b5bdb");
    expect(t.colors.background).toBe(DEFAULT_THEME.colors.background);
    expect(t.radius).toBe(12);
    expect(t.fonts.display).not.toContain("<");
    expect(t.fonts.display).not.toContain('"');
  });
});

describe("presets", () => {
  test("all presets are stable under clampTheme (already AA)", () => {
    for (const [id, preset] of Object.entries(PRESET_THEMES)) {
      expect(clampTheme(preset.theme)).toEqual(preset.theme);
      expect(contrastHex(preset.theme.colors.foreground, preset.theme.colors.background))
        .toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("themeToCssVars", () => {
  test("maps every token the stylesheets read", () => {
    const vars = themeToCssVars(DEFAULT_THEME);
    for (const key of [
      "--background", "--foreground", "--card", "--card-foreground",
      "--muted", "--muted-foreground", "--primary", "--primary-foreground",
      "--border", "--ring", "--success", "--warning", "--destructive",
      "--radius", "--scale", "--font-display", "--font-body",
    ]) {
      expect(vars[key]).toBeTruthy();
    }
    expect(vars["--radius"]).toBe("8px");
  });

  test("css block is a single :root rule", () => {
    const block = themeToCssBlock(DEFAULT_THEME);
    expect(block.startsWith(":root{")).toBe(true);
    expect(block.endsWith("}")).toBe(true);
    expect(block).toContain("--primary:#18181b;");
  });
});
