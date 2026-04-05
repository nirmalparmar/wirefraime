import { SectionHeading } from "./section-heading";

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
      className="mx-auto max-w-5xl px-5 py-20 md:px-12 md:py-28"
    >
      <div className="mb-12 md:mb-16">
        <SectionHeading
          badge="How it works"
          title={
            <>
              Zero to full design
              <br />
              in <em className="text-primary">under two minutes.</em>
            </>
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="liquid-glass-adaptive group flex flex-col rounded-xl p-7 transition-all hover:bg-foreground/[0.03] md:p-8"
          >
            {/* Step number + connector */}
            <div className="mb-5 flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-white">
                {step.n}
              </div>
              <div className="h-px flex-1 bg-foreground/8" />
            </div>

            <h3 className="mb-2 font-serif text-xl text-foreground">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {step.desc}
            </p>

            {/* Mini visual */}
            {step.visual}
          </div>
        ))}
      </div>
    </section>
  );
}
