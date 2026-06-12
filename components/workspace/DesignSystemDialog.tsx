"use client";

import { useEffect, useRef, useState } from "react";
import ColorPicker from "react-best-gradient-color-picker";
import { useWorkspace } from "@/lib/store/use-workspace";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SoftSurface } from "@/components/ui/soft-ui";
import type { Platform } from "@/lib/types";

/* ── Section heading ───────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/40 first:mt-0">
      {children}
    </p>
  );
}

/* ── Color row ─────────────────────────────────────────────── */
function ColorRow({
  label,
  value,
  onChange,
  allowGradient = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowGradient?: boolean;
}) {
  const [local, setLocal] = useState(value);
  const [open, setOpen] = useState(false);
  const isLocalHex = isHexColor(local);
  const isValueGradient = allowGradient && isGradientColor(local);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function commit(next = local) {
    if (isGradientColor(next)) {
      if (allowGradient && next !== value) onChange(next);
      return;
    }

    if (isHexColor(next) && next.toLowerCase() !== value.toLowerCase()) {
      onChange(next);
    }
  }

  function toRgba(hex: string) {
    const clean = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : "ffffff";
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r},${g},${b},1)`;
  }

  function toHex(next: string) {
    if (isHexColor(next)) return next.toUpperCase();
    const match = next.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return local;
    return `#${[match[1], match[2], match[3]]
      .map((part) => Number(part).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()}`;
  }

  function normalizePickerValue(next: string) {
    if (allowGradient && isGradientColor(next)) return next;
    return toHex(next);
  }

  function pickerValue() {
    if (allowGradient && isGradientColor(local)) return local;
    if (isHexColor(local)) return toRgba(local);
    return isHexColor(value) ? toRgba(value) : "rgba(255,255,255,1)";
  }

  const displayValue = isValueGradient ? "Gradient" : local;

  return (
    <div ref={pickerRef} className="group relative grid grid-cols-[1fr_92px] items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-foreground/[0.035]">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label={`Edit ${label} color`}
          className="size-5 shrink-0 rounded-md border border-foreground/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          style={{ background: value }}
          onClick={() => setOpen((v) => !v)}
        />
        <span className="truncate text-[13px] capitalize text-foreground/75">
          {label}
        </span>
      </div>
      <input
        readOnly={isValueGradient}
        value={displayValue}
        onChange={(e) => setLocal(e.target.value.slice(0, 7))}
        onBlur={() => commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            e.currentTarget.blur();
          }
        }}
        aria-invalid={!isLocalHex && !isValueGradient}
        className="h-7 rounded-[8px] border border-foreground/8 bg-foreground/[0.045] px-2 text-right font-mono text-[11px] uppercase text-foreground/60 outline-none transition read-only:cursor-pointer read-only:font-sans read-only:normal-case focus:border-ws-accent/50 focus:bg-foreground/[0.065] focus:text-foreground focus:ring-2 focus:ring-ws-accent/20 aria-invalid:border-destructive/50"
        onClick={() => {
          if (isValueGradient) setOpen(true);
        }}
      />
      {open && (
        <div className="absolute left-7 top-8 z-50 w-[260px] rounded-xl border border-foreground/10 bg-popover p-2.5 shadow-[var(--ws-soft-lg)] dark:bg-[#1b1b1c]">
          <ColorPicker
            value={pickerValue()}
            onChange={(next) => {
              const normalized = normalizePickerValue(next);
              setLocal(normalized);
              onChange(normalized);
            }}
            width={240}
            height={132}
            hideInputs
            hidePresets
            hideEyeDrop
            hideAdvancedSliders
            hideColorGuide
            hideInputType
            hideColorTypeBtns={!allowGradient}
            hideGradientControls={!allowGradient}
            hideGradientType={!allowGradient}
            hideGradientAngle={!allowGradient}
            hideGradientStop={!allowGradient}
            disableLightMode
            className="wf-rbgcp"
            style={{
              body: {
                width: 240,
                padding: 0,
                background: "transparent",
                boxShadow: "none",
                border: "none",
              },
              rbgcpCanvasWrapper: {
                borderRadius: 10,
                overflow: "hidden",
              },
              rbgcpHandle: {
                width: 14,
                height: 14,
                border: "2px solid white",
                boxShadow: "0 1px 6px rgba(0,0,0,.45)",
              },
            }}
          />
          <div className="mt-2 flex items-center gap-1.5 border-t border-foreground/8 pt-2">
            <span aria-hidden className="size-7 shrink-0 rounded-md border border-foreground/10" style={{ background: isLocalHex || isValueGradient ? local : value }} />
            <input
              readOnly={isValueGradient}
              value={displayValue}
              onChange={(e) => {
                const next = e.target.value.startsWith("#")
                  ? e.target.value
                  : `#${e.target.value}`;
                setLocal(next.slice(0, 7));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                  setOpen(false);
                }
              }}
              className="h-7 min-w-0 flex-1 rounded-md border border-foreground/8 bg-foreground/[0.05] px-2 font-mono text-[10px] uppercase text-foreground outline-none read-only:font-sans read-only:normal-case focus:border-ws-accent/50 focus:ring-2 focus:ring-ws-accent/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function isGradientColor(value: string) {
  return /gradient\(/i.test(value);
}

const COLOR_KEYS = [
  { key: "primary", label: "Primary", allowGradient: true },
  { key: "secondary", label: "Secondary", allowGradient: true },
  { key: "background", label: "Background", allowGradient: true },
  { key: "surface", label: "Surface", allowGradient: true },
  { key: "text", label: "Text", allowGradient: false },
  { key: "textMuted", label: "Muted", allowGradient: false },
  { key: "border", label: "Border", allowGradient: false },
  { key: "success", label: "Success", allowGradient: true },
  { key: "error", label: "Error", allowGradient: true },
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
    <SoftSurface
      ref={panelRef}
      className="absolute right-4 top-4 z-40 flex w-[320px] flex-col overflow-hidden rounded-2xl animate-in fade-in slide-in-from-right-2 duration-200"
      style={{ maxHeight: "calc(100% - 2rem)" }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-foreground/8 px-4 py-3">
        <div>
          <span className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
            Design system
          </span>
          <p className="mt-0.5 text-[12px] text-foreground/45">
            Tokens update the prototype live.
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="wf-icon-button grid size-7 place-items-center rounded-lg"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-3">
        <SectionLabel>Platform</SectionLabel>
        <Select
          value={app.platform ?? "web"}
          onValueChange={(v) =>
            dispatch({ type: "UPDATE_PLATFORM", platform: v as Platform })
          }
        >
          <SelectTrigger className="h-8 w-full rounded-[10px] border-foreground/8 bg-foreground/[0.045] px-2.5 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start" className="min-w-[220px]">
            <SelectItem value="web">Web (1440 × 900)</SelectItem>
            <SelectItem value="mobile">Mobile (390 × 844)</SelectItem>
            <SelectItem value="tablet">Tablet (1024 × 768)</SelectItem>
          </SelectContent>
        </Select>

        <SectionLabel>Colors</SectionLabel>
        <div className="-mx-2 flex flex-col gap-0.5">
          {COLOR_KEYS.map(({ key, label, allowGradient }) => (
            <ColorRow
              key={key}
              label={label}
              value={ds.colors[key as keyof typeof ds.colors] ?? "#000000"}
              allowGradient={allowGradient}
              onChange={(v) => dispatch({ type: "UPDATE_DS_COLOR", key, value: v })}
            />
          ))}
        </div>

        <SectionLabel>Typography</SectionLabel>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground/75">
              Primary
            </label>
            <Select
              value={ds.fonts.primary}
              onValueChange={(v) =>
                dispatch({ type: "UPDATE_DS_FONT", key: "primary", value: v })
              }
            >
              <SelectTrigger className="h-8 w-full rounded-[10px] border-foreground/8 bg-foreground/[0.045] px-2.5 text-[13px]">
                <SelectValue>
                  <span style={{ fontFamily: ds.fonts.primary }}>{primaryFontName}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" align="start" className="max-h-[270px] min-w-[240px]">
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>
                    <span style={{ fontFamily: f }}>{f.split(",")[0].trim()}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground/75">
              Mono
            </label>
            <Select
              value={ds.fonts.mono}
              onValueChange={(v) =>
                dispatch({ type: "UPDATE_DS_FONT", key: "mono", value: v })
              }
            >
              <SelectTrigger className="h-8 w-full rounded-[10px] border-foreground/8 bg-foreground/[0.045] px-2.5 text-[13px]">
                <SelectValue>
                  <span style={{ fontFamily: ds.fonts.mono }}>{monoFontName}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" align="start" className="max-h-[240px] min-w-[240px]">
                {FONT_OPTIONS.filter((f) => f.includes("mono") || f.includes("Mono") || f.includes("Code")).map((f) => (
                  <SelectItem key={f} value={f}>
                    <span style={{ fontFamily: f }}>{f.split(",")[0].trim()}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SectionLabel>Preview</SectionLabel>
        <div className="rounded-lg border border-foreground/8 bg-foreground/[0.035] p-3">
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
        <div className="overflow-hidden rounded-lg border border-foreground/8">
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
    </SoftSurface>
  );
}
