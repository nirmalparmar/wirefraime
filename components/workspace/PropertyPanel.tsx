"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useWorkspace, type SelectedElement } from "@/lib/store/use-workspace";
import { SoftSurface } from "@/components/ui/soft-ui";

/* ── Helpers ─────────────────────────────────────────────── */

function rgbToHex(rgb: string): string {
  if (!rgb) return "#000000";
  if (rgb.startsWith("#")) return rgb.length >= 7 ? rgb.slice(0, 7) : "#000000";
  const m = rgb.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return "#000000";
  return `#${((1 << 24) + (+m[1] << 16) + (+m[2] << 8) + +m[3]).toString(16).slice(1)}`;
}

function gs(el: SelectedElement, key: string): string {
  return (el.styles as Record<string, string>)?.[key] ?? "";
}

function roundPx(v: string): string {
  return v.replace(/(\d+\.\d+)px/g, (_, n) => `${Math.round(parseFloat(n))}px`);
}

function normalizeWeight(v: string): string {
  const trimmed = (v || "").toLowerCase().trim();
  if (trimmed === "normal") return "400";
  if (trimmed === "bold") return "700";
  if (trimmed === "lighter") return "300";
  if (trimmed === "bolder") return "700";
  return v;
}

function isFlex(display: string): boolean {
  return display === "flex" || display === "inline-flex";
}

/** Step a CSS length with the arrow keys: 16px → 17px (Shift = ±10). */
function stepValue(v: string, delta: number): string | null {
  const m = v.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%)?$/);
  if (!m) return null;
  const unit = m[2] ?? "px";
  const step = unit === "rem" || unit === "em" ? delta * 0.125 : delta;
  const next = Math.round((parseFloat(m[1]) + step) * 1000) / 1000;
  return `${next}${unit}`;
}

function handleStepKey(
  e: React.KeyboardEvent<HTMLInputElement>,
  current: string,
  apply: (v: string) => void
): boolean {
  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return false;
  const delta = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : 1);
  const next = stepValue(current, delta);
  if (next === null) return false;
  e.preventDefault();
  apply(next);
  return true;
}

/* ── Neumorphic shadow tokens ────────────────────────────── */

const SOFT_SHADOW = "shadow-[var(--ws-soft)]";
const INSET_SOFT = "shadow-[var(--ws-inset)]";
const RAISED_SOFT = "shadow-[var(--ws-raised)]";

/* ── Primitives ──────────────────────────────────────────── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/40">
        {label}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-5 h-px bg-foreground/[0.05]" />;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[52px] shrink-0 text-[13px] text-foreground/60">{label}</span>
      <div className="flex flex-1 items-center gap-2">{children}</div>
    </div>
  );
}

/* ── Fields ──────────────────────────────────────────────── */

function ColorField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
}) {
  const hex = rgbToHex(value);
  // rAF-throttled commit — the native color picker fires onChange continuously
  // during drag (often 60+ times/sec). Without this, the bridge serializes the
  // full document on every event and the canvas grinds.
  const pendingRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  function scheduleCommit(next: string) {
    pendingRef.current = next;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const v = pendingRef.current;
      pendingRef.current = null;
      if (v !== null) onCommit(v);
    });
  }

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <FieldRow label={label}>
      <label
        className={`relative grid size-7 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg transition ${RAISED_SOFT}`}
      >
        <span aria-hidden className="absolute inset-0" style={{ background: hex }} />
        <input
          type="color"
          value={hex}
          onChange={(e) => scheduleCommit(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <span className="font-mono text-[11px] uppercase tracking-wide text-foreground/60">{hex}</span>
    </FieldRow>
  );
}

function EditableField({
  label,
  value,
  onCommit,
  placeholder,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  const prev = useRef(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== prev.current) {
      setLocal(value);
      prev.current = value;
    }
  }, [value]);

  function commit() {
    if (local !== value) onCommit(local);
  }

  return (
    <FieldRow label={label}>
      <input
        ref={inputRef}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (
            handleStepKey(e, local, (v) => {
              setLocal(v);
              onCommit(v);
            })
          )
            return;
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            inputRef.current?.blur();
          }
        }}
        placeholder={placeholder}
        className={`h-8 w-full rounded-[10px] bg-foreground/[0.04] px-3 font-mono text-[12px] text-foreground/85 outline-none transition placeholder:text-muted-foreground/40 focus:bg-foreground/[0.06] focus:ring-2 focus:ring-ws-accent/40 ${INSET_SOFT}`}
      />
    </FieldRow>
  );
}

/* Generic native select styled to match the panel. Used for weight, display,
   flex alignment, border style — fast, keyboard-accessible, zero extra deps. */
function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  const known = options.some((o) => o.v === value);
  return (
    <FieldRow label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 w-full cursor-pointer rounded-[10px] bg-foreground/[0.04] px-3 text-[13px] text-foreground/85 outline-none transition focus:bg-foreground/[0.06] focus:ring-2 focus:ring-ws-accent/40 ${INSET_SOFT}`}
      >
        {!known && value && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </FieldRow>
  );
}

function AlignButtons({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = ["left", "center", "right"] as const;
  const active = value === "start" || value === "" ? "left" : value;
  return (
    <FieldRow label="Align">
      <div className={`flex flex-1 items-center gap-0.5 rounded-xl bg-foreground/[0.04] p-0.5 ${INSET_SOFT}`}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            title={o}
            className={`grid h-7 flex-1 place-items-center rounded-lg transition ${
              active === o
                ? `bg-card text-foreground ${RAISED_SOFT}`
                : "text-muted-foreground hover:text-foreground/80"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              {o === "left" && (
                <>
                  <rect x="1" y="2" width="12" height="1.5" rx="0.5" fill="currentColor" />
                  <rect x="1" y="6" width="8" height="1.5" rx="0.5" fill="currentColor" />
                  <rect x="1" y="10" width="10" height="1.5" rx="0.5" fill="currentColor" />
                </>
              )}
              {o === "center" && (
                <>
                  <rect x="1" y="2" width="12" height="1.5" rx="0.5" fill="currentColor" />
                  <rect x="3" y="6" width="8" height="1.5" rx="0.5" fill="currentColor" />
                  <rect x="2" y="10" width="10" height="1.5" rx="0.5" fill="currentColor" />
                </>
              )}
              {o === "right" && (
                <>
                  <rect x="1" y="2" width="12" height="1.5" rx="0.5" fill="currentColor" />
                  <rect x="5" y="6" width="8" height="1.5" rx="0.5" fill="currentColor" />
                  <rect x="3" y="10" width="10" height="1.5" rx="0.5" fill="currentColor" />
                </>
              )}
            </svg>
          </button>
        ))}
      </div>
    </FieldRow>
  );
}

const WEIGHTS = [
  { v: "300", l: "Light" },
  { v: "400", l: "Regular" },
  { v: "500", l: "Medium" },
  { v: "600", l: "Semibold" },
  { v: "700", l: "Bold" },
];

function WeightSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return <SelectField label="Weight" value={normalizeWeight(value)} options={WEIGHTS} onChange={onChange} />;
}

function OpacitySlider({
  value,
  onChange,
  onReset,
}: {
  value: string;
  onChange: (v: string) => void;
  onReset: () => void;
}) {
  const num = parseFloat(value);
  const safe = isNaN(num) ? 1 : num;
  const isDimmed = safe < 1;

  // rAF-throttle so drag events don't fire 60+ APPLY_EDITs per second
  const pendingRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  function scheduleChange(v: string) {
    pendingRef.current = v;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const next = pendingRef.current;
      pendingRef.current = null;
      if (next !== null) onChange(next);
    });
  }
  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <FieldRow label="Opacity">
      <input
        type="range"
        min="0.1"
        max="1"
        step="0.05"
        value={safe}
        onChange={(e) => scheduleChange(e.target.value)}
        className="h-1 flex-1 cursor-pointer accent-ws-accent"
      />
      <button
        type="button"
        onClick={onReset}
        disabled={!isDimmed}
        title={isDimmed ? "Reset to 100%" : "Opacity is 100%"}
        className={`w-[44px] shrink-0 rounded-md px-1 py-0.5 text-right font-mono text-[11px] tabular-nums transition ${
          isDimmed
            ? "cursor-pointer text-foreground hover:bg-foreground/[0.06]"
            : "cursor-default text-muted-foreground/70"
        }`}
      >
        {Math.round(safe * 100)}%
      </button>
    </FieldRow>
  );
}

/* ── Spacing (padding / margin) ───────────────────────────────
   Linked mode edits all four sides at once; unlink to edit T/R/B/L
   individually. Reads per-side computed values from the bridge. */

const SIDE_KEYS = ["Top", "Right", "Bottom", "Left"] as const;

function MiniInput({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder: string;
  onCommit: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) {
      setLocal(value);
      prev.current = value;
    }
  }, [value]);
  function commit() {
    if (local !== value) onCommit(local);
  }
  return (
    <input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (
          handleStepKey(e, local, (v) => {
            setLocal(v);
            onCommit(v);
          })
        )
          return;
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder={placeholder}
      className={`h-7 w-full rounded-lg bg-foreground/[0.04] px-2 text-center font-mono text-[11px] text-foreground/85 outline-none transition placeholder:text-muted-foreground/40 focus:bg-foreground/[0.06] focus:ring-2 focus:ring-ws-accent/40 ${INSET_SOFT}`}
    />
  );
}

function SpacingField({
  label,
  prop,
  el,
  onSide,
  onAll,
}: {
  label: string;
  prop: "padding" | "margin";
  el: SelectedElement;
  onSide: (side: string, value: string) => void;
  onAll: (value: string) => void;
}) {
  const vals = SIDE_KEYS.map((s) => roundPx(gs(el, prop + s)) || "0px");
  const uniform = vals.every((v) => v === vals[0]);
  const [linked, setLinked] = useState(uniform);

  // Reset link default when the selected element changes.
  const prevXpath = useRef(el.xpath);
  useEffect(() => {
    if (prevXpath.current !== el.xpath) {
      prevXpath.current = el.xpath;
      setLinked(uniform);
    }
  }, [el.xpath, uniform]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-foreground/60">{label}</span>
        <button
          type="button"
          onClick={() => setLinked((v) => !v)}
          title={linked ? "Edit sides individually" : "Link all sides"}
          className={`grid size-6 place-items-center rounded-md text-[10px] transition ${
            linked
              ? `bg-ws-accent/15 text-ws-accent ${RAISED_SOFT}`
              : `text-muted-foreground/70 hover:text-foreground ${INSET_SOFT}`
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {linked ? (
              <path d="M5.5 8.5l3-3M6 3.5l.7-.7a2.5 2.5 0 013.5 3.5l-.7.7M8 10.5l-.7.7a2.5 2.5 0 01-3.5-3.5l.7-.7" />
            ) : (
              <>
                <path d="M6 3.5l.7-.7a2.5 2.5 0 013.5 3.5l-.7.7M8 10.5l-.7.7a2.5 2.5 0 01-3.5-3.5l.7-.7" />
                <path d="M2 2l10 10" opacity="0.5" />
              </>
            )}
          </svg>
        </button>
      </div>
      {linked ? (
        <MiniInput
          value={uniform ? vals[0] : ""}
          placeholder={uniform ? "0px" : "Mixed"}
          onCommit={onAll}
        />
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {SIDE_KEYS.map((s, i) => (
            <div key={s} className="space-y-1">
              <MiniInput value={vals[i]} placeholder="0" onCommit={(v) => onSide(s, v)} />
              <span className="block text-center text-[9px] uppercase tracking-wide text-muted-foreground/50">
                {s[0]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TextContentEditor({
  textContent,
  onCommit,
}: {
  textContent: string;
  onCommit: (v: string) => void;
}) {
  const [local, setLocal] = useState(textContent);
  const prev = useRef(textContent);

  useEffect(() => {
    if (textContent !== prev.current) {
      setLocal(textContent);
      prev.current = textContent;
    }
  }, [textContent]);

  function commit() {
    if (local !== textContent) onCommit(local);
  }

  return (
    <Section label="Content">
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
        }}
        className={`h-16 w-full resize-none rounded-[10px] bg-foreground/[0.04] px-3 py-2.5 text-[13px] leading-[1.6] text-foreground/85 outline-none transition placeholder:text-muted-foreground/40 focus:bg-foreground/[0.06] focus:ring-2 focus:ring-ws-accent/40 ${INSET_SOFT}`}
        placeholder="Text content..."
      />
    </Section>
  );
}

/* ── Selection chip ──────────────────────────────────────── */

function SelectionChip({ tag, className }: { tag: string; className?: string }) {
  const firstClass = className?.split(/\s+/).filter(Boolean)[0];
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full bg-foreground/[0.04] px-2.5 py-1 ${INSET_SOFT}`}
    >
      <span className="size-1.5 rounded-full bg-ws-accent" />
      <span className="font-mono text-[11px] text-foreground/80">&lt;{tag}&gt;</span>
      {firstClass && (
        <span className="max-w-[80px] truncate font-mono text-[10px] text-muted-foreground/70">
          .{firstClass}
        </span>
      )}
    </div>
  );
}

/* ── Flex layout option sets ─────────────────────────────── */

const DISPLAY_OPTS = [
  { v: "block", l: "Block" },
  { v: "flex", l: "Flex" },
  { v: "inline-flex", l: "Inline flex" },
  { v: "grid", l: "Grid" },
  { v: "inline-block", l: "Inline block" },
];
const DIRECTION_OPTS = [
  { v: "row", l: "Row →" },
  { v: "column", l: "Column ↓" },
  { v: "row-reverse", l: "Row reverse" },
  { v: "column-reverse", l: "Column reverse" },
];
const ALIGN_OPTS = [
  { v: "stretch", l: "Stretch" },
  { v: "flex-start", l: "Start" },
  { v: "center", l: "Center" },
  { v: "flex-end", l: "End" },
  { v: "baseline", l: "Baseline" },
];
const JUSTIFY_OPTS = [
  { v: "flex-start", l: "Start" },
  { v: "center", l: "Center" },
  { v: "flex-end", l: "End" },
  { v: "space-between", l: "Space between" },
  { v: "space-around", l: "Space around" },
  { v: "space-evenly", l: "Space evenly" },
];
const BORDER_STYLE_OPTS = [
  { v: "none", l: "None" },
  { v: "solid", l: "Solid" },
  { v: "dashed", l: "Dashed" },
  { v: "dotted", l: "Dotted" },
];

/* ── Main panel ──────────────────────────────────────────── */

export function PropertyPanel({
  iframeRef,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const { state, dispatch } = useWorkspace();
  const { selectedElement } = state;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const sendEdit = useCallback(
    (property: string, value: string) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "APPLY_EDIT",
          wfId: selectedElement?.wfId,
          xpath: selectedElement?.xpath,
          property,
          value,
        },
        "*"
      );
    },
    [selectedElement, iframeRef]
  );

  const applyStyle = useCallback(
    (property: string, value: string) => {
      if (!selectedElement) return;
      sendEdit(property, value);
      dispatch({
        type: "SELECT_ELEMENT",
        element: {
          ...selectedElement,
          styles: { ...selectedElement.styles, [property]: value } as SelectedElement["styles"],
        },
      });
    },
    [selectedElement, sendEdit, dispatch]
  );

  // Apply several style props in one commit — used by linked spacing so all
  // four sides update together (and local state stays coherent for display).
  const applyStyleMany = useCallback(
    (updates: Record<string, string>) => {
      if (!selectedElement) return;
      for (const [property, value] of Object.entries(updates)) sendEdit(property, value);
      dispatch({
        type: "SELECT_ELEMENT",
        element: {
          ...selectedElement,
          styles: { ...selectedElement.styles, ...updates } as SelectedElement["styles"],
        },
      });
    },
    [selectedElement, sendEdit, dispatch]
  );

  const resetStyle = useCallback(
    (property: string) => {
      if (!selectedElement) return;
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "REMOVE_INLINE_STYLE",
            wfId: selectedElement.wfId,
            xpath: selectedElement.xpath,
            properties: [property],
          },
          "*"
        );
      }
      const nextStyles = { ...selectedElement.styles, [property]: property === "opacity" ? "1" : "" };
      dispatch({
        type: "SELECT_ELEMENT",
        element: { ...selectedElement, styles: nextStyles as SelectedElement["styles"] },
      });
    },
    [selectedElement, iframeRef, dispatch]
  );

  const applyTextContent = useCallback(
    (value: string) => {
      if (!selectedElement) return;
      sendEdit("textContent", value);
      dispatch({
        type: "SELECT_ELEMENT",
        element: { ...selectedElement, textContent: value },
      });
    },
    [selectedElement, sendEdit, dispatch]
  );

  const applyClasses = useCallback(
    (className: string) => {
      if (!selectedElement || !iframeRef.current?.contentWindow) return;
      iframeRef.current.contentWindow.postMessage(
        {
          type: "SET_CLASSES",
          wfId: selectedElement.wfId,
          xpath: selectedElement.xpath,
          className,
        },
        "*"
      );
      dispatch({
        type: "SELECT_ELEMENT",
        element: { ...selectedElement, className },
      });
    },
    [selectedElement, iframeRef, dispatch]
  );

  const deleteElement = useCallback(() => {
    if (!selectedElement || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      {
        type: "DELETE_ELEMENT",
        wfId: selectedElement.wfId,
        xpath: selectedElement.xpath,
      },
      "*"
    );
    // The bridge confirms with ELEMENT_SELECTED:null, which closes the panel.
  }, [selectedElement, iframeRef]);

  if (!selectedElement) return null;

  const s = (key: string) => gs(selectedElement, key);
  const isTextNode = selectedElement.textContent.length > 0;
  const isTransparent = s("backgroundColor") === "rgba(0, 0, 0, 0)";
  const isHidden = s("display") === "none";
  const display = s("display");
  const flex = isFlex(display);
  const hasBorder = parseFloat(s("borderWidth")) > 0 || s("borderStyle") === "solid" || s("borderStyle") === "dashed";

  return (
    <SoftSurface
      className={`absolute right-4 top-4 z-20 flex max-h-[calc(100%-32px)] w-[280px] flex-col overflow-hidden rounded-2xl ${SOFT_SHADOW} animate-in slide-in-from-right-4 duration-200`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
          Properties
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              iframeRef.current?.contentWindow?.postMessage({ type: "SELECT_PARENT" }, "*");
            }}
            aria-label="Select parent element"
            title="Select parent (Shift + ↑)"
            className={`grid size-7 place-items-center rounded-full text-muted-foreground/70 transition hover:text-foreground ${RAISED_SOFT}`}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V3M3 6l3-3 3 3" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "SELECT_ELEMENT", element: null })}
            aria-label="Close panel"
            className={`grid size-7 place-items-center rounded-full text-muted-foreground/70 transition hover:text-foreground ${RAISED_SOFT}`}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 3l6 6M9 3l-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Selection summary */}
      <div className="px-4 pb-2.5">
        <SelectionChip tag={selectedElement.tagName} className={selectedElement.className} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none px-4 pb-4">
        {isTextNode && (
          <>
            <TextContentEditor textContent={selectedElement.textContent} onCommit={applyTextContent} />
            <Divider />
          </>
        )}

        {isTextNode && (
          <>
            <Section label="Typography">
              <EditableField
                label="Size"
                value={roundPx(s("fontSize"))}
                onCommit={(v) => applyStyle("fontSize", v)}
                placeholder="16px"
              />
              <WeightSelect value={s("fontWeight")} onChange={(v) => applyStyle("fontWeight", v)} />
              <EditableField
                label="Line"
                value={roundPx(s("lineHeight"))}
                onCommit={(v) => applyStyle("lineHeight", v)}
                placeholder="1.5"
              />
              <EditableField
                label="Spacing"
                value={roundPx(s("letterSpacing"))}
                onCommit={(v) => applyStyle("letterSpacing", v)}
                placeholder="normal"
              />
              <AlignButtons value={s("textAlign")} onChange={(v) => applyStyle("textAlign", v)} />
            </Section>
            <Divider />
          </>
        )}

        <Section label="Color">
          <ColorField label="Text" value={s("color")} onCommit={(v) => applyStyle("color", v)} />
          {!isTransparent && (
            <ColorField
              label="Fill"
              value={s("backgroundColor")}
              onCommit={(v) => applyStyle("backgroundColor", v)}
            />
          )}
          {isTransparent && (
            <button
              type="button"
              onClick={() => applyStyle("backgroundColor", "#ffffff")}
              className={`h-7 rounded-[8px] px-3 text-[12px] font-medium text-muted-foreground transition hover:text-foreground ${INSET_SOFT}`}
            >
              + Add fill
            </button>
          )}
        </Section>

        <Divider />

        <Section label="Layout">
          <SelectField
            label="Display"
            value={display || "block"}
            options={DISPLAY_OPTS}
            onChange={(v) => applyStyle("display", v)}
          />
          {flex && (
            <>
              <SelectField
                label="Flow"
                value={s("flexDirection") || "row"}
                options={DIRECTION_OPTS}
                onChange={(v) => applyStyle("flexDirection", v)}
              />
              <SelectField
                label="Align"
                value={s("alignItems") || "stretch"}
                options={ALIGN_OPTS}
                onChange={(v) => applyStyle("alignItems", v)}
              />
              <SelectField
                label="Justify"
                value={s("justifyContent") || "flex-start"}
                options={JUSTIFY_OPTS}
                onChange={(v) => applyStyle("justifyContent", v)}
              />
              <EditableField
                label="Gap"
                value={roundPx(s("gap"))}
                onCommit={(v) => applyStyle("gap", v)}
                placeholder="0px"
              />
            </>
          )}
        </Section>

        <Divider />

        <Section label="Spacing">
          <SpacingField
            label="Padding"
            prop="padding"
            el={selectedElement}
            onSide={(side, v) => applyStyle("padding" + side, v)}
            onAll={(v) =>
              applyStyleMany({
                paddingTop: v,
                paddingRight: v,
                paddingBottom: v,
                paddingLeft: v,
              })
            }
          />
          <SpacingField
            label="Margin"
            prop="margin"
            el={selectedElement}
            onSide={(side, v) => applyStyle("margin" + side, v)}
            onAll={(v) =>
              applyStyleMany({
                marginTop: v,
                marginRight: v,
                marginBottom: v,
                marginLeft: v,
              })
            }
          />
        </Section>

        <Divider />

        <Section label="Border">
          <EditableField
            label="Width"
            value={roundPx(s("borderWidth"))}
            onCommit={(v) => applyStyle("borderWidth", v)}
            placeholder="0px"
          />
          <SelectField
            label="Style"
            value={s("borderStyle") || "none"}
            options={BORDER_STYLE_OPTS}
            onChange={(v) => applyStyle("borderStyle", v)}
          />
          {hasBorder && (
            <ColorField
              label="Color"
              value={s("borderColor")}
              onCommit={(v) => applyStyle("borderColor", v)}
            />
          )}
        </Section>

        <Divider />

        <Section label="Effects">
          <EditableField
            label="Radius"
            value={roundPx(s("borderRadius"))}
            onCommit={(v) => applyStyle("borderRadius", v)}
            placeholder="0px"
          />
          <OpacitySlider
            value={s("opacity")}
            onChange={(v) => applyStyle("opacity", v)}
            onReset={() => resetStyle("opacity")}
          />
          <FieldRow label="Visible">
            <button
              type="button"
              onClick={() => (isHidden ? resetStyle("display") : applyStyle("display", "none"))}
              className={`h-7 rounded-[8px] px-3 text-[12px] font-medium transition ${
                isHidden
                  ? `bg-foreground/[0.05] text-muted-foreground hover:text-foreground ${INSET_SOFT}`
                  : `bg-ws-accent/15 text-ws-accent ${RAISED_SOFT}`
              }`}
            >
              {isHidden ? "Hidden" : "Visible"}
            </button>
          </FieldRow>
        </Section>

        <Divider />

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/40">
            Advanced
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className={`text-muted-foreground/50 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          >
            <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <Section label="Size">
              <EditableField label="Width" value={roundPx(s("width"))} onCommit={(v) => applyStyle("width", v)} placeholder="auto" />
              <EditableField label="Height" value={roundPx(s("height"))} onCommit={(v) => applyStyle("height", v)} placeholder="auto" />
            </Section>
            <ClassEditor className={selectedElement.className ?? ""} onCommit={applyClasses} />
          </div>
        )}

        <Divider />

        <button
          type="button"
          onClick={deleteElement}
          title="Delete this element (⌘Z to undo)"
          className={`flex h-8 w-full items-center justify-center gap-2 rounded-[10px] text-[12px] font-medium text-red-500/80 transition hover:bg-red-500/[0.06] hover:text-red-500 ${INSET_SOFT}`}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.5 3h9M4.5 3V2a1 1 0 011-1h1a1 1 0 011 1v1M9.5 3l-.5 7a1 1 0 01-1 1H4a1 1 0 01-1-1l-.5-7" />
          </svg>
          Delete element
        </button>
      </div>
    </SoftSurface>
  );
}

/* ── ClassEditor — power-user escape hatch ───────────────── */

function ClassEditor({
  className,
  onCommit,
}: {
  className: string;
  onCommit: (v: string) => void;
}) {
  const [local, setLocal] = useState(className);
  const prev = useRef(className);

  useEffect(() => {
    if (className !== prev.current) {
      setLocal(className);
      prev.current = className;
    }
  }, [className]);

  function commit() {
    const next = local.replace(/\s+/g, " ").trim();
    if (next !== className) onCommit(next);
  }

  return (
    <div className="space-y-2">
      <span className="text-[11px] text-muted-foreground/80">Classes</span>
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
          }
        }}
        placeholder="tailwind classes..."
        className={`min-h-16 w-full resize-y rounded-[10px] bg-foreground/[0.04] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground/85 outline-none transition placeholder:text-muted-foreground/40 focus:bg-foreground/[0.06] focus:ring-2 focus:ring-ws-accent/40 ${INSET_SOFT}`}
      />
      <p className="text-[10px] text-muted-foreground/50">⌘ + Enter to apply</p>
    </div>
  );
}
