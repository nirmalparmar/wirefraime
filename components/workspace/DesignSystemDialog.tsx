"use client";

import { useEffect, useRef } from "react";
import { useWorkspace } from "@/lib/store/use-workspace";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Platform } from "@/lib/types";

/* ── Section heading ───────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 mt-6 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70 first:mt-0">
      {children}
    </p>
  );
}

/* ── Color row ─────────────────────────────────────────────── */
function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-foreground/[0.03]">
      <label className="relative grid size-6 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/20">
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <span className="text-[12px] capitalize text-foreground/80">{label}</span>
      <span className="ml-auto font-mono text-[10px] uppercase text-muted-foreground/60 transition-colors group-hover:text-muted-foreground">
        {value}
      </span>
    </div>
  );
}

const COLOR_KEYS = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
  { key: "textMuted", label: "Muted" },
  { key: "border", label: "Border" },
  { key: "success", label: "Success" },
  { key: "error", label: "Error" },
] as const;

const FONT_OPTIONS = [
  "Outfit, system-ui, sans-serif",
  "Plus Jakarta Sans, system-ui, sans-serif",
  "Sora, system-ui, sans-serif",
  "DM Sans, system-ui, sans-serif",
  "Manrope, system-ui, sans-serif",
  "Space Grotesk, system-ui, sans-serif",
  "Playfair Display, Georgia, serif",
  "Cormorant Garamond, Georgia, serif",
  "Libre Baskerville, Georgia, serif",
  "Lora, Georgia, serif",
  "Merriweather, Georgia, serif",
  "Crimson Pro, Georgia, serif",
  "JetBrains Mono, monospace",
  "IBM Plex Mono, monospace",
  "Fira Code, monospace",
  "Source Code Pro, monospace",
  "Bebas Neue, system-ui, sans-serif",
  "Fredoka, system-ui, sans-serif",
  "Quicksand, system-ui, sans-serif",
];

export function DesignSystemPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { state, dispatch } = useWorkspace();
  const { app } = state;
  const ds = app.designSystem;
  const panelRef = useRef<HTMLDivElement>(null);

  /* No SYNC_DS_TO_SCREENS on close anymore — the bridge persists CSS vars +
     fonts into a <style id="ds-live-override"> tag inside each iframe via the
     UPDATE_CSS_VARS postMessage. The auto-save effect picks up the change
     through HTML_UPDATED echoes. No iframe reload, no flicker. */

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!ds || !open) return null;

  const primaryFontName = ds.fonts.primary.split(",")[0].trim();
  const monoFontName = ds.fonts.mono.split(",")[0].trim();

  return (
    <aside
      ref={panelRef}
      className="absolute right-[72px] top-16 z-40 flex w-[320px] flex-col overflow-hidden rounded-3xl border border-foreground/8 bg-background/75 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] backdrop-blur-2xl animate-in fade-in slide-in-from-right-2 duration-200"
      style={{ maxHeight: "calc(100vh - 7rem)" }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-foreground/8 px-5 py-3.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Design System
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="grid size-6 place-items-center rounded-full text-muted-foreground/60 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-5 py-4">
        <SectionLabel>Platform</SectionLabel>
        <Select
          value={app.platform ?? "web"}
          onValueChange={(v) =>
            dispatch({ type: "UPDATE_PLATFORM", platform: v as Platform })
          }
        >
          <SelectTrigger className="h-8 rounded-xl border-foreground/8 bg-foreground/[0.04] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="web" className="text-xs">Web (1440 × 900)</SelectItem>
            <SelectItem value="mobile" className="text-xs">Mobile (390 × 844)</SelectItem>
            <SelectItem value="tablet" className="text-xs">Tablet (1024 × 768)</SelectItem>
          </SelectContent>
        </Select>

        <SectionLabel>Colors</SectionLabel>
        <div className="-mx-1.5 flex flex-col gap-0.5">
          {COLOR_KEYS.map(({ key, label }) => (
            <ColorRow
              key={key}
              label={label}
              value={ds.colors[key as keyof typeof ds.colors] ?? "#000000"}
              onChange={(v) => dispatch({ type: "UPDATE_DS_COLOR", key, value: v })}
            />
          ))}
        </div>

        <SectionLabel>Typography</SectionLabel>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] text-muted-foreground/80">
              Primary
            </label>
            <Select
              value={ds.fonts.primary}
              onValueChange={(v) =>
                dispatch({ type: "UPDATE_DS_FONT", key: "primary", value: v })
              }
            >
              <SelectTrigger className="h-8 rounded-xl border-foreground/8 bg-foreground/[0.04] text-xs">
                <SelectValue>
                  <span style={{ fontFamily: ds.fonts.primary }}>{primaryFontName}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f} className="text-xs">
                    <span style={{ fontFamily: f }}>{f.split(",")[0].trim()}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] text-muted-foreground/80">
              Mono
            </label>
            <Select
              value={ds.fonts.mono}
              onValueChange={(v) =>
                dispatch({ type: "UPDATE_DS_FONT", key: "mono", value: v })
              }
            >
              <SelectTrigger className="h-8 rounded-xl border-foreground/8 bg-foreground/[0.04] text-xs">
                <SelectValue>
                  <span style={{ fontFamily: ds.fonts.mono }}>{monoFontName}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {FONT_OPTIONS.filter((f) => f.includes("mono") || f.includes("Mono") || f.includes("Code")).map((f) => (
                  <SelectItem key={f} value={f} className="text-xs">
                    <span style={{ fontFamily: f }}>{f.split(",")[0].trim()}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SectionLabel>Preview</SectionLabel>
        <div className="rounded-2xl border border-foreground/8 bg-foreground/[0.03] p-3.5">
          <p
            className="mb-0.5 text-[14px] font-semibold leading-tight text-foreground"
            style={{ fontFamily: ds.fonts.primary }}
          >
            Heading preview
          </p>
          <p
            className="text-[11px] leading-relaxed text-muted-foreground"
            style={{ fontFamily: ds.fonts.primary }}
          >
            Body text in {primaryFontName}
          </p>
          <p
            className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground/60"
            style={{ fontFamily: ds.fonts.mono }}
          >
            const mono = &quot;{monoFontName}&quot;;
          </p>
        </div>

        <SectionLabel>Palette</SectionLabel>
        <div className="overflow-hidden rounded-2xl border border-foreground/8">
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ background: ds.colors.primary }}
          >
            <div className="h-1.5 w-1.5 rounded-full bg-white/90" />
            <span className="text-[10px] font-medium text-white/90">{app.name}</span>
          </div>
          <div className="px-3 py-3" style={{ background: ds.colors.background }}>
            <p
              className="mb-1.5 text-[11px] font-semibold"
              style={{ color: ds.colors.text, fontFamily: ds.fonts.primary }}
            >
              Dashboard
            </p>
            <div
              className="mb-2 rounded-lg px-2.5 py-2"
              style={{
                background: ds.colors.surface,
                border: `1px solid ${ds.colors.border}`,
              }}
            >
              <p className="text-[10px]" style={{ color: ds.colors.text }}>
                Card content
              </p>
              <p className="text-[9px]" style={{ color: ds.colors.textMuted }}>
                Secondary text
              </p>
            </div>
            <div className="flex gap-1.5">
              <span
                className="rounded-md px-1.5 py-0.5 text-[9px] text-white"
                style={{ background: ds.colors.success }}
              >
                Success
              </span>
              <span
                className="rounded-md px-1.5 py-0.5 text-[9px] text-white"
                style={{ background: ds.colors.error }}
              >
                Error
              </span>
            </div>
          </div>
        </div>

        <div className="h-2" />
      </div>
    </aside>
  );
}
