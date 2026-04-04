"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { WireframeApp } from "@/lib/types";
import { uuid } from "@/lib/store";
import { SERIF, SANS } from "@/lib/constants";
import { useTheme } from "@/components/ThemeProvider";
import { UserButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

/* ── Helpers ── */

const ACCENT_HUES = [38, 162, 220, 280, 340, 60, 120, 200, 310, 15];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function accentForApp(name: string): string {
  const hue = ACCENT_HUES[hashName(name) % ACCENT_HUES.length];
  return `oklch(0.65 0.14 ${hue})`;
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  const d = new Date(ts);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

const DESC_LIMIT = 280;

/* ── Mini screen thumbnail ── */
function ScreenThumbnail({ accent, screenCount }: { accent: string; screenCount: number }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-t-xl bg-foreground/[0.02]">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />
      <div className="absolute inset-3 flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-8 rounded-full bg-foreground/10" />
          <div className="ml-auto flex gap-1">
            <div className="h-1.5 w-4 rounded-full bg-foreground/8" />
            <div className="h-1.5 w-4 rounded-full bg-foreground/8" />
          </div>
        </div>
        <div className="mt-1 space-y-1">
          <div className="h-2 w-16 rounded-sm" style={{ background: accent, opacity: 0.35 }} />
          <div className="h-1 w-24 rounded-full bg-foreground/8" />
          <div className="h-1 w-16 rounded-full bg-foreground/6" />
        </div>
        <div className="mt-1 flex gap-1.5">
          <div className="h-6 flex-1 rounded bg-foreground/[0.03]" />
          <div className="h-6 flex-1 rounded bg-foreground/[0.03]" />
          <div className="h-6 flex-1 rounded bg-foreground/[0.03]" />
        </div>
        <div className="mt-auto flex gap-1.5">
          <div className="h-4 flex-1 rounded bg-foreground/[0.03]" />
          <div className="h-4 flex-1 rounded bg-foreground/[0.03]" />
        </div>
      </div>
      {screenCount > 0 && (
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm">
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.6" />
            <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.35" />
            <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.35" />
            <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.2" />
          </svg>
          {screenCount}
        </div>
      )}
      <div
        className="absolute inset-x-0 bottom-0 h-12"
        style={{ background: `linear-gradient(to top, ${accent}10, transparent)` }}
      />
    </div>
  );
}

/* ── Three-dot menu icon ── */
function MoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="3.5" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="8" cy="12.5" r="1.25" />
    </svg>
  );
}

/* ── Empty state illustration ── */
function EmptyIllustration() {
  return (
    <div className="relative mx-auto mb-8 h-[150px] w-[200px]">
      <div className="absolute inset-0 rounded-3xl bg-primary/5 blur-2xl" />
      <div
        className="liquid-glass-adaptive absolute inset-2 overflow-hidden rounded-2xl"
        style={{ animation: "fadeUp 0.5s ease both", animationDelay: "0.1s" }}
      >
        <div className="flex items-center gap-1.5 border-b border-foreground/[0.06] px-3 py-2">
          <div className="h-1.5 w-1.5 rounded-full bg-destructive/30" />
          <div className="h-1.5 w-1.5 rounded-full bg-chart-2/30" />
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/15" />
          <div className="ml-3 h-1 w-14 rounded-full bg-muted-foreground/8" />
        </div>
        <div className="space-y-2 p-3">
          <div className="space-y-1">
            <div className="sk h-2 w-14 rounded-sm bg-primary/20" />
            <div className="sk2 h-1 w-24 rounded-full bg-muted-foreground/8" />
          </div>
          <div className="mt-2 flex gap-1.5">
            <div className="sk2 h-8 flex-1 rounded-md bg-foreground/[0.04]" />
            <div className="sk3 h-8 flex-1 rounded-md bg-foreground/[0.04]" />
          </div>
        </div>
      </div>
      <div
        className="absolute -right-1 bottom-1 grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"
        style={{ animation: "fadeUp 0.5s ease both", animationDelay: "0.35s" }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M8 3v10M3 8h10" />
        </svg>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [apps, setApps] = useState<WireframeApp[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const rows = await res.json();
          // Map DB rows to WireframeApp shape for UI
          const mapped: WireframeApp[] = rows.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            name: r.name as string,
            description: (r.description as string) ?? "",
            platform: (r.platform as string) ?? "web",
            designSystem: r.designSystem ?? r.design_system ?? null,
            screens: Array.isArray(r.screens)
              ? (r.screens as Record<string, unknown>[]).map((s) => ({
                id: s.id as string,
                name: s.name as string,
                html: "",
                isStreaming: false,
              }))
              : [],
            messages: [],
            createdAt: new Date(r.createdAt as string).getTime(),
            updatedAt: new Date(r.updatedAt as string).getTime(),
          }));
          setApps(mapped);
        }
      } catch (e) {
        console.warn("Failed to load projects:", e);
      } finally {
        setLoading(false);
        requestAnimationFrame(() => setMounted(true));
      }
    }
    load();
  }, []);

  async function handleCreate() {
    if (!name.trim() || !description.trim()) return;
    setIsCreating(true);
    setQuotaError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (res.ok) {
        const row = await res.json();
        router.push(`/workspace/${row.id}`);
      } else if (res.status === 403) {
        const data = await res.json();
        setQuotaError(data.error ?? "You've reached your screen limit. Upgrade to continue.");
        setIsCreating(false);
      } else {
        setQuotaError("Something went wrong. Please try again.");
        setIsCreating(false);
      }
    } catch (e) {
      console.error("Failed to create project:", e);
      setQuotaError("Something went wrong. Please try again.");
      setIsCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project?")) return;
    setApps((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
    } catch (e) {
      console.warn("Failed to delete project:", e);
    }
  }

  async function handleDuplicate(app: WireframeApp) {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${app.name} (copy)`,
          description: app.description,
          platform: app.platform,
          designSystem: app.designSystem,
        }),
      });
      if (res.ok) {
        const row = await res.json();
        setApps((prev) => [...prev, {
          ...app,
          id: row.id,
          name: `${app.name} (copy)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }]);
      }
    } catch (e) {
      console.warn("Failed to duplicate project:", e);
    }
  }

  function openCreate() {
    setName("");
    setDescription("");
    setShowCreate(true);
  }

  const sortedApps = [...apps].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: SANS }}>
      {/* ── Floating pill navbar (same as landing) ── */}
      <nav className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 md:pt-5">
        <div className="liquid-glass-adaptive mx-auto flex max-w-5xl items-center justify-between rounded-full px-5 py-2.5 md:px-6 md:py-3">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-serif text-lg text-foreground no-underline"
          >
            <img src="/logo.png" alt="Logo" width={24} height={24} />
            <span>
              Wirefr<span className="text-primary">ai</span>me
            </span>
          </Link>

          {/* Center links */}
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-foreground"
            >
              Projects
            </Link>
            <Link
              href="/dashboard/billing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Billing
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              {theme === "dark" ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <button
              onClick={openCreate}
              className="liquid-glass-adaptive flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M8 3v10M3 8h10" />
              </svg>
              New project
            </button>

            <UserButton
              appearance={{
                elements: { avatarBox: "size-7" },
              }}
            />
          </div>
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="mx-auto max-w-5xl px-5 pt-28 md:px-12 md:pt-32">
        {/* ── Hero header ── */}
        <div
          className="pb-8 sm:pb-10 transition-all duration-500"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(10px)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-[32px] tracking-tight leading-none text-foreground sm:text-[38px]"
                style={{ fontFamily: SERIF }}
              >
                Projects
              </h1>
              <p className="mt-2 text-[14px] text-muted-foreground">
                {apps.length === 0
                  ? "Create your first project to get started"
                  : `${apps.length} project${apps.length !== 1 ? "s" : ""} · Last updated ${relativeDate(sortedApps[0]?.updatedAt ?? Date.now())}`}
              </p>
            </div>

            {apps.length > 0 && (
              <div className="hidden items-center gap-1.5 sm:flex">
                <span className="liquid-glass-adaptive flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-muted-foreground">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                    <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" />
                    <rect x="7.5" y="1" width="5.5" height="5.5" rx="1.5" />
                    <rect x="1" y="7.5" width="5.5" height="5.5" rx="1.5" />
                    <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1.5" />
                  </svg>
                  Grid
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Empty state ── */}
        {apps.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-16 text-center sm:py-24"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(16px)",
              transition: "all 0.6s ease 0.15s",
            }}
          >
            <EmptyIllustration />

            <p
              className="mb-2 text-[24px] tracking-tight text-foreground sm:text-[28px]"
              style={{ fontFamily: SERIF }}
            >
              Start your first project
            </p>
            <p className="mb-8 max-w-[380px] text-[14px] leading-relaxed text-muted-foreground">
              Describe your app and AI will generate the full design — screens, components, and a complete design system.
            </p>
            <Button
              onClick={openCreate}
              variant="clay"
              size="xl"
              className="group gap-2"
            >
              Create project
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-0.5">
                <path d="M3.5 8h9M9 4.5L12.5 8 9 11.5" />
              </svg>
            </Button>
          </div>
        )}

        {/* ── App grid ── */}
        {apps.length > 0 && (
          <div
            className="grid gap-5 pb-16"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            {/* New project card */}
            <button
              onClick={openCreate}
              className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-foreground/[0.08] bg-transparent py-12 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.03] hover:text-primary"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.4s ease, transform 0.4s ease, border-color 0.2s, background 0.2s, color 0.2s",
              }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/[0.04] text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M8 3v10M3 8h10" />
                </svg>
              </div>
              <span className="text-[13px] font-medium">New project</span>
            </button>

            {/* Project cards */}
            {sortedApps.map((app, i) => {
              const screenCount = app.screens?.length ?? 0;
              const accent = accentForApp(app.name);
              const platform = (app as WireframeApp).platform ?? "web";

              return (
                <div
                  key={app.id}
                  className="liquid-glass-adaptive group relative flex flex-col overflow-hidden rounded-xl transition-all duration-200 hover:bg-foreground/[0.03]"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(12px)",
                    transition: `opacity 0.4s ease ${(i + 1) * 0.05}s, transform 0.4s ease ${(i + 1) * 0.05}s`,
                  }}
                >
                  {/* Thumbnail area */}
                  <div
                    className="relative h-[140px] cursor-pointer"
                    onClick={() => router.push(`/workspace/${app.id}`)}
                  >
                    <ScreenThumbnail accent={accent} screenCount={screenCount} />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/[0.02] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <div className="liquid-glass-adaptive flex h-9 items-center gap-1.5 rounded-full px-4 text-[12px] font-medium text-foreground">
                        Open project
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3.5 8h9M9 4.5L12.5 8 9 11.5" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Content area */}
                  <div className="flex flex-1 flex-col px-4 pb-3.5 pt-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => router.push(`/workspace/${app.id}`)}
                      >
                        <h3
                          className="line-clamp-1 text-[15px] font-medium leading-snug tracking-tight text-foreground"
                          style={{ fontFamily: SERIF, fontSize: 17 }}
                        >
                          {app.name}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                          {app.description}
                        </p>
                      </div>

                      {/* Context menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="shrink-0 rounded-md p-1 text-muted-foreground/40 opacity-0 transition-all hover:bg-foreground/[0.06] hover:text-foreground/60 group-hover:opacity-100 focus-visible:opacity-100">
                            <MoreIcon />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[160px]">
                          <DropdownMenuItem onClick={() => router.push(`/workspace/${app.id}`)}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3.5 8h9M9 4.5L12.5 8 9 11.5" />
                            </svg>
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(app)}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.5" />
                              <path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" />
                            </svg>
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(app.id)}
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5" />
                              <path d="M4.5 4.5l.5 8.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-8.5" />
                            </svg>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Meta row */}
                    <div className="mt-3 flex items-center gap-3 text-[12px] text-muted-foreground/70">
                      <span className="liquid-glass-adaptive inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {platform}
                      </span>
                      <span className="tabular-nums">{relativeDate(app.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Accent line at bottom */}
                  <div
                    className="h-[2px] w-full opacity-60"
                    style={{ background: `linear-gradient(90deg, ${accent}, transparent 70%)` }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[520px]" style={{ fontFamily: SANS }}>
          <DialogHeader>
            <DialogTitle
              className="text-[22px] tracking-tight"
              style={{ fontFamily: SERIF }}
            >
              New project
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-relaxed">
              Describe your app and AI will generate the full design system and all screens.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-1" />

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label
                htmlFor="app-name"
                className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                Project name
              </Label>
              <Input
                id="app-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CRM Dashboard, Mobile Banking App"
                autoFocus
                className="h-10 text-[14px]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="app-description"
                  className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                >
                  Description
                </Label>
                {description.length > 0 && (
                  <span
                    className="text-[11px] tabular-nums text-muted-foreground"
                    style={{ color: description.length > DESC_LIMIT ? "var(--destructive)" : undefined }}
                  >
                    {description.length}/{DESC_LIMIT}
                  </span>
                )}
              </div>
              <Textarea
                id="app-description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESC_LIMIT))}
                placeholder="Describe your app, its users, and the core flows. More detail = better results."
                rows={4}
                className="resize-none text-[14px] leading-relaxed"
              />
            </div>
          </div>

          {quotaError && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-destructive">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div className="flex-1 text-sm">
                <p className="font-medium text-destructive">{quotaError}</p>
                <Link
                  href="/dashboard/billing"
                  className="mt-1 inline-block text-xs font-medium text-primary underline underline-offset-2 hover:no-underline"
                >
                  View plans &amp; upgrade
                </Link>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => { setShowCreate(false); setQuotaError(null); }}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !name.trim() || !description.trim()}
              variant="clay"
              className="gap-1.5 px-5 disabled:opacity-40"
            >
              {isCreating ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Creating...
                </>
              ) : (
                <>
                  Generate app
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 8h9M9 4.5L12.5 8 9 11.5" />
                  </svg>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
