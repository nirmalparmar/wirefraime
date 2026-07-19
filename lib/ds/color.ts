/** Small color utilities for clampTheme — hex in, hex out, WCAG math. */

export type Rgb = { r: number; g: number; b: number };

export function parseHex(input: string): Rgb | null {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(input.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const c = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** WCAG relative luminance. */
export function luminance(rgb: Rgb): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
}

/** WCAG contrast ratio, 1..21. */
export function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function contrastHex(a: string, b: string): number {
  const ra = parseHex(a);
  const rb = parseHex(b);
  if (!ra || !rb) return 0;
  return contrast(ra, rb);
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

/**
 * Return `fg` adjusted (as little as possible) so contrast(fg, bg) >= ratio.
 * Blends fg toward black or white — whichever direction can reach the
 * target — binary-searching the smallest sufficient blend. If neither pure
 * black nor pure white reaches the ratio (impossible for ratios <= 21),
 * returns whichever endpoint contrasts more.
 */
export function ensureContrast(fgHex: string, bgHex: string, ratio: number): string {
  const fg = parseHex(fgHex);
  const bg = parseHex(bgHex);
  if (!fg || !bg) return fgHex;
  if (contrast(fg, bg) >= ratio) return fgHex;

  // Search against a small margin so hex rounding can't drop the final
  // value back below the required ratio.
  const target = ratio + 0.05;
  const towards = luminance(bg) > 0.5 ? BLACK : WHITE;
  if (contrast(towards, bg) < ratio) {
    // Background is mid-tone enough that one direction can't get there;
    // pick the better pole.
    return contrast(BLACK, bg) >= contrast(WHITE, bg) ? "#000000" : "#ffffff";
  }

  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (contrast(mix(fg, towards, mid), bg) >= target) hi = mid;
    else lo = mid;
  }
  return toHex(mix(fg, towards, hi));
}
