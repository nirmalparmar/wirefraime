"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { WireframeApp } from "@/lib/types";
import { SANS, SERIF } from "@/lib/constants";

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
import { NavAuthActions } from "@/components/landing/nav-auth-actions";

/* ── Helpers ── */

/* Pastel preview palettes — same set the landing gallery cards use. */
const PALETTES = [
  { from: "#e8f0fe", to: "#c2d8ff", accent: "#3366cc", soft: "#c2d0ff" },
  { from: "#fde8e8", to: "#ffc9c9", accent: "#e05050", soft: "#ffd6d6" },
  { from: "#e8fdf0", to: "#b9f0ce", accent: "#2f9e5b", soft: "#c8f0d6" },
  { from: "#fef9e8", to: "#fde9a0", accent: "#d99a1f", soft: "#fbeec0" },
  { from: "#f3e8fe", to: "#ddb9f5", accent: "#8a4fd3", soft: "#e9d4fa" },
  { from: "#e8f8fe", to: "#b2e6fb", accent: "#2391c9", soft: "#cdeefb" },
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function paletteForApp(name: string) {
  return PALETTES[hashName(name) % PALETTES.length];
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
const MAX_REF_DIM = 1024;

/* Resize an image file to a capped data URL (PNG). */
function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_REF_DIM || height > MAX_REF_DIM) {
          const scale = MAX_REF_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Mini screen preview (landing gallery style) ── */
function ProjectPreview({ palette }: { palette: (typeof PALETTES)[number] }) {
  return (
    <div className="proj-mini">
      <div className="proj-mini-bar">
        <i style={{ background: `${palette.accent}55` }} />
        <i />
        <i />
      </div>
      <div className="proj-mini-body">
        <div className="proj-mini-row sm" style={{ background: palette.soft }} />
        <div className="proj-mini-row xs" />
        <div className="proj-mini-cards">
          <div className="proj-mini-card" />
          <div className="proj-mini-card" />
          <div className="proj-mini-card" style={{ background: `${palette.accent}14`, borderColor: `${palette.accent}26` }} />
        </div>
        <div className="proj-mini-row" />
        <div className="proj-mini-row sm" />
      </div>
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
    <div className="empty-art">
      <div className="empty-art-bg" />
      <div className="empty-window">
        <div className="proj-mini-bar">
          <i style={{ background: "#3366cc55" }} />
          <i />
          <i />
        </div>
        <div className="proj-mini-body">
          <div className="proj-mini-row sm" style={{ background: "#c2d0ff" }} />
          <div className="proj-mini-row xs" />
          <div className="proj-mini-cards">
            <div className="proj-mini-card" />
            <div className="proj-mini-card" />
          </div>
          <div className="proj-mini-row" />
        </div>
      </div>
      <div className="empty-plus">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M8 3v10M3 8h10" />
        </svg>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const router = useRouter();
  const [apps, setApps] = useState<WireframeApp[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [brands, setBrands] = useState<Array<{ id: string; name: string; category: string; description: string }>>([]);
  const [brandId, setBrandId] = useState<string | null>(null);
  const refFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Load the brand design-system catalog for the picker.
  useEffect(() => {
    fetch("/api/design-systems")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => Array.isArray(data) && setBrands(data))
      .catch(() => { /* picker just shows Custom (AI) */ });
  }, []);

  // Pick up a prompt handed off from the landing-page hero box.
  useEffect(() => {
    const pending = sessionStorage.getItem("wirefraime-landing-prompt");
    if (pending && pending.trim()) {
      setDescription(pending.trim());
      setShowCreate(true);
      sessionStorage.removeItem("wirefraime-landing-prompt");
    }
  }, []);

  async function handleCreate() {
    if (!name.trim() || !description.trim()) return;
    setIsCreating(true);
    setQuotaError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), designSystemId: brandId }),
      });
      if (res.ok) {
        const row = await res.json();
        if (refImage) {
          try { sessionStorage.setItem(`wf-ref-image-${row.id}`, refImage); } catch { /* ignore */ }
        }
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
    setRefImage(null);
    setBrandId(null);
    setShowCreate(true);
  }

  async function handleRefImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    try { setRefImage(await resizeImageFile(file)); } catch { /* ignore */ }
  }

  const sortedApps = [...apps].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="wf-dash">
      <div className="dash-bg" aria-hidden="true" />

      {/* ── Nav ── */}
      <nav>
        <Link href="/" className="nav-logo">
          <img src="/logo.svg" alt="" width={24} height={24} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }} />
          WireFraime
        </Link>
        <div className="nav-right">
          <Link href="/dashboard" className="nav-link active">Projects</Link>
          <Link href="/dashboard/billing" className="nav-link">Billing</Link>
          <button className="pill-btn" onClick={openCreate} type="button">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            New project
          </button>
          <NavAuthActions variant="app" />
        </div>
      </nav>

      {/* ── Content ── */}
      <main className="dash-main">
        <header className={`dash-header${mounted ? " vis" : ""}`}>
          <div>
            <p className="dash-label">Your workspace</p>
            <h1 className="dash-title">
              Projects
            </h1>
            <p className="dash-sub">
              {apps.length === 0
                ? "Create your first project to get started"
                : `${apps.length} project${apps.length !== 1 ? "s" : ""} · Last updated ${relativeDate(sortedApps[0]?.updatedAt ?? Date.now())}`}
            </p>
          </div>
        </header>

        {/* ── Empty state ── */}
        {!loading && apps.length === 0 && (
          <div className="dash-empty">
            <EmptyIllustration />
            <p className="empty-title">
              Start your <em>first</em> project
            </p>
            <p className="empty-sub">
              Describe your app and AI will generate the full design — screens, components, and a complete design system.
            </p>
            <button className="pill-btn lg" onClick={openCreate} type="button">
              Create with AI
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 8h9M9 4.5L12.5 8 9 11.5" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Project grid ── */}
        {apps.length > 0 && (
          <div className="proj-grid">
            {/* New project card */}
            <button className="proj-new" onClick={openCreate} type="button">
              <div className="proj-new-icon">
                <svg width="19" height="19" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M8 3v10M3 8h10" />
                </svg>
              </div>
              <span>New project</span>
            </button>

            {/* Project cards */}
            {sortedApps.map((app, i) => {
              const screenCount = app.screens?.length ?? 0;
              const palette = paletteForApp(app.name);
              const platform = (app as WireframeApp).platform ?? "web";

              return (
                <article
                  className="proj-card"
                  key={app.id}
                  style={{ animationDelay: `${Math.min(i + 1, 10) * 0.05}s` }}
                >
                  {/* Preview */}
                  <div
                    className="proj-preview"
                    style={{ background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)` }}
                    onClick={() => router.push(`/workspace/${app.id}`)}
                  >
                    <ProjectPreview palette={palette} />
                    {screenCount > 0 && (
                      <span className="proj-count">
                        {screenCount} screen{screenCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    <div className="proj-open">
                      <span className="pill-btn sm">
                        Open project
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3.5 8h9M9 4.5L12.5 8 9 11.5" />
                        </svg>
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="proj-info">
                    <div className="proj-info-top">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p className="proj-title" onClick={() => router.push(`/workspace/${app.id}`)}>
                          {app.name}
                        </p>
                        <p className="proj-desc">{app.description}</p>
                      </div>

                      {/* Context menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="proj-menu-btn" aria-label="Project actions">
                            <MoreIcon />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="wf-dash-pop min-w-[160px]">
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
                    <div className="proj-meta">
                      <span className="proj-tag">{platform}</span>
                      <span className="proj-date">{relativeDate(app.updatedAt)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Create dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="wf-dash-dialog sm:max-w-[520px]" style={{ fontFamily: SANS }}>
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

            {/* Brand design system */}
            <div className="space-y-2">
              <Label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Design system <span className="font-normal normal-case tracking-normal text-muted-foreground/60">— optional</span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setBrandId(null)}
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${brandId === null ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground"}`}
                >
                  Custom (AI)
                </button>
                {brands.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBrandId(b.id)}
                    title={b.description}
                    className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${brandId === b.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground"}`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
              <p className="min-h-[15px] text-[11px] leading-relaxed text-muted-foreground">
                {brandId
                  ? brands.find((b) => b.id === brandId)?.description
                  : "AI designs a bespoke look for your app."}
              </p>
            </div>

            {/* Reference image */}
            <div className="space-y-2">
              <Label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Reference image <span className="font-normal normal-case tracking-normal text-muted-foreground/60">— optional</span>
              </Label>

              <input
                ref={refFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleRefImageFile(f);
                  e.target.value = "";
                }}
              />

              {refImage ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-2.5">
                  <img src={refImage} alt="Reference" className="size-14 shrink-0 rounded-lg border border-border object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">Reference attached</p>
                    <p className="text-[11px] text-muted-foreground">AI will match this style &amp; layout.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRefImage(null)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                    aria-label="Remove reference image"
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => refFileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-muted/50 hover:text-foreground"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  Upload a screenshot or mockup
                </button>
              )}
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
