"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";

type Aesthetic =
  | "auto"
  | "silent-minimal"
  | "cinematic"
  | "terminal"
  | "organic"
  | "dark-high-tech"
  | "bright-saas"
  | "aurora"
  | "soft-neumorphic";

type Section =
  | "social-proof"
  | "features"
  | "how-it-works"
  | "outcomes"
  | "testimonials"
  | "pricing"
  | "faq";

type Brief = {
  productName: string;
  description: string;
  audience: string;
  primaryAction: string;
  tone: string;
  aesthetic: Aesthetic;
  sections: Section[];
  facts: string;
};

const DEFAULT_BRIEF: Brief = {
  productName: "",
  description: "",
  audience: "",
  primaryAction: "Start free",
  tone: "Confident, clear, and modern",
  aesthetic: "auto",
  sections: ["social-proof", "features", "how-it-works", "pricing", "faq"],
  facts: "",
};

const AESTHETICS: Array<{ id: Aesthetic; label: string; note: string; swatches: string[] }> = [
  { id: "auto", label: "Agent picks", note: "Best fit for your brief", swatches: ["#f4f4f1", "#111318", "#3976df"] },
  { id: "bright-saas", label: "Bright SaaS", note: "Clean and energetic", swatches: ["#f8fafc", "#1d4ed8", "#dbeafe"] },
  { id: "dark-high-tech", label: "Dark high-tech", note: "Precise and technical", swatches: ["#090a0f", "#62a5ff", "#1a2030"] },
  { id: "silent-minimal", label: "Editorial", note: "Quiet, premium restraint", swatches: ["#ffffff", "#151515", "#dedbd3"] },
  { id: "organic", label: "Organic", note: "Warm and approachable", swatches: ["#f7f3e8", "#35624b", "#e5b96f"] },
  { id: "aurora", label: "Aurora", note: "Soft and atmospheric", swatches: ["#fff4ee", "#e9d9ff", "#ffcfe1"] },
  { id: "terminal", label: "Terminal", note: "Mechanical and direct", swatches: ["#10251b", "#c8ff80", "#f1ecd9"] },
  { id: "cinematic", label: "Cinematic", note: "Bold and dramatic", swatches: ["#050505", "#eee8dc", "#7b1717"] },
  { id: "soft-neumorphic", label: "Soft tactile", note: "Calm and dimensional", swatches: ["#e6e8eb", "#ffffff", "#5e8fd8"] },
];

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: "social-proof", label: "Social proof" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it works" },
  { id: "outcomes", label: "Outcomes" },
  { id: "testimonials", label: "Testimonials" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];

const MAX_IMAGE_DIMENSION = 1400;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new window.Image();
      image.onerror = reject;
      image.onload = () => {
        const ratio = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function PreviewFrame({ html, generating }: { html: string; generating: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ scale: 0.6, height: 1000 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      const scale = Math.min(width / 1440, height / 900);
      setFrame({ scale, height: Math.max(900, Math.floor(height / scale)) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative h-full min-h-[540px] overflow-hidden bg-[#e8eaf0]">
      {html ? (
        <iframe
          key={generating ? "streaming" : "complete"}
          title="Generated landing page preview"
          sandbox={generating ? "allow-same-origin" : "allow-scripts allow-same-origin"}
          srcDoc={html}
          style={{
            width: 1440,
            height: frame.height,
            border: 0,
            transform: `scale(${frame.scale})`,
            transformOrigin: "top left",
            background: "white",
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="w-full max-w-[760px] overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-[0_32px_80px_-38px_rgba(20,30,55,.35)]">
            <div className="flex h-10 items-center gap-2 border-b border-black/[0.07] bg-[#f7f8fa] px-4">
              <span className="size-2 rounded-full bg-[#ff6b67]" />
              <span className="size-2 rounded-full bg-[#f5bf4f]" />
              <span className="size-2 rounded-full bg-[#5bc56d]" />
              <div className="ml-4 h-5 w-44 rounded-md bg-black/[0.05]" />
            </div>
            <div className="relative overflow-hidden px-8 pb-12 pt-14 text-center md:px-16">
              <div className="absolute left-1/2 top-[-120px] h-72 w-72 -translate-x-1/2 rounded-full bg-[#cbdcff]/60 blur-[80px]" />
              <div className="relative mx-auto mb-5 h-5 w-28 rounded-full bg-[#e9eef8]" />
              <div className="relative mx-auto h-8 w-[72%] rounded-lg bg-[#161922]" />
              <div className="relative mx-auto mt-3 h-8 w-[56%] rounded-lg bg-[#161922]" />
              <div className="relative mx-auto mt-6 h-3 w-[64%] rounded bg-[#dfe3eb]" />
              <div className="relative mx-auto mt-2 h-3 w-[48%] rounded bg-[#e8ebf0]" />
              <div className="relative mt-7 flex justify-center gap-3">
                <div className="h-10 w-32 rounded-full bg-[#2867d7]" />
                <div className="h-10 w-28 rounded-full border border-black/10 bg-white" />
              </div>
              <div className="relative mx-auto mt-12 grid max-w-[560px] grid-cols-[120px_1fr] gap-3 rounded-xl border border-black/[0.08] bg-[#fbfcfe] p-4 text-left shadow-[0_20px_40px_-28px_rgba(20,30,55,.35)]">
                <div className="space-y-2 rounded-lg bg-[#eef2f8] p-3">
                  <div className="h-2 w-14 rounded bg-[#9eb7e8]" />
                  <div className="h-2 w-16 rounded bg-black/10" />
                  <div className="h-2 w-12 rounded bg-black/10" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((item) => <div key={item} className="rounded-lg border border-black/[0.06] bg-white" />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LandingPageBuilder() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [brief, setBrief] = useState<Brief>(DEFAULT_BRIEF);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "creating" | "generating" | "done" | "error">("idle");
  const [step, setStep] = useState("Ready for your brief");
  const [previewHtml, setPreviewHtml] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [direction, setDirection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("wirefraime-landing-builder-brief");
    const prompt = sessionStorage.getItem("wirefraime-landing-builder-prompt");
    if (saved) {
      try { setBrief({ ...DEFAULT_BRIEF, ...JSON.parse(saved) }); } catch { /* ignore malformed local data */ }
      sessionStorage.removeItem("wirefraime-landing-builder-brief");
    } else if (prompt) {
      setBrief((current) => ({ ...current, description: prompt }));
      sessionStorage.removeItem("wirefraime-landing-builder-prompt");
    }
  }, []);

  const generating = status === "creating" || status === "generating";
  const canGenerate =
    brief.productName.trim().length > 0 &&
    brief.description.trim().length >= 20 &&
    brief.audience.trim().length >= 3 &&
    brief.primaryAction.trim().length >= 2 &&
    brief.sections.length > 0;

  function update<K extends keyof Brief>(key: K, value: Brief[K]) {
    setBrief((current) => ({ ...current, [key]: value }));
  }

  function toggleSection(section: Section) {
    setBrief((current) => ({
      ...current,
      sections: current.sections.includes(section)
        ? current.sections.filter((item) => item !== section)
        : [...current.sections, section],
    }));
  }

  async function generate() {
    if (!canGenerate || generating || !isLoaded) return;
    if (!isSignedIn) {
      sessionStorage.setItem("wirefraime-landing-builder-brief", JSON.stringify(brief));
      router.push("/sign-up?redirect_url=/landing-page-builder");
      return;
    }

    setStatus("creating");
    setStep("Creating your project");
    setError(null);
    setPreviewHtml("");
    setDirection(null);

    try {
      const projectResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${brief.productName} Landing Page`,
          description: `Landing page for ${brief.productName}. ${brief.description} Audience: ${brief.audience}. Primary action: ${brief.primaryAction}.`,
          platform: "web",
        }),
      });
      const projectData = await projectResponse.json();
      if (!projectResponse.ok) {
        throw new Error(projectData.error || "Could not create the project");
      }
      setProjectId(projectData.id);
      setStatus("generating");

      const response = await fetch("/api/landing-page/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectData.id,
          brief,
          ...(referenceImage ? { referenceImage } : {}),
        }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Landing-page generation failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedHtml = "";
      let sawDone = false;
      let lastPaint = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
          const event = data.event as string;
          if (event === "step") {
            setStep(data.label as string);
          } else if (event === "blueprint") {
            setDirection((data.aesthetic as string).replaceAll("-", " "));
          } else if (event === "html_chunk") {
            streamedHtml += data.chunk as string;
            const now = performance.now();
            if (now - lastPaint > 90) {
              lastPaint = now;
              setPreviewHtml(streamedHtml);
            }
          } else if (event === "screen_done") {
            setPreviewHtml(data.html as string);
          } else if (event === "done") {
            sawDone = true;
            setProjectId(data.projectId as string);
          } else if (event === "error") {
            throw new Error((data.message as string) || "Landing-page generation failed");
          }
        }
      }

      if (!sawDone) throw new Error("Generation connection closed before completion");
      setStep("Landing page ready");
      setStatus("done");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Something went wrong";
      setError(message);
      setStep("Generation stopped");
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-[#e9ebf0] text-[#151821] lg:h-screen lg:overflow-hidden">
      <header className="flex h-16 items-center justify-between border-b border-black/[0.08] bg-white px-5 lg:px-7">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-serif text-[22px] italic tracking-[-0.02em]">
            <Image src="/logo.svg" alt="" width={25} height={25} style={{ width: 25, height: 25 }} />
            WireFraime
          </Link>
          <span className="hidden h-5 w-px bg-black/10 sm:block" />
          <span className="hidden rounded-full bg-[#e8efff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#2759b0] sm:inline-flex">
            Landing Page Agent
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hidden text-sm text-[#687083] transition-colors hover:text-[#151821] sm:block">Projects</Link>
          {isSignedIn ? (
            <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
          ) : (
            <Link href="/sign-in?redirect_url=/landing-page-builder" className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium">Sign in</Link>
          )}
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] lg:grid-cols-[430px_minmax(0,1fr)]">
        <aside className="overflow-y-auto border-r border-black/[0.08] bg-white">
          <div className="px-6 pb-10 pt-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6f7890]">Focused brief</p>
            <h1 className="mt-2 font-serif text-[34px] leading-[1.03] tracking-[-0.025em]">Build a page with one job.</h1>
            <p className="mt-3 max-w-[350px] text-[13.5px] leading-6 text-[#697185]">The agent chooses the conversion angle, writes the copy, directs the visual system, and builds one editable page.</p>

            <div className="mt-8 space-y-7">
              <fieldset className="space-y-4">
                <legend className="mb-4 flex items-center gap-2 text-xs font-semibold"><span className="flex size-5 items-center justify-center rounded-full bg-[#151821] text-[10px] text-white">1</span> Product and audience</legend>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#747c8e]">Product name</span>
                  <input value={brief.productName} onChange={(event) => update("productName", event.target.value)} placeholder="e.g. Relay" className="h-11 w-full rounded-xl border border-black/10 bg-[#fafbfc] px-3.5 text-sm outline-none transition focus:border-[#3b6bc2] focus:ring-4 focus:ring-[#3b6bc2]/10" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#747c8e]">What does it do?</span>
                  <textarea value={brief.description} onChange={(event) => update("description", event.target.value.slice(0, 5_000))} placeholder="Relay turns customer interviews into clear product decisions, with clips, themes, and evidence in one place." rows={4} className="w-full resize-none rounded-xl border border-black/10 bg-[#fafbfc] px-3.5 py-3 text-sm leading-6 outline-none transition focus:border-[#3b6bc2] focus:ring-4 focus:ring-[#3b6bc2]/10" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#747c8e]">Who is it for?</span>
                  <input value={brief.audience} onChange={(event) => update("audience", event.target.value)} placeholder="Product teams at early-stage SaaS companies" className="h-11 w-full rounded-xl border border-black/10 bg-[#fafbfc] px-3.5 text-sm outline-none transition focus:border-[#3b6bc2] focus:ring-4 focus:ring-[#3b6bc2]/10" />
                </label>
              </fieldset>

              <fieldset className="space-y-4 border-t border-black/[0.07] pt-6">
                <legend className="mb-4 flex items-center gap-2 text-xs font-semibold"><span className="flex size-5 items-center justify-center rounded-full bg-[#151821] text-[10px] text-white">2</span> Conversion goal</legend>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#747c8e]">Primary action</span>
                    <input value={brief.primaryAction} onChange={(event) => update("primaryAction", event.target.value)} placeholder="Start free" className="h-11 w-full rounded-xl border border-black/10 bg-[#fafbfc] px-3.5 text-sm outline-none transition focus:border-[#3b6bc2] focus:ring-4 focus:ring-[#3b6bc2]/10" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#747c8e]">Tone</span>
                    <input value={brief.tone} onChange={(event) => update("tone", event.target.value)} placeholder="Clear and bold" className="h-11 w-full rounded-xl border border-black/10 bg-[#fafbfc] px-3.5 text-sm outline-none transition focus:border-[#3b6bc2] focus:ring-4 focus:ring-[#3b6bc2]/10" />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#747c8e]">Facts the agent may use <em className="font-normal normal-case tracking-normal">— optional</em></span>
                  <textarea value={brief.facts} onChange={(event) => update("facts", event.target.value.slice(0, 2_000))} placeholder="Real pricing, customer names, outcomes, guarantees, or constraints. The agent will not invent these." rows={3} className="w-full resize-none rounded-xl border border-black/10 bg-[#fafbfc] px-3.5 py-3 text-sm leading-5 outline-none transition focus:border-[#3b6bc2] focus:ring-4 focus:ring-[#3b6bc2]/10" />
                </label>
              </fieldset>

              <fieldset className="border-t border-black/[0.07] pt-6">
                <legend className="mb-4 flex items-center gap-2 text-xs font-semibold"><span className="flex size-5 items-center justify-center rounded-full bg-[#151821] text-[10px] text-white">3</span> Art direction</legend>
                <div className="grid grid-cols-2 gap-2">
                  {AESTHETICS.map((item) => (
                    <button key={item.id} type="button" onClick={() => update("aesthetic", item.id)} className={`rounded-xl border p-3 text-left transition ${brief.aesthetic === item.id ? "border-[#3264be] bg-[#f1f5ff] shadow-[0_0_0_3px_rgba(50,100,190,.09)]" : "border-black/[0.08] bg-white hover:border-black/20"}`}>
                      <span className="mb-2 flex gap-1">{item.swatches.map((swatch) => <i key={swatch} className="size-3 rounded-full border border-black/10" style={{ background: swatch }} />)}</span>
                      <span className="block text-[12px] font-semibold">{item.label}</span>
                      <span className="mt-0.5 block text-[10.5px] text-[#7a8293]">{item.note}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="border-t border-black/[0.07] pt-6">
                <legend className="mb-4 flex items-center gap-2 text-xs font-semibold"><span className="flex size-5 items-center justify-center rounded-full bg-[#151821] text-[10px] text-white">4</span> Supporting sections</legend>
                <div className="flex flex-wrap gap-2">
                  {SECTIONS.map((section) => {
                    const active = brief.sections.includes(section.id);
                    return <button key={section.id} type="button" onClick={() => toggleSection(section.id)} className={`rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition ${active ? "border-[#3264be] bg-[#3264be] text-white" : "border-black/10 text-[#646d80] hover:border-black/25"}`}>{active ? "✓ " : "+ "}{section.label}</button>;
                  })}
                </div>
                <p className="mt-3 text-[10.5px] leading-5 text-[#8990a0]">Navigation, hero, final CTA, and footer are always included. Proof is used only when you provide it.</p>
              </fieldset>

              <div className="border-t border-black/[0.07] pt-6">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (file) setReferenceImage(await resizeImage(file)); event.target.value = ""; }} />
                {referenceImage ? (
                  <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-[#f8f9fb] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={referenceImage} alt="Visual reference" className="size-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1"><p className="text-xs font-semibold">Visual reference attached</p><p className="text-[10.5px] text-[#7b8394]">Composition and mood only</p></div>
                    <button type="button" onClick={() => setReferenceImage(null)} className="flex size-7 items-center justify-center rounded-full text-[#7b8394] hover:bg-black/5" aria-label="Remove reference">×</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-[#fafbfc] py-3 text-xs font-medium text-[#687185] transition hover:border-[#3264be]/50 hover:text-[#3264be]">
                    <span className="text-base leading-none">＋</span> Add a visual reference
                  </button>
                )}
              </div>

              {error && <div className="rounded-xl border border-[#d84a4a]/20 bg-[#fff5f4] px-3.5 py-3 text-xs leading-5 text-[#a83232]">{error}{error.toLowerCase().includes("limit") && <Link href="/dashboard/billing" className="ml-1 font-semibold underline">View plans</Link>}</div>}

              <button type="button" disabled={!canGenerate || generating || !isLoaded} onClick={generate} className="group flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#151821] px-5 text-sm font-semibold text-white shadow-[0_18px_30px_-18px_rgba(21,24,33,.75)] transition hover:-translate-y-0.5 hover:bg-[#252a37] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0">
                {generating ? <><span className="size-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white" /> {step}</> : status === "done" ? "Generate another direction" : <>Build my landing page <span className="transition-transform group-hover:translate-x-1">→</span></>}
              </button>
              {!isSignedIn && <p className="text-center text-[10.5px] text-[#8990a0]">You’ll create an account before generation. Your brief will be saved.</p>}
            </div>
          </div>
        </aside>

        <section className="flex min-h-[720px] flex-col bg-[#dfe2e9] p-3 lg:min-h-0 lg:p-4">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-[0_28px_70px_-40px_rgba(25,32,50,.45)]">
            <div className="flex min-h-13 items-center justify-between border-b border-black/[0.08] bg-[#fafbfc] px-4">
              <div className="flex items-center gap-2.5">
                <span className={`size-2 rounded-full ${status === "error" ? "bg-[#df5a55]" : status === "done" ? "bg-[#42a866]" : generating ? "animate-pulse bg-[#3974da]" : "bg-[#aab0bc]"}`} />
                <span className="text-xs font-semibold text-[#485064]">{step}</span>
                {direction && <span className="hidden rounded-full border border-[#3264be]/15 bg-[#edf3ff] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#3264be] sm:inline-flex">{direction}</span>}
              </div>
              <div className="flex items-center gap-2">
                {status === "done" && projectId && <button type="button" onClick={() => router.push(`/workspace/${projectId}`)} className="rounded-full bg-[#151821] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2b3040]">Open visual editor ↗</button>}
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <PreviewFrame html={previewHtml} generating={generating} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
