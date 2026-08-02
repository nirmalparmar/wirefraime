"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Home,
  LayoutGrid,
  Paperclip,
  SlidersHorizontal,
  ArrowUp,
  LayoutTemplate,
  MoreHorizontal,
  ArrowRight,
  Copy,
  Trash2,
  Sparkles,
  X,
  CircleAlert,
  ImagePlus,
  Loader2,
  Clock,
  Smartphone,
  Monitor,
  Rocket,
} from "lucide-react";
import type { WireframeApp } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NavAuthActions } from "@/components/landing/nav-auth-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/* ── Helpers ── */

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

const MAX_REF_DIM = 1024;
const MAX_REF_BYTES = 15 * 1024 * 1024; // 15MB source cap

/* Pull the first image out of a paste/drop payload (files first, then items). */
function firstImageFile(
  files?: FileList | null,
  items?: DataTransferItemList | null
): File | null {
  if (files) {
    for (const f of Array.from(files)) {
      if (f.type.startsWith("image/")) return f;
    }
  }
  if (items) {
    for (const it of Array.from(items)) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) return f;
      }
    }
  }
  return null;
}

/* True when a drag payload carries files (vs. text/selection). */
function dragHasFiles(dt: DataTransfer | null): boolean {
  return !!dt && Array.from(dt.types).includes("Files");
}

/* Turn a free-text prompt into a short project name. */
function deriveName(prompt: string): string {
  const clean = prompt.trim().replace(/\s+/g, " ");
  if (!clean) return "Untitled project";
  const firstChunk = clean.split(/[.!?\n]/)[0].trim() || clean;
  let name = firstChunk.split(" ").slice(0, 6).join(" ");
  if (name.length > 48) name = name.slice(0, 48).trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

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

/* Starter prompts that populate the composer. */
const STARTERS = [
  { icon: Smartphone, label: "Mobile app", prompt: "A mobile fitness tracking app with an onboarding flow, home dashboard, and workout detail screens" },
  { icon: Monitor, label: "SaaS dashboard", prompt: "An analytics SaaS dashboard with a sidebar, KPI cards, charts, and a data table" },
  { icon: Rocket, label: "Landing page", prompt: "A modern landing page for an AI startup with a hero, features, pricing, and FAQ" },
];

/* ── Skeleton bars — shown while the live preview loads, and as the
   graceful fallback for projects with no rendered screen yet. ── */
function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3.5">
      <div className="h-2 w-3/5 rounded bg-foreground/12" />
      <div className="h-1.5 w-2/5 rounded bg-foreground/[0.07]" />
      <div className="mt-1 flex gap-2">
        <div className="h-11 flex-1 rounded-md bg-muted" />
        <div className="h-11 flex-1 rounded-md bg-muted" />
        <div className="h-11 flex-1 rounded-md bg-primary/[0.08] ring-1 ring-primary/15" />
      </div>
      <div className="h-2 w-full rounded bg-foreground/[0.07]" />
      <div className="h-2 w-4/5 rounded bg-foreground/[0.07]" />
    </div>
  );
}

/* ── Live thumbnail: the project's first screen rendered in a scaled,
   sandboxed iframe. Its HTML is fetched only once the card scrolls near
   the viewport (so N projects don't fire N full-page fetches at once),
   and it shows the skeleton until then — or forever, if it can't load. ── */
function LivePreview({
  projectId,
  screenId,
  platform,
}: {
  projectId: string;
  screenId: string;
  platform?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  // Track the content-box size so we can compute the scale factor.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fetch the first screen's HTML lazily, when the card nears the viewport.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        fetch(`/api/projects/${projectId}/screens/${screenId}/html`)
          .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
          .then((t) => {
            if (!cancelled && t && t.trim()) setHtml(t);
          })
          .catch(() => {/* keep the skeleton */});
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [projectId, screenId]);

  // Screens are authored at their real design width; scale that down to the card.
  const designW = platform === "mobile" ? 390 : platform === "tablet" ? 1024 : 1440;
  const scale = box.w > 0 ? box.w / designW : 0;
  const frameH = scale > 0 ? Math.ceil(box.h / scale) : 0;
  const ready = html !== null && scale > 0;

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden bg-card">
      {ready ? (
        <iframe
          srcDoc={html!}
          sandbox="allow-scripts"
          scrolling="no"
          tabIndex={-1}
          aria-hidden
          title=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: designW,
            height: frameH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            border: 0,
            pointerEvents: "none",
            background: "#fff",
          }}
        />
      ) : (
        <PreviewSkeleton />
      )}
    </div>
  );
}

/* ── Project thumbnail — a lifted browser mock hosting the live preview ── */
function ProjectPreview({
  projectId,
  screenId,
  platform,
}: {
  projectId: string;
  screenId?: string;
  platform?: string;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-muted/40 to-muted">
      {/* floating browser mock, lifted off the panel */}
      <div className="absolute inset-x-6 top-6 bottom-0 flex flex-col overflow-hidden rounded-t-xl bg-card shadow-[0_12px_30px_-14px_rgba(0,0,0,0.28)] ring-1 ring-black/[0.05] transition-transform duration-300 ease-out group-hover:-translate-y-1">
        {/* <div className="flex h-6 shrink-0 items-center gap-1.5 border-b border-border/60 bg-muted/40 px-3">
          <span className="size-1.5 rounded-full bg-foreground/15" />
          <span className="size-1.5 rounded-full bg-foreground/10" />
          <span className="size-1.5 rounded-full bg-foreground/10" />
        </div> */}
        <div className="relative min-h-0 flex-1">
          {screenId ? (
            <LivePreview projectId={projectId} screenId={screenId} platform={platform} />
          ) : (
            <PreviewSkeleton />
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const router = useRouter();
  const [apps, setApps] = useState<WireframeApp[]>([]);
  const [loading, setLoading] = useState(true);

  const [prompt, setPrompt] = useState("");
  const [wireframe, setWireframe] = useState(false);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [brands, setBrands] = useState<Array<{ id: string; name: string; category: string; description: string }>>([]);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  const refFileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const rows = await res.json();
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
      setPrompt(pending.trim());
      sessionStorage.removeItem("wirefraime-landing-prompt");
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, []);

  // Guard: dropping a file anywhere outside the composer would otherwise make
  // the browser navigate to it and blow away the app. Swallow those drops.
  useEffect(() => {
    const guard = (e: DragEvent) => {
      if (dragHasFiles(e.dataTransfer)) e.preventDefault();
    };
    window.addEventListener("dragover", guard);
    window.addEventListener("drop", guard);
    return () => {
      window.removeEventListener("dragover", guard);
      window.removeEventListener("drop", guard);
    };
  }, []);

  function focusPrompt() {
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleGenerate() {
    const p = prompt.trim();
    if (!p || isCreating) return;
    setIsCreating(true);
    setQuotaError(null);

    const description = wireframe
      ? `Generate this as clean low-fidelity wireframes — grayscale layout blocks, placeholder text, no imagery. App: ${p}`
      : p;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deriveName(p), description, designSystemId: brandId }),
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

  /* Validate + resize a single image into the reference slot. Shared by the
     file picker, paste, and drag-and-drop paths. */
  async function ingestImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setAttachError("That file isn't an image. Use a PNG, JPG, or WebP.");
      return;
    }
    if (file.size > MAX_REF_BYTES) {
      setAttachError("That image is too large — 15MB max.");
      return;
    }
    setAttachError(null);
    try {
      setRefImage(await resizeImageFile(file));
    } catch {
      setAttachError("Couldn't read that image. Try a different file.");
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const file = firstImageFile(e.clipboardData?.files, e.clipboardData?.items);
    if (file) {
      e.preventDefault(); // don't also paste the filename as text
      void ingestImageFile(file);
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    if (!dragHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(e: React.DragEvent) {
    if (!dragHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!dragHasFiles(e.dataTransfer)) return;
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    if (!dragHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    const file = firstImageFile(e.dataTransfer.files, e.dataTransfer.items);
    if (file) void ingestImageFile(file);
  }

  const sortedApps = [...apps].sort((a, b) => b.updatedAt - a.updatedAt);
  const currentBrand = brandId ? brands.find((b) => b.id === brandId) : null;

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        {/* ── Sidebar (shadcn, collapsible to an icon rail) ── */}
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center justify-between gap-2 px-1 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <Link
                href="/"
                className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden"
              >
                <img src="/logo.svg" alt="" width={24} height={24} className="shrink-0" />
                <span className="font-serif text-xl italic tracking-tight text-sidebar-foreground">
                  WireFraime
                </span>
              </Link>
              <SidebarTrigger className="text-muted-foreground" />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                {/* <SidebarMenuItem>
                  <SidebarMenuButton variant="outline" tooltip="New design" onClick={focusPrompt}>
                    <Plus />
                    <span>New design</span>
                  </SidebarMenuButton>
                </SidebarMenuItem> */}
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip="Home" onClick={focusPrompt}>
                    <Home />
                    <span>Home</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Projects">
                    <a href="#recents">
                      <LayoutGrid />
                      <span>Projects</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            {/* Usage card — hidden in the collapsed icon rail */}
            {/* <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
              <Card className="gap-2 rounded-xl bg-sidebar-accent/50 p-3.5 shadow-none ring-0">
                <div className="flex items-center gap-2 text-[13px] font-medium text-sidebar-foreground">
                  <Sparkles className="size-4 text-muted-foreground" />
                  {sortedApps.length} project{sortedApps.length !== 1 ? "s" : ""}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Describe an idea and generate a full, editable flow in seconds.
                </p>
              </Card>
            </SidebarGroup> */}
          </SidebarContent>

          <SidebarFooter>
            <div className="flex items-center gap-2.5 overflow-hidden px-1 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <NavAuthActions variant="app" />
              <span className="truncate text-[13px] font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
                Account
              </span>
            </div>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        {/* ── Content ── */}
        <SidebarInset>
          {/* Mobile top bar — carries the sidebar toggle on small screens */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:hidden">
            <SidebarTrigger className="text-muted-foreground" />
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="" width={20} height={20} className="block" />
              <span className="font-serif text-lg italic tracking-tight">WireFraime</span>
            </Link>
            <div className="ml-auto">
              <NavAuthActions variant="app" />
            </div>
          </header>

          {/* Subtle ambient depth behind the hero */}
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklch,var(--foreground)_5%,transparent),transparent)]"
            />

          {/* Hero prompt */}
          <section
            className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center md:min-h-[86vh]"
          >
            {/* <Badge variant="secondary" className="mb-5 gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
              <Sparkles className="text-foreground/60" />
              AI product designer
            </Badge> */}

            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              What should we design?
            </h1>
            <p className="mt-3.5 max-w-md text-[15px] text-muted-foreground">
              Describe a screen, a flow, or a whole product — we&apos;ll draft an editable design and code.
            </p>

            {/* Prompt composer — the lifted centerpiece */}
            <Card
              className="relative mt-8 w-full gap-0 rounded-2xl p-0 text-left ring-1 ring-black/[0.06] shadow-[var(--shadow-card)] transition-shadow duration-300 focus-within:shadow-[var(--ws-soft-lg)]"
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl border-2 border-dashed border-primary/40 bg-background/85 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2 text-sm font-medium text-foreground">
                    <ImagePlus className="size-6 text-muted-foreground" />
                    Drop image to attach
                  </div>
                </div>
              )}

              <Textarea
                ref={textareaRef}
                placeholder="Describe the design you need…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                rows={3}
                className="min-h-[104px] resize-none rounded-none border-0 bg-transparent px-5 pt-5 pb-2 text-base shadow-none focus-visible:ring-0 md:text-base"
              />

              {refImage && (
                <div className="mx-4 mb-1 flex items-center gap-2.5 rounded-xl bg-muted/60 p-2 pr-2.5">
                  <img src={refImage} alt="Reference" className="size-9 rounded-lg object-cover" />
                  <span className="flex-1 text-xs text-muted-foreground">Reference attached</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-md text-muted-foreground"
                    onClick={() => { setRefImage(null); setAttachError(null); }}
                    aria-label="Remove reference"
                  >
                    <X />
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 p-3">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 rounded-full px-3 text-muted-foreground"
                    onClick={() => refFileInputRef.current?.click()}
                    title="Attach a reference image — or paste / drop one onto the box"
                  >
                    <Paperclip className="size-4" />
                    Add
                  </Button>

                  {brands.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-full px-3 text-muted-foreground">
                          <SlidersHorizontal className="size-4" />
                          {currentBrand ? currentBrand.name : "Custom AI"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[200px]">
                        <DropdownMenuItem onClick={() => setBrandId(null)}>Custom (AI)</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {brands.map((b) => (
                          <DropdownMenuItem key={b.id} onClick={() => setBrandId(b.id)} title={b.description}>
                            {b.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <Button
                  variant="primary"
                  className="h-9 gap-1.5 rounded-xl px-4 text-[13px]"
                  onClick={handleGenerate}
                  disabled={isCreating || !prompt.trim()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Generating
                    </>
                  ) : (
                    <>
                      Generate
                      <ArrowUp className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {attachError && (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs text-destructive">
                <CircleAlert className="size-3.5 shrink-0" />
                {attachError}
              </p>
            )}

            {/* Toggle + starter chips */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant={wireframe ? "primary" : "outline"}
                size="sm"
                className="h-8 gap-1.5 rounded-full px-3.5"
                onClick={() => setWireframe((v) => !v)}
                aria-pressed={wireframe}
              >
                <LayoutTemplate className="size-4" />
                Wireframe
              </Button>

              <Separator orientation="vertical" className="mx-1 !h-5 self-center" />

              {STARTERS.map((s) => (
                <Button
                  key={s.label}
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full px-3.5 text-muted-foreground"
                  onClick={() => {
                    setPrompt(s.prompt);
                    focusPrompt();
                  }}
                >
                  <s.icon className="size-4" />
                  {s.label}
                </Button>
              ))}
            </div>

            {quotaError && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2 text-[13px] text-destructive">
                <CircleAlert className="size-4 shrink-0" />
                <span>{quotaError}</span>
                <Link href="/dashboard/billing" className="font-semibold underline underline-offset-2">
                  View plans
                </Link>
              </div>
            )}

            <input
              ref={refFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void ingestImageFile(f);
                e.target.value = "";
              }}
            />
          </section>
        </div>

        {/* Recents */}
        {!loading && sortedApps.length > 0 && (
          <section className="flex flex-col items-center justify-center w-full mx-auto scroll-mt-6 px-6 pb-24" id="recents">
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Recents</h2>
              <Badge variant="secondary" className="rounded-full">{sortedApps.length}</Badge>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sortedApps.map((app, i) => {
                const screenCount = app.screens?.length ?? 0;
                return (
                  <Card
                    key={app.id}
                    className="wf-rise group relative gap-0 overflow-hidden rounded-xl py-0 ring-1 ring-black/[0.06] shadow-[var(--ws-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--ws-soft-lg)]"
                    style={{ animationDelay: `${Math.min(i, 9) * 0.04}s` }}
                  >
                    <button
                      type="button"
                      className="relative block h-44 w-full overflow-hidden text-left"
                      onClick={() => router.push(`/workspace/${app.id}`)}
                      aria-label={`Open ${app.name}`}
                    >
                      <ProjectPreview
                        projectId={app.id}
                        screenId={app.screens?.[0]?.id}
                        platform={app.platform}
                      />
                      {screenCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="absolute right-2.5 top-2.5 rounded-full bg-card/85 shadow-sm backdrop-blur-sm"
                        >
                          {screenCount} screen{screenCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </button>

                    <div className="flex items-center gap-2 border-t border-border/70 px-3.5 py-2.5">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => router.push(`/workspace/${app.id}`)}
                      >
                        <p className="truncate text-sm font-medium text-foreground">{app.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          Edited {relativeDate(app.updatedAt)}
                        </p>
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100 focus-visible:opacity-100"
                            aria-label="Project actions"
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[160px]">
                          <DropdownMenuItem onClick={() => router.push(`/workspace/${app.id}`)}>
                            <ArrowRight />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(app)}>
                            <Copy />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => handleDelete(app.id)}>
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
