"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useWorkspace, type SelectedElement } from "@/lib/store/use-workspace";
import { SANS } from "@/lib/constants";
import { Button } from "@/components/ui/button";

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

function parsePx(v: string): number | null {
  const m = v.match(/([\d.]+)\s*px/);
  return m ? parseFloat(m[1]) : null;
}

/* ── Icons ───────────────────────────────────────────────── */

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 3l6 6M9 3l-6 6" />
    </svg>
  );
}

/* ── Tiny components ─────────────────────────────────────── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p
        className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.1em] mb-2.5"
        style={{ fontFamily: SANS }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function ColorField({ label, value, onCommit }: { label: string; value: string; onCommit: (v: string) => void }) {
  const hex = rgbToHex(value);
  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <span className="text-[12px] text-muted-foreground w-[50px] shrink-0" style={{ fontFamily: SANS }}>{label}</span>
      <div className="flex items-center gap-2 flex-1">
        <input
          type="color"
          value={hex}
          onChange={(e) => onCommit(e.target.value)}
          className="w-7 h-7 rounded-md border border-border cursor-pointer bg-transparent p-0.5 shrink-0"
        />
        <span className="text-[12px] font-mono text-foreground/60 uppercase tracking-wide">{hex}</span>
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onCommit,
  placeholder,
  suffix,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  const [local, setLocal] = useState(value);
  const elRef = useRef<HTMLInputElement>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      setLocal(value);
      prevValue.current = value;
    }
  }, [value]);

  function commit() {
    if (local !== value) onCommit(local);
  }

  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <span className="text-[12px] text-muted-foreground w-[50px] shrink-0" style={{ fontFamily: SANS }}>{label}</span>
      <div className="flex items-center gap-1.5 flex-1">
        <input
          ref={elRef}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); elRef.current?.blur(); } }}
          placeholder={placeholder}
          className="h-8 w-full text-[12px] px-2.5 rounded-lg border border-border bg-foreground/[0.04] text-foreground/80 font-mono outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/20 transition-all"
        />
        {suffix && <span className="text-[11px] text-muted-foreground/50 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function AlignButtons({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { v: "left", icon: "left" },
    { v: "center", icon: "center" },
    { v: "right", icon: "right" },
  ];
  const active = value === "start" ? "left" : value;
  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <span className="text-[12px] text-muted-foreground w-[50px] shrink-0" style={{ fontFamily: SANS }}>Align</span>
      <div className="flex border border-border rounded-lg overflow-hidden">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`h-8 w-9 text-[12px] flex items-center justify-center transition-all ${
              active === o.v
                ? "bg-foreground/10 text-foreground/90"
                : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground/60"
            }`}
            title={o.v}
            style={{ fontFamily: SANS }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              {o.v === "left" && (
                <>
                  <rect x="1" y="2" width="12" height="1.5" rx="0.5" fill="currentColor" />
                  <rect x="1" y="6" width="8" height="1.5" rx="0.5" fill="currentColor" />
                  <rect x="1" y="10" width="10" height="1.5" rx="0.5" fill="currentColor" />
                </>
              )}
              {o.v === "center" && (
                <>
                  <rect x="1" y="2" width="12" height="1.5" rx="0.5" fill="currentColor" />
                  <rect x="3" y="6" width="8" height="1.5" rx="0.5" fill="currentColor" />
                  <rect x="2" y="10" width="10" height="1.5" rx="0.5" fill="currentColor" />
                </>
              )}
              {o.v === "right" && (
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
    </div>
  );
}

function WeightSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const weights = [
    { v: "300", l: "Light" },
    { v: "400", l: "Regular" },
    { v: "500", l: "Medium" },
    { v: "600", l: "Semibold" },
    { v: "700", l: "Bold" },
  ];
  const current = weights.find((w) => w.v === value);

  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <span className="text-[12px] text-muted-foreground w-[50px] shrink-0" style={{ fontFamily: SANS }}>Weight</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 flex-1 text-[12px] px-2.5 rounded-lg border border-border bg-foreground/[0.04] text-foreground/80 outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/20 cursor-pointer transition-all"
      >
        {!current && <option value={value}>{value}</option>}
        {weights.map((w) => (
          <option key={w.v} value={w.v}>{w.l}</option>
        ))}
      </select>
    </div>
  );
}

function OpacitySlider({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const num = parseFloat(value) || 1;
  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <span className="text-[12px] text-muted-foreground w-[50px] shrink-0" style={{ fontFamily: SANS }}>Opacity</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={num}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-1.5 accent-primary cursor-pointer"
      />
      <span className="text-[11px] font-mono text-muted-foreground w-[34px] text-right tabular-nums">{Math.round(num * 100)}%</span>
    </div>
  );
}

function TextContentEditor({ textContent, onCommit }: { textContent: string; onCommit: (v: string) => void }) {
  const [local, setLocal] = useState(textContent);
  const prevValue = useRef(textContent);

  useEffect(() => {
    if (textContent !== prevValue.current) {
      setLocal(textContent);
      prevValue.current = textContent;
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
        className="w-full h-16 text-[13px] px-3 py-2.5 rounded-lg border border-border bg-foreground/[0.04] text-foreground/80 resize-none outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/20 transition-all leading-relaxed"
        style={{ fontFamily: SANS }}
        placeholder="Text content..."
      />
    </Section>
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

  const sendEdit = useCallback(
    (property: string, value: string) => {
      if (!selectedElement || !iframeRef.current?.contentWindow) return;
      iframeRef.current.contentWindow.postMessage(
        { type: "APPLY_EDIT", xpath: selectedElement.xpath, property, value },
        "*"
      );
    },
    [selectedElement, iframeRef]
  );

  if (!selectedElement) return null;

  const s = (key: string) => gs(selectedElement, key);
  const isTextNode = selectedElement.textContent.length > 0;
  const isTransparent = s("backgroundColor") === "rgba(0, 0, 0, 0)";
  const isHidden = s("display") === "none";
  const isBold = parseInt(s("fontWeight"), 10) >= 700;

  const handleLarger = () => {
    const current = parsePx(s("fontSize"));
    if (current !== null) sendEdit("fontSize", `${current + 2}px`);
  };

  const handleSmaller = () => {
    const current = parsePx(s("fontSize"));
    if (current !== null && current > 2) sendEdit("fontSize", `${current - 2}px`);
  };

  return (
    <div
      className="absolute right-3 top-3 z-20 w-[280px] max-h-[calc(100%-24px)] overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-background/80 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-right-4 duration-200"
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.1em]">
            Properties
          </span>
          <button
            onClick={() => dispatch({ type: "SELECT_ELEMENT", element: null })}
            className="text-foreground/30 hover:text-foreground/70 p-1 rounded-md hover:bg-foreground/10 transition-colors"
            title="Close panel"
          >
            <CloseIcon />
          </button>
        </div>
        {/* Element info */}
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded-md bg-foreground/[0.06] text-[11px] font-mono text-foreground/70">
            &lt;{selectedElement.tagName}&gt;
          </div>
          <span className="text-[11px] text-muted-foreground/50 font-mono tabular-nums">
            {roundPx(s("width"))} × {roundPx(s("height"))}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-0">
        {/* Text content */}
        {isTextNode && (
          <>
            <TextContentEditor
              textContent={selectedElement.textContent}
              onCommit={(v) => {
                dispatch({ type: "SELECT_ELEMENT", element: { ...selectedElement, textContent: v } });
                sendEdit("textContent", v);
              }}
            />
            <div className="h-px bg-border/60 mb-4" />
          </>
        )}

        {/* Fill & Stroke */}
        <Section label="Color">
          <ColorField label="Text" value={s("color")} onCommit={(v) => sendEdit("color", v)} />
          {!isTransparent && (
            <ColorField label="Fill" value={s("backgroundColor")} onCommit={(v) => sendEdit("backgroundColor", v)} />
          )}
        </Section>

        <div className="h-px bg-border/60 mb-4" />

        {/* Typography */}
        <Section label="Typography">
          <EditableField label="Size" value={roundPx(s("fontSize"))} onCommit={(v) => sendEdit("fontSize", v)} placeholder="16px" />
          <WeightSelect value={s("fontWeight")} onChange={(v) => sendEdit("fontWeight", v)} />
          <AlignButtons value={s("textAlign")} onChange={(v) => sendEdit("textAlign", v)} />
        </Section>

        <div className="h-px bg-border/60 mb-4" />

        {/* Style */}
        <Section label="Style">
          <EditableField label="Radius" value={roundPx(s("borderRadius"))} onCommit={(v) => sendEdit("borderRadius", v)} placeholder="0px" />
          <OpacitySlider value={s("opacity")} onChange={(v) => sendEdit("opacity", v)} />
        </Section>

        <div className="h-px bg-border/60 mb-4" />

        {/* Quick actions */}
        <Section label="Quick Actions">
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: isHidden ? "Show" : "Hide", action: () => sendEdit("display", isHidden ? "block" : "none"), active: false },
              { label: "Bold", action: () => sendEdit("fontWeight", isBold ? "400" : "700"), active: isBold },
              { label: "A+", action: handleLarger, active: false },
              { label: "A-", action: handleSmaller, active: false },
              { label: "Pill", action: () => sendEdit("borderRadius", "9999px"), active: false },
              { label: "Sharp", action: () => sendEdit("borderRadius", "0px"), active: false },
              { label: "No Fill", action: () => sendEdit("backgroundColor", "transparent"), active: false },
            ].map((btn) => (
              <Button
                key={btn.label}
                variant={btn.active ? "default" : "outline"}
                size="sm"
                className="h-7 text-[11px] px-2.5 rounded-md"
                onClick={btn.action}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
