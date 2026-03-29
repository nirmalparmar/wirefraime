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
import { SANS } from "@/lib/constants";

async function exportZip(app: { name: string; screens: { id: string; name: string; html: string }[]; designSystem: unknown }) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  for (const screen of app.screens) {
    if (screen.html) zip.file(`${slug(screen.name)}.html`, screen.html);
  }
  if (app.designSystem) zip.file("design-system.json", JSON.stringify(app.designSystem, null, 2));
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

/* ── Tooltip button ── */
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
      className={`group relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150
        ${active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
        }
        disabled:pointer-events-none disabled:opacity-25`}
    >
      {children}
      {/* Floating label on hover */}
      <span
        className="pointer-events-none absolute right-full mr-2.5 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
        style={{ fontFamily: SANS }}
      >
        {title}
      </span>
    </button>
  );
}

function Divider() {
  return <div className="mx-auto my-1 h-px w-5 bg-border/60" />;
}

const I = 16; // icon size

export function CanvasActions({
  onRegenerate,
  onToggleDesignSystem,
  showDesignSystem,
  showCodeView,
  onToggleCode,
}: {
  onRegenerate?: () => void;
  onToggleDesignSystem?: () => void;
  showDesignSystem?: boolean;
  showCodeView?: boolean;
  onToggleCode?: () => void;
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
    try { await exportZip({ name: app.name, screens: app.screens, designSystem: app.designSystem }); }
    finally { setIsExporting(false); }
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
    <div className="absolute right-3 top-14 z-30 flex flex-col gap-0.5 rounded-xl border border-border/80 bg-background/70 p-1.5 shadow-lg backdrop-blur-2xl">
      {/* History */}
      <ActionBtn onClick={() => dispatch({ type: "UNDO" })} disabled={undoStack.length === 0} title="Undo">
        <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9h10a5 5 0 0 1 0 10H11" /><path d="M7 5L3 9l4 4" />
        </svg>
      </ActionBtn>

      <ActionBtn onClick={() => dispatch({ type: "REDO" })} disabled={redoStack.length === 0} title="Redo">
        <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 9H11a5 5 0 0 0 0 10h2" /><path d="M17 5l4 4-4 4" />
        </svg>
      </ActionBtn>

      <Divider />

      {/* View toggles */}
      {screenCount > 0 && (
        <ActionBtn onClick={() => onToggleCode?.()} active={showCodeView} title="Code">
          <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 18l6-6-6-6" /><path d="M8 6l-6 6 6 6" />
          </svg>
        </ActionBtn>
      )}

      {app.designSystem && (
        <ActionBtn onClick={() => onToggleDesignSystem?.()} active={showDesignSystem} title="Design System">
          <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="8" cy="9" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="16" cy="9" r="1.5" fill="currentColor" stroke="none" />
            <path d="M12 21v-6a2 2 0 0 1 2-2h4" />
          </svg>
        </ActionBtn>
      )}

      <Divider />

      {/* Share */}
      {screenCount > 0 && (
        <ActionBtn
          onClick={handleShare}
          disabled={isSharing}
          active={shareState === "copied"}
          title={shareState === "copied" ? "Copied!" : shareState === "failed" ? "Failed" : "Share"}
        >
          {shareState === "copied" ? (
            <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 7" />
            </svg>
          ) : (
            <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V3" /><path d="M8 7l4-4 4 4" /><path d="M20 15v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4" />
            </svg>
          )}
        </ActionBtn>
      )}

      {/* Export */}
      {screenCount > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div>
              <ActionBtn disabled={isExporting} title="Export">
                <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v13" /><path d="M8 12l4 4 4-4" /><path d="M20 19H4" />
                </svg>
              </ActionBtn>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="left" sideOffset={12} className="min-w-40">
            <DropdownMenuItem onClick={handleExportHtml} className="text-xs gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
              </svg>
              Export HTML
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportNextjs} className="text-xs gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M9 15l6-6" /><circle cx="9.5" cy="9.5" r="0.5" fill="currentColor" /><circle cx="14.5" cy="14.5" r="0.5" fill="currentColor" /><rect x="2" y="2" width="20" height="20" rx="5" />
              </svg>
              Export Next.js
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Regenerate */}
      {screenCount > 0 && !isGenerating && (
        <>
          <Divider />
          <ActionBtn onClick={() => onRegenerate?.()} title="Regenerate">
            <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 14.5-7.1" /><path d="M21 12a9 9 0 0 1-14.5 7.1" />
              <path d="M18 2v4h-4" /><path d="M6 22v-4h4" />
            </svg>
          </ActionBtn>
        </>
      )}

      <Divider />

      {/* Theme */}
      <ActionBtn onClick={toggle} title={theme === "dark" ? "Light mode" : "Dark mode"}>
        {theme === "dark" ? (
          <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </ActionBtn>
    </div>
  );
}
