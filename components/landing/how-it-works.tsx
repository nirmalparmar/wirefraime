
const STEPS = [
  {
    n: "01",
    title: "Describe your app",
    desc: "Write a brief: what the app does, who uses it, and the core journeys. A paragraph is enough — more context gives richer results.",
    visual: (
      <div className="mt-5 space-y-2.5 rounded-lg bg-foreground/[0.03] p-4">
        <div className="h-2 w-24 rounded-full bg-primary/20" />
        <div className="h-1.5 w-full rounded-full bg-foreground/6" />
        <div className="h-1.5 w-4/5 rounded-full bg-foreground/6" />
        <div className="h-1.5 w-3/5 rounded-full bg-foreground/4" />
        <div className="mt-3 flex gap-2">
          <div className="h-6 w-16 rounded-md bg-primary/12" />
          <div className="h-6 w-14 rounded-md bg-foreground/5" />
          <div className="h-6 w-18 rounded-md bg-foreground/5" />
        </div>
      </div>
    ),
  },
  {
    n: "02",
    title: "AI designs every screen",
    desc: "The AI analyzes your domain, creates a design system, maps every required screen and flow — then generates production-quality UI for each one.",
    visual: (
      <div className="mt-5 grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5 rounded-lg bg-foreground/[0.03] p-2.5">
            <div className="h-1.5 w-10 rounded-full bg-primary/20" />
            <div className="h-8 rounded bg-foreground/4" />
            <div className="h-1 w-full rounded-full bg-foreground/6" />
            <div className="h-1 w-3/4 rounded-full bg-foreground/4" />
          </div>
        ))}
      </div>
    ),
  },
  {
    n: "03",
    title: "Refine and export",
    desc: "Select any screen and iterate with chat. Adjust layouts, add screens, or ask for alternatives. Export as HTML, Next.js, or PNG when ready.",
    visual: (
      <div className="mt-5 space-y-2 rounded-lg bg-foreground/[0.03] p-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/15" />
          <div className="h-1.5 w-32 rounded-full bg-foreground/8" />
        </div>
        <div className="ml-8 space-y-1.5 rounded-md bg-foreground/[0.03] p-2.5">
          <div className="h-1.5 w-full rounded-full bg-foreground/6" />
          <div className="h-1.5 w-2/3 rounded-full bg-foreground/4" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <div className="h-6 w-16 rounded-md bg-foreground/5" />
          <div className="h-6 w-20 rounded-md bg-primary/15" />
        </div>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative px-5 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-14 max-w-2xl text-center md:mb-20">
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            How it works
          </span>
          <h2 className="mt-4 text-[clamp(30px,4.5vw,52px)] font-semibold leading-[1.05] tracking-[-0.025em] text-foreground">
            From prompt to full UI design in two minutes
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
            Describe your app. AI wireframes every screen, builds the design
            system, and connects the flow.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="group flex flex-col rounded-3xl border border-foreground/8 bg-card/60 p-7 transition-colors hover:bg-card/80 md:p-8"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/[0.06] text-[12px] font-semibold tabular-nums text-foreground/75 ring-1 ring-foreground/5">
                  {step.n}
                </div>
                <div className="h-px flex-1 bg-foreground/8" />
              </div>

              <h3 className="mb-2 text-[19px] font-semibold tracking-tight text-foreground md:text-[20px]">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.desc}
              </p>

              {step.visual}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
