export const SERIF = "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif";
export const SANS = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif";
export const STORAGE_KEY = "wirefraime-apps";
export const CANVAS_W = 1440;
export const CANVAS_H = 900;

/** Viewport dimensions per platform */
export const VIEWPORTS: Record<string, { w: number; h: number }> = {
  web:    { w: 1440, h: 900 },
  mobile: { w: 390,  h: 844 },
  tablet: { w: 1024, h: 768 },
};

/* ── Workspace color palette (CSS variables — responds to dark/light theme) ── */
export const C = {
  accent:    "var(--primary)",
  wsAccent:  "var(--ws-accent)",           /* blue selection color for workspace */
  text:      "var(--foreground)",
  text2:     "var(--muted-foreground)",
  text3:     "color-mix(in oklch, var(--muted-foreground) 65%, transparent)",
  text4:     "color-mix(in oklch, var(--muted-foreground) 40%, transparent)",
  canvas:    "var(--canvas-bg)",
  panel:     "var(--card)",
  border:    "var(--border)",
  borderSub: "color-mix(in oklch, var(--foreground) 5%, transparent)",
  borderMed: "color-mix(in oklch, var(--foreground) 14%, transparent)",
} as const;
