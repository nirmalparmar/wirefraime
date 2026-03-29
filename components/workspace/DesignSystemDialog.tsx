"use client";

import { useEffect, useRef } from "react";
import { useWorkspace } from "@/lib/store/use-workspace";
import { SANS } from "@/lib/constants";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Platform } from "@/lib/types";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 first:mt-0"
      style={{ fontFamily: SANS }}
    >
      {children}
    </p>
  );
}

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
    <div className="group flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-foreground/[0.03]">
      <div className="relative shrink-0">
        <div
          className="h-5 w-5 rounded-md border border-border/60 shadow-sm"
          style={{ background: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <Label
        className="w-[56px] shrink-0 text-[11px] font-normal capitalize text-foreground/70"
        style={{ fontFamily: SANS }}
      >
        {label}
      </Label>
      <span className="ml-auto font-mono text-[10px] text-muted-foreground/50 transition-colors group-hover:text-muted-foreground/80">
        {value.toUpperCase()}
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
  const wasOpenRef = useRef(open);

  // Sync design system to screens when panel closes
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      dispatch({ type: "SYNC_DS_TO_SCREENS" });
    }
    wasOpenRef.current = open;
  }, [open, dispatch]);

  // Close on Escape
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
    <div
      ref={panelRef}
      className="absolute right-14 top-14 z-40 flex w-[320px] flex-col rounded-xl border border-border/80 bg-background/80 shadow-xl backdrop-blur-2xl animate-in fade-in slide-in-from-right-2 duration-200"
      style={{ fontFamily: SANS, maxHeight: "calc(100vh - 7rem)" }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <circle cx="12" cy="12" r="10" />
            <circle cx="8" cy="9" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="16" cy="9" r="1.5" fill="currentColor" stroke="none" />
            <path d="M12 21v-6a2 2 0 0 1 2-2h4" />
          </svg>
          <span className="text-xs font-semibold text-foreground">Design System</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-3">
        {/* Platform */}
        <SectionLabel>Platform</SectionLabel>
        <Select
          value={app.platform ?? "web"}
          onValueChange={(v) =>
            dispatch({ type: "UPDATE_PLATFORM", platform: v as Platform })
          }
        >
          <SelectTrigger className="mb-2 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="web" className="text-xs">Web (1440 x 900)</SelectItem>
            <SelectItem value="mobile" className="text-xs">Mobile (390 x 844)</SelectItem>
            <SelectItem value="tablet" className="text-xs">Tablet (1024 x 768)</SelectItem>
          </SelectContent>
        </Select>

        {/* Colors */}
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

        {/* Typography */}
        <SectionLabel>Typography</SectionLabel>

        <div className="mb-2">
          <Label
            className="mb-1 block text-[11px] font-normal text-muted-foreground/70"
            style={{ fontFamily: SANS }}
          >
            Primary font
          </Label>
          <Select
            value={ds.fonts.primary}
            onValueChange={(v) => dispatch({ type: "UPDATE_DS_FONT", key: "primary", value: v })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue>
                <span style={{ fontFamily: ds.fonts.primary }}>{primaryFontName}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f} value={f} className="text-xs">
                  <span style={{ fontFamily: f }}>{f.split(",")[0].trim()}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-2">
          <Label
            className="mb-1 block text-[11px] font-normal text-muted-foreground/70"
            style={{ fontFamily: SANS }}
          >
            Mono font
          </Label>
          <Select
            value={ds.fonts.mono}
            onValueChange={(v) => dispatch({ type: "UPDATE_DS_FONT", key: "mono", value: v })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue>
                <span style={{ fontFamily: ds.fonts.mono }}>{monoFontName}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.filter((f) => f.includes("mono") || f.includes("Mono") || f.includes("Code")).map((f) => (
                <SelectItem key={f} value={f} className="text-xs">
                  <span style={{ fontFamily: f }}>{f.split(",")[0].trim()}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        <SectionLabel>Preview</SectionLabel>
        <div className="mb-3 rounded-lg border border-border/60 bg-foreground/[0.02] p-2.5">
          <p
            className="mb-0.5 text-[13px] font-semibold leading-tight text-foreground"
            style={{ fontFamily: ds.fonts.primary }}
          >
            Heading Preview
          </p>
          <p
            className="text-[11px] leading-relaxed text-muted-foreground"
            style={{ fontFamily: ds.fonts.primary }}
          >
            Body text in {primaryFontName}
          </p>
          <p
            className="mt-1 text-[10px] leading-relaxed text-muted-foreground/60"
            style={{ fontFamily: ds.fonts.mono }}
          >
            const mono = &quot;{monoFontName}&quot;;
          </p>
        </div>

        {/* Palette preview */}
        <SectionLabel>Palette</SectionLabel>
        <div className="overflow-hidden rounded-lg border border-border/60">
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ background: ds.colors.primary }}
          >
            <div className="h-1.5 w-1.5 rounded-full bg-white/90" />
            <span className="text-[10px] font-medium text-white/90">
              {app.name}
            </span>
          </div>
          <div className="px-3 py-2.5" style={{ background: ds.colors.background }}>
            <p className="mb-1 text-[11px] font-semibold" style={{ color: ds.colors.text, fontFamily: ds.fonts.primary }}>
              Dashboard
            </p>
            <div
              className="mb-1.5 rounded px-2 py-1.5"
              style={{ background: ds.colors.surface, border: `1px solid ${ds.colors.border}` }}
            >
              <p className="text-[9px]" style={{ color: ds.colors.text }}>Card content</p>
              <p className="text-[8px]" style={{ color: ds.colors.textMuted }}>Secondary text</p>
            </div>
            <div className="flex gap-1.5">
              <span
                className="rounded px-1.5 py-0.5 text-[8px] text-white"
                style={{ background: ds.colors.success }}
              >
                Success
              </span>
              <span
                className="rounded px-1.5 py-0.5 text-[8px] text-white"
                style={{ background: ds.colors.error }}
              >
                Error
              </span>
            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-2" />
      </div>
    </div>
  );
}
