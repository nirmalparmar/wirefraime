"use client";

import { useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/lib/store/use-workspace";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

/* ── Prop types ─────────────────────────────────────────────── */
export interface WorkspaceTopbarProps {
  onFocusScreen: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onFitView: () => void;
  showCodeView: boolean;
  onToggleCode: () => void;
  showDesignSystem: boolean;
  onToggleDesignSystem: () => void;
  onShare: () => Promise<void>;
  onExportHtml: () => Promise<void>;
  onExportNextjs: () => Promise<void>;
  onRegenerate: () => void;
  isGenerating: boolean;
  screenCount: number;
  hasDesignSystem: boolean;
}

/* ── Icon size ──────────────────────────────────────────────── */
const I = 15;

/* ── Tooltip wrapper ────────────────────────────────────────── */
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group/tip relative flex items-center">
      {children}
      <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-foreground/6 bg-popover px-2 py-1 text-xs font-medium text-foreground/70 opacity-0 shadow-sm transition-opacity duration-100 group-hover/tip:opacity-100">
        {label}
      </span>
    </div>
  );
}

/* ── Ghost icon button ──────────────────────────────────────── */
function IconBtn({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Tip label={title}>
      <button
        onClick={onClick}
        disabled={disabled}
        className="flex size-8 items-center justify-center rounded-lg text-foreground transition-all hover:bg-foreground/6 hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
      >
        {children}
      </button>
    </Tip>
  );
}

/* ── Segmented view-mode tab ────────────────────────────────── */
function SegTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors ${
        active
          ? "btn-fx text-foreground"
          : "text-foreground/55 hover:text-foreground/80"
      }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function VDivider() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-border" />;
}

/* ── WorkspaceTopbar ────────────────────────────────────────── */
export function WorkspaceTopbar({
  onFocusScreen,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onFitView,
  showCodeView,
  onToggleCode,
  showDesignSystem,
  onToggleDesignSystem,
  onShare,
  onExportHtml,
  onExportNextjs,
  onRegenerate,
  isGenerating,
  screenCount,
  hasDesignSystem,
}: WorkspaceTopbarProps) {
  const { state, dispatch } = useWorkspace();
  const { app, activeScreenId } = state;

  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");
  const [isSharing, setIsSharing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const activeScreen = app.screens.find((s) => s.id === activeScreenId);
  const isPreview = !showCodeView && !showDesignSystem;

  /* ── View-mode switching (mutually exclusive) ── */
  function selectPreview() {
    if (showCodeView) onToggleCode();
    if (showDesignSystem) onToggleDesignSystem();
  }
  function selectCode() {
    if (showDesignSystem) onToggleDesignSystem();
    onToggleCode();
  }
  function selectDesign() {
    if (showCodeView) onToggleCode();
    onToggleDesignSystem();
  }

  async function handleShare() {
    if (isSharing || screenCount === 0) return;
    setIsSharing(true);
    try {
      await onShare();
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    } catch {
      setShareState("failed");
      setTimeout(() => setShareState("idle"), 2000);
    } finally {
      setIsSharing(false);
    }
  }

  async function handleExportHtml() {
    if (isExporting || screenCount === 0) return;
    setIsExporting(true);
    try { await onExportHtml(); } finally { setIsExporting(false); }
  }

  async function handleExportNextjs() {
    if (isExporting || screenCount === 0) return;
    setIsExporting(true);
    try { await onExportNextjs(); } finally { setIsExporting(false); }
  }

  const statusLine = isGenerating
    ? "Generating…"
    : activeScreen
    ? activeScreen.name
    : screenCount > 0
    ? `${screenCount} screen${screenCount !== 1 ? "s" : ""}`
    : "Untitled";

  return (
    <header className="relative flex h-14 w-full shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3">

      {/* ════ LEFT: identity + project ════ */}
      <div className="flex min-w-0 items-center gap-2">
        <Tip label="Dashboard">
          <Link
            href="/dashboard"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-foreground/45 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            aria-label="Back to dashboard"
          >
            <svg width={I} height={I} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3L5 7l4 4" />
            </svg>
          </Link>
        </Tip>

        {/* Logo badge */}
        <img src="/logo.png" className="w-8" />

        {/* Project name + screen dropdown + status */}
        <div className="flex min-w-0 flex-col leading-tight">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={screenCount === 0}
                className="flex max-w-[220px] items-center gap-1 rounded-md text-left text-sm font-semibold tracking-[-0.01em] text-foreground transition-colors hover:text-foreground/70 disabled:pointer-events-none"
              >
                <span className="truncate">{app.name}</span>
                {screenCount > 0 && (
                  <svg width="11" height="11" viewBox="0 0 10 10" fill="none" className="shrink-0 text-foreground/40">
                    <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="max-h-[60vh] min-w-[240px] overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
            >
              {app.screens.map((screen, idx) => {
                const isActive = screen.id === activeScreenId;
                return (
                  <DropdownMenuItem
                    key={screen.id}
                    onClick={() => {
                      onFocusScreen(screen.id);
                      dispatch({ type: "SET_ACTIVE_SCREEN", id: screen.id });
                    }}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                      isActive ? "bg-foreground/5 text-foreground" : "text-foreground/65"
                    }`}
                  >
                    <span className={`grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-semibold tabular-nums ${
                      isActive ? "bg-ws-accent/15 text-ws-accent" : "bg-foreground/6 text-foreground/40"
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">{screen.name}</span>
                    {screen.isStreaming && <span className="size-1.5 animate-pulse rounded-full bg-ws-accent" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="flex items-center gap-1.5 text-xs text-foreground/95">
            {isGenerating && (
              <span className="flex shrink-0 items-center gap-[3px]">
                {[0, 120, 240].map((d) => (
                  <span key={d} className="size-[3px] animate-pulse rounded-full bg-ws-accent" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
            )}
            <span className="truncate">{statusLine}</span>
          </span>
        </div>
      </div>

      {/* ════ CENTER: view-mode segmented control ════ */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 rounded-xl border border-border bg-muted/60 p-1">
        <SegTab
          active={isPreview}
          onClick={selectPreview}
          label="Preview"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          }
        />
        <SegTab
          active={showCodeView}
          onClick={selectCode}
          label="Code"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
            </svg>
          }
        />
        {hasDesignSystem && (
          <SegTab
            active={showDesignSystem}
            onClick={selectDesign}
            label="Design"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9.5" />
                <circle cx="8" cy="9" r="1.4" fill="currentColor" stroke="none" />
                <circle cx="12" cy="7" r="1.4" fill="currentColor" stroke="none" />
                <circle cx="16" cy="9" r="1.4" fill="currentColor" stroke="none" />
                <path d="M12 21v-6a2 2 0 0 1 2-2h4" />
              </svg>
            }
          />
        )}
      </div>

      {/* ════ RIGHT: history + share + export ════ */}
      <div className="flex shrink-0 items-center gap-0.5">
        <IconBtn onClick={onUndo} disabled={!canUndo} title="Undo (⌘Z)">
          <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9h10a5 5 0 0 1 0 10H11" />
            <path d="M7 5L3 9l4 4" />
          </svg>
        </IconBtn>
        <IconBtn onClick={onRedo} disabled={!canRedo} title="Redo (⌘⇧Z)">
          <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 9H11a5 5 0 0 0 0 10h2" />
            <path d="M17 5l4 4-4 4" />
          </svg>
        </IconBtn>
        <IconBtn onClick={onFitView} disabled={screenCount === 0} title="Fit view">
          <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
          </svg>
        </IconBtn>
        {screenCount > 0 && !isGenerating && (
          <IconBtn onClick={onRegenerate} title="Regenerate">
            <svg width={I} height={I} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 14.5-7.1M21 12a9 9 0 0 1-14.5 7.1" />
              <path d="M18 2v4h-4M6 22v-4h4" />
            </svg>
          </IconBtn>
        )}

        {screenCount > 0 && (
          <>
            <VDivider />

            {/* Share — outlined pill */}
            <Tip label={shareState === "copied" ? "Link copied!" : shareState === "failed" ? "Failed" : "Copy share link"}>
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="btn-fx flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground/85 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                {shareState === "copied" ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                    </svg>
                    Share
                  </>
                )}
              </button>
            </Tip>

            {/* Export — filled pill dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={isExporting}
                  className="btn-fx-primary flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v13M8 12l4 4 4-4M20 19H4" />
                  </svg>
                  Export
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="min-w-44 rounded-xl border border-border bg-popover p-1 shadow-lg"
              >
                <DropdownMenuItem
                  onClick={handleExportHtml}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground/70 hover:bg-foreground/[0.05] hover:text-foreground focus:bg-foreground/[0.05] focus:text-foreground"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/60">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                  Export HTML
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportNextjs}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground/70 hover:bg-foreground/[0.05] hover:text-foreground focus:bg-foreground/[0.05] focus:text-foreground"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/60">
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
      </div>
    </header>
  );
}
