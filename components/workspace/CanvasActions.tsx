"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/store/use-workspace";
import { useTheme } from "@/components/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { SoftIconButton } from "@/components/ui/soft-ui";

/* ── ZIP export ────────────────────────────────────────────── */
async function exportZip(app: {
  name: string;
  screens: { id: string; name: string; html: string }[];
  designSystem: unknown;
}) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  for (const screen of app.screens) {
    if (screen.html) zip.file(`${slug(screen.name)}.html`, screen.html);
  }
  if (app.designSystem)
    zip.file("design-system.json", JSON.stringify(app.designSystem, null, 2));

  const index = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${app.name}</title></head><body>
${app.screens.map((s) => `<a href="${slug(s.name)}.html">${s.name}</a>`).join("\n")}
</body></html>`;
  zip.file("index.html", index);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(app.name)}-screens.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Action button ────────────────────────────────────────── */
function ActionBtn({
  onClick,
  disabled,
  active,
  title,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`group relative flex size-8 items-center justify-center rounded-[8px] transition-all disabled:pointer-events-none disabled:opacity-25 ${
        active
          ? "bg-ws-accent/15 text-ws-accent"
          : "text-white/40 hover:bg-white/[0.07] hover:text-white/80"
      }`}
    >
      {children}
      <span className="pointer-events-none absolute right-full mr-2.5 whitespace-nowrap rounded-lg border border-white/[0.08] bg-[oklch(0.16_0.004_280)] px-2.5 py-1.5 text-[10px] font-medium tracking-wide text-white/70 opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100">
        {title}
      </span>
    </button>
  );
}

function Divider() {
  return <div className="mx-auto my-1 h-px w-5 bg-white/[0.07]" />;
}

const I = 14;

export function CanvasActions({
  onRegenerate,
  onToggleDesignSystem,
  showDesignSystem,
  showCodeView,
  onToggleCode,
  onFitView,
}: {
  onRegenerate?: () => void;
  onToggleDesignSystem?: () => void;
  showDesignSystem?: boolean;
  showCodeView?: boolean;
  onToggleCode?: () => void;
  onFitView?: () => void;
}) {
  const { state, dispatch } = useWorkspace();
  const { theme, toggle } = useTheme();
  const { app, isGenerating, undoStack, redoStack } = state;
  const [isExporting, setIsExporting] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");
  const [isSharing, setIsSharing] = useState(false);
  const screenCount = app.screens.length;

  async function handleExportHtml() {
    if (isExporting || screenCount === 0) return;
    setIsExporting(true);
    try {
      await exportZip({ name: app.name, screens: app.screens, designSystem: app.designSystem });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportNextjs() {
    if (isExporting || screenCount === 0) return;
    setIsExporting(true);
    try {
      const { exportNextjsZip } = await import("@/lib/export-nextjs");
      await exportNextjsZip(app);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleShare() {
    if (isSharing || screenCount === 0) return;
    setIsSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(app),
      });
      const { url } = await res.json();
      await navigator.clipboard.writeText(window.location.origin + url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    } catch {
      setShareState("failed");
      setTimeout(() => setShareState("idle"), 2000);
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div className="absolute right-3 top-3 z-30 flex flex-col gap-px rounded-[14px] border border-white/[0.07] bg-[oklch(0.155_0.004_280/0.97)] p-1.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.64),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
      {/* History */}
      <ActionBtn onClick={() => dispatch({ type: "UNDO" })} disabled={undoStack.length === 0} title="Undo">
        <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9h10a5 5 0 0 1 0 10H11" />
          <path d="M7 5L3 9l4 4" />
        </svg>
      </ActionBtn>

      <ActionBtn onClick={() => dispatch({ type: "REDO" })} disabled={redoStack.length === 0} title="Redo">
        <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 9H11a5 5 0 0 0 0 10h2" />
          <path d="M17 5l4 4-4 4" />
        </svg>
      </ActionBtn>

      <ActionBtn onClick={onFitView} disabled={screenCount === 0} title="Fit view">
        <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
        </svg>
      </ActionBtn>

      <Divider />

      {screenCount > 0 && (
        <ActionBtn onClick={() => onToggleCode?.()} active={showCodeView} title="Code">
          <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
          </svg>
        </ActionBtn>
      )}

      {app.designSystem && (
        <ActionBtn onClick={() => onToggleDesignSystem?.()} active={showDesignSystem} title="Design System">
          <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="8" cy="9" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="16" cy="9" r="1.5" fill="currentColor" stroke="none" />
            <path d="M12 21v-6a2 2 0 0 1 2-2h4" />
          </svg>
        </ActionBtn>
      )}

      {screenCount > 0 && (
        <>
          <Divider />
          <ActionBtn
            onClick={handleShare}
            disabled={isSharing}
            active={shareState === "copied"}
            title={shareState === "copied" ? "Copied!" : "Share"}
          >
            {shareState === "copied" ? (
              <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            ) : (
              <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V3M8 7l4-4 4 4M20 15v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4" />
              </svg>
            )}
          </ActionBtn>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <ActionBtn disabled={isExporting} title="Export">
                  <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v13M8 12l4 4 4-4M20 19H4" />
                  </svg>
                </ActionBtn>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="left" sideOffset={14} className="min-w-40 rounded-xl border border-white/[0.08] bg-[oklch(0.16_0.004_280)] shadow-[0_24px_56px_-12px_rgba(0,0,0,0.72)]">
              <DropdownMenuItem onClick={handleExportHtml} className="gap-2 rounded-lg text-xs text-white/70 hover:text-white/90 focus:text-white/90">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                Export HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportNextjs} className="gap-2 rounded-lg text-xs text-white/70 hover:text-white/90 focus:text-white/90">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                  <path d="M9 15l6-6" />
                  <circle cx="9.5" cy="9.5" r="0.5" fill="currentColor" />
                  <circle cx="14.5" cy="14.5" r="0.5" fill="currentColor" />
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                </svg>
                Export Next.js
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {screenCount > 0 && !isGenerating && (
        <>
          <Divider />
          <ActionBtn onClick={() => onRegenerate?.()} title="Regenerate">
            <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 14.5-7.1M21 12a9 9 0 0 1-14.5 7.1" />
              <path d="M18 2v4h-4M6 22v-4h4" />
            </svg>
          </ActionBtn>
        </>
      )}

      <Divider />

      <ActionBtn onClick={toggle} title={theme === "dark" ? "Light mode" : "Dark mode"}>
        {theme === "dark" ? (
          <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </ActionBtn>
    </div>
  );
}
