import type { ReactNode } from "react";

/* ── Card primitive ──────────────────────────────────────────── */

function Card({
  icon,
  title,
  description,
  visual,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  visual: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group relative isolate flex min-h-[340px] flex-col overflow-hidden rounded-3xl border border-foreground/8 bg-card/60 p-7 transition-colors hover:bg-card/80 md:p-8 ${className}`}
    >
      <div className="grid size-9 place-items-center rounded-full bg-foreground/[0.06] text-foreground/75 ring-1 ring-foreground/5">
        {icon}
      </div>
      <h3 className="mt-7 text-[19px] font-semibold leading-snug tracking-tight text-foreground md:text-[20px]">
        {title}
      </h3>
      <p className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {visual}
    </div>
  );
}

/* ── Tiny visual decorations ─────────────────────────────────── */

function DesignSystemVisual() {
  return (
    <div className="pointer-events-none absolute -bottom-6 -right-8 flex w-[260px] flex-col gap-2 md:w-[300px]">
      {/* Color swatches */}
      <div className="flex translate-x-2 items-center gap-2 rounded-xl border border-foreground/8 bg-background/70 p-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Color</span>
        <div className="ml-auto flex gap-1.5">
          {["#0d99ff", "#8b6cff", "#ff9d52", "#22c55e", "#111"].map((c) => (
            <span key={c} style={{ background: c }} className="size-4 rounded-full ring-1 ring-black/5" />
          ))}
        </div>
      </div>
      {/* Type */}
      <div className="flex -translate-x-1 items-center gap-3 rounded-xl border border-foreground/8 bg-background/70 p-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Type</span>
        <span className="font-serif text-xl leading-none text-foreground">Aa</span>
        <span className="text-base font-medium leading-none text-foreground">Aa</span>
        <span className="ml-auto text-[10px] text-muted-foreground">DM Sans</span>
      </div>
      {/* Spacing */}
      <div className="flex translate-x-4 items-center gap-2 rounded-xl border border-foreground/8 bg-background/70 p-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Space</span>
        <div className="ml-auto flex items-end gap-1.5">
          {[6, 10, 14, 20, 28].map((h) => (
            <span key={h} style={{ height: h }} className="w-2 rounded-sm bg-foreground/20" />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatesVisual() {
  return (
    <div className="pointer-events-none absolute -bottom-2 -right-2 flex w-[200px] flex-col gap-1.5">
      {[
        { label: "Empty", dot: "bg-zinc-400" },
        { label: "Loading", dot: "bg-blue-500" },
        { label: "Error", dot: "bg-rose-500" },
        { label: "Success", dot: "bg-emerald-500" },
      ].map((s, i) => (
        <div
          key={s.label}
          style={{ transform: `translateX(${i * 6}px)` }}
          className="flex items-center gap-2 rounded-lg border border-foreground/8 bg-background/70 px-3 py-2 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.25)] backdrop-blur"
        >
          <span className={`size-1.5 rounded-full ${s.dot}`} />
          <span className="text-[12px] font-medium text-foreground/80">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function CanvasEditVisual() {
  return (
    <div className="mt-auto pt-7">
      <div className="relative h-[170px] overflow-hidden rounded-xl border border-foreground/8 bg-background/60 [background-image:radial-gradient(circle_at_center,var(--foreground)_0.6px,transparent_0.6px)] [background-size:14px_14px] [background-position:0_0]">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="rounded-lg bg-foreground px-5 py-2.5 text-[12px] font-medium text-background shadow-md">
              Continue
            </div>
            <span className="pointer-events-none absolute -inset-1 rounded-[10px] border-[1.5px] border-[#0d99ff]" />
            {["-left-[3px] -top-[3px]", "-right-[3px] -top-[3px]", "-left-[3px] -bottom-[3px]", "-right-[3px] -bottom-[3px]"].map((p) => (
              <span key={p} className={`absolute size-1.5 rounded-[1px] border border-[#0d99ff] bg-background ${p}`} />
            ))}
            <span className="absolute -right-3 top-[calc(100%-2px)]">
              <svg width="14" height="16" viewBox="0 0 22 26" fill="none">
                <path d="M3 2 L3 19 L7.8 14.7 L10.6 21.5 L13.7 20.2 L10.9 13.4 L17.2 13.4 Z" fill="#0d99ff" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="mt-auto flex flex-col gap-2 pt-7">
      <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md border border-foreground/8 bg-background/70 px-3 py-2 text-[12px] text-foreground/85 backdrop-blur">
        Make it more playful
      </div>
      <div className="mr-auto flex max-w-[88%] items-center gap-2 rounded-2xl rounded-tl-md bg-foreground px-3 py-2 text-[12px] text-background">
        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-background/20">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
          </svg>
        </span>
        Applied to 6 screens
      </div>
      <div className="ml-auto mt-1 h-1.5 w-[60%] animate-pulse rounded-full bg-foreground/10" />
    </div>
  );
}

function CodeVisual() {
  return (
    <div className="mt-auto pt-7">
      <div className="overflow-hidden rounded-xl border border-foreground/8 bg-background/70 p-3 font-mono text-[11px] leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur">
        <div className="flex items-center gap-1.5 pb-2">
          <span className="size-2 rounded-full bg-rose-400/70" />
          <span className="size-2 rounded-full bg-amber-400/70" />
          <span className="size-2 rounded-full bg-emerald-400/70" />
          <span className="ml-auto text-[10px] text-muted-foreground">page.tsx</span>
        </div>
        <div className="text-muted-foreground/70">
          <span className="text-[#8b6cff]">export default</span>{" "}
          <span className="text-foreground/80">function</span>{" "}
          <span className="text-[#ff9d52]">Hero</span>() &#123;
        </div>
        <div className="pl-3 text-muted-foreground/70">
          <span className="text-foreground/80">return</span> &lt;
          <span className="text-[#0d99ff]">section</span>{" "}
          <span className="text-[#22c55e]">className</span>=
          <span className="text-foreground/80">&quot;py-24&quot;</span>&gt;
        </div>
        <div className="pl-6 text-muted-foreground/70">
          &lt;<span className="text-[#0d99ff]">h1</span>&gt;Welcome&lt;/<span className="text-[#0d99ff]">h1</span>&gt;
        </div>
        <div className="pl-3 text-muted-foreground/70">
          &lt;/<span className="text-[#0d99ff]">section</span>&gt;
        </div>
        <div className="text-muted-foreground/70">&#125;</div>
      </div>
    </div>
  );
}

/* ── Section ─────────────────────────────────────────────────── */

export function Features() {
  return (
    <section id="features" className="relative px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-6xl">
        {/* Heading */}
        <div className="mx-auto mb-14 max-w-2xl text-center md:mb-20">
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            More than a wireframe tool
          </span>
          <h2 className="mt-4 text-[clamp(30px,4.5vw,52px)] font-semibold leading-[1.05] tracking-[-0.025em] text-foreground">
            From wireframe to ship-ready UI
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
            Most wireframe tools draw boxes. Wirefraime is the AI UI designer
            that generates a full design system and every screen — connected,
            consistent, ready to ship.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-4 md:grid-cols-12 md:gap-5">
          {/* Row 1: 7 + 5 */}
          <Card
            className="md:col-span-7"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="7" r="1.2" fill="currentColor" />
                <circle cx="7.5" cy="11" r="1.2" fill="currentColor" />
                <circle cx="16.5" cy="11" r="1.2" fill="currentColor" />
                <circle cx="13" cy="16" r="1.2" fill="currentColor" />
              </svg>
            }
            title="A real design system, not just frames"
            description="Colors, typography, spacing tokens — generated to match your product and reused on every screen for one consistent system."
            visual={<DesignSystemVisual />}
          />
          <Card
            className="md:col-span-5"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l9 5-9 5-9-5z" />
                <path d="M3 13l9 5 9-5" />
                <path d="M3 18l9 5 9-5" />
              </svg>
            }
            title="Every state, not just the happy path"
            description="Empty, loading, error, success — every state designed and connected."
            visual={<StatesVisual />}
          />

          {/* Row 2: 4 + 4 + 4 */}
          <Card
            className="md:col-span-4"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4 L4 18 L8 14 L11 20 L14 18.5 L11 13 L17 13 Z" />
              </svg>
            }
            title="Edit live in the canvas"
            description="Click any element. Change colors, copy, layout — no code required."
            visual={<CanvasEditVisual />}
          />
          <Card
            className="md:col-span-4"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" />
              </svg>
            }
            title="Refine by chat"
            description="Say what to change. AI applies it across screens, keeping the system consistent."
            visual={<ChatVisual />}
          />
          <Card
            className="md:col-span-4"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 6l-6 6 6 6M16 6l6 6-6 6" />
              </svg>
            }
            title="Ship-ready code"
            description="Clean HTML and Tailwind, ready to hand off or deploy as a Next.js project."
            visual={<CodeVisual />}
          />
        </div>
      </div>
    </section>
  );
}
