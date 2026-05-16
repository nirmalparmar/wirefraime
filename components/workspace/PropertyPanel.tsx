"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useWorkspace, type SelectedElement } from "@/lib/store/use-workspace";

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

/* ── Neumorphic shadow tokens ────────────────────────────── */

const SOFT_SHADOW = "shadow-[var(--ws-soft-lg)]";
const INSET_SOFT = "shadow-[var(--ws-inset)]";
const RAISED_SOFT = "shadow-[var(--ws-raised)]";

/* ── Primitives ──────────────────────────────────────────── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
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
      <span className="w-[48px] shrink-0 text-[12px] text-muted-foreground/80">{label}</span>
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
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            inputRef.current?.blur();
          }
        }}
        placeholder={placeholder}
        className={`h-8 w-full rounded-xl bg-foreground/[0.04] px-3 font-mono text-[12px] text-foreground/85 outline-none transition placeholder:text-muted-foreground/40 focus:bg-foreground/[0.06] focus:ring-2 focus:ring-[#0d99ff]/40 ${INSET_SOFT}`}
      />
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
  const normalized = normalizeWeight(value);
  return (
    <FieldRow label="Weight">
      <select
        value={normalized}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 w-full cursor-pointer rounded-xl bg-foreground/[0.04] px-3 text-[12px] text-foreground/85 outline-none transition focus:bg-foreground/[0.06] focus:ring-2 focus:ring-[#0d99ff]/40 ${INSET_SOFT}`}
      >
        {!WEIGHTS.find((w) => w.v === normalized) && (
          <option value={normalized}>{normalized}</option>
        )}
        {WEIGHTS.map((w) => (
          <option key={w.v} value={w.v}>
            {w.l}
          </option>
        ))}
      </select>
    </FieldRow>
  );
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
        className="h-1 flex-1 cursor-pointer accent-[#0d99ff]"
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
        className={`h-16 w-full resize-none rounded-xl bg-foreground/[0.04] px-3 py-2.5 text-[13px] leading-relaxed text-foreground/85 outline-none transition placeholder:text-muted-foreground/40 focus:bg-foreground/[0.06] focus:ring-2 focus:ring-[#0d99ff]/40 ${INSET_SOFT}`}
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
      <span className="size-1.5 rounded-full bg-[#0d99ff]" />
      <span className="font-mono text-[11px] text-foreground/80">&lt;{tag}&gt;</span>
      {firstClass && (
        <span className="max-w-[80px] truncate font-mono text-[10px] text-muted-foreground/70">
          .{firstClass}
        </span>
      )}
    </div>
  );
}

/* ── Main panel ──────────────────────────────────────────── */

export function PropertyPanel({
  iframeRef,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const { state, dispatch } = useWorkspace();
  const { selectedElement } = state;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const applyStyle = useCallback(
    (property: string, value: string) => {
      if (!selectedElement) return;
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: "APPLY_EDIT", xpath: selectedElement.xpath, property, value },
          "*"
        );
      }
      dispatch({
        type: "SELECT_ELEMENT",
        element: {
          ...selectedElement,
          styles: { ...selectedElement.styles, [property]: value } as SelectedElement["styles"],
        },
      });
    },
    [selectedElement, iframeRef, dispatch]
  );

  const resetStyle = useCallback(
    (property: string) => {
      if (!selectedElement) return;
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "REMOVE_INLINE_STYLE",
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
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: "APPLY_EDIT", xpath: selectedElement.xpath, property: "textContent", value },
          "*"
        );
      }
      dispatch({
        type: "SELECT_ELEMENT",
        element: { ...selectedElement, textContent: value },
      });
    },
    [selectedElement, iframeRef, dispatch]
  );

  const applyClasses = useCallback(
    (className: string) => {
      if (!selectedElement || !iframeRef.current?.contentWindow) return;
      iframeRef.current.contentWindow.postMessage(
        { type: "SET_CLASSES", xpath: selectedElement.xpath, className },
        "*"
      );
      dispatch({
        type: "SELECT_ELEMENT",
        element: { ...selectedElement, className },
      });
    },
    [selectedElement, iframeRef, dispatch]
  );

  if (!selectedElement) return null;

  const s = (key: string) => gs(selectedElement, key);
  const isTextNode = selectedElement.textContent.length > 0;
  const isTransparent = s("backgroundColor") === "rgba(0, 0, 0, 0)";
  const isHidden = s("display") === "none";

  return (
    <aside
      className={`absolute right-[72px] top-4 z-20 flex max-h-[calc(100%-32px)] w-[300px] flex-col overflow-hidden rounded-3xl bg-card ${SOFT_SHADOW} animate-in slide-in-from-right-4 duration-200`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
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
      <div className="px-5 pb-3">
        <SelectionChip tag={selectedElement.tagName} className={selectedElement.className} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none px-5 pb-5">
        {isTextNode && (
          <>
            <TextContentEditor textContent={selectedElement.textContent} onCommit={applyTextContent} />
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
        </Section>

        {isTextNode && (
          <>
            <Divider />
            <Section label="Typography">
              <EditableField
                label="Size"
                value={roundPx(s("fontSize"))}
                onCommit={(v) => applyStyle("fontSize", v)}
                placeholder="16px"
              />
              <WeightSelect value={s("fontWeight")} onChange={(v) => applyStyle("fontWeight", v)} />
              <AlignButtons value={s("textAlign")} onChange={(v) => applyStyle("textAlign", v)} />
            </Section>
          </>
        )}

        <Divider />

        <Section label="Style">
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
              onClick={() => applyStyle("display", isHidden ? "" : "none")}
              className={`h-7 rounded-lg px-3 text-[11px] font-medium transition ${
                isHidden
                  ? `bg-foreground/[0.05] text-muted-foreground hover:text-foreground ${INSET_SOFT}`
                  : `bg-[#0d99ff]/15 text-[#0d99ff] ${RAISED_SOFT}`
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
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
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
          <div className="mt-4">
            <ClassEditor className={selectedElement.className ?? ""} onCommit={applyClasses} />
          </div>
        )}
      </div>
    </aside>
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
        className={`min-h-16 w-full resize-y rounded-xl bg-foreground/[0.04] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground/85 outline-none transition placeholder:text-muted-foreground/40 focus:bg-foreground/[0.06] focus:ring-2 focus:ring-[#0d99ff]/40 ${INSET_SOFT}`}
      />
      <p className="text-[10px] text-muted-foreground/50">⌘ + Enter to apply</p>
    </div>
  );
}
