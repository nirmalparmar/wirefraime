import { SectionHeading } from "./section-heading";

const STEPS = [
  {
    n: "01",
    icon: "✎",
    title: "Describe your app",
    desc: "Write a brief: what the app does, who uses it, and the core journeys. A paragraph is enough — more context gives richer results.",
  },
  {
    n: "02",
    icon: "◇",
    title: "AI maps the product",
    desc: "Wirefraime analyzes your domain, maps every required screen, defines flow — including edge cases — then designs each one.",
  },
  {
    n: "03",
    icon: "→",
    title: "Refine and ship",
    desc: "Iterate conversationally, adjust layouts, or ask for alternatives. Export to HTML, Figma, or production React when ready.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-5xl px-5 py-20 md:px-12 md:py-28"
    >
      <div className="reveal mb-12 md:mb-16">
        <SectionHeading
          badge="Process"
          title={
            <>
              Zero to full design
              <br />
              in <em className="text-primary">under two minutes.</em>
            </>
          }
        />
      </div>

      <div className="reveal grid gap-4 md:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="liquid-glass-adaptive group rounded-xl p-7 transition-all hover:bg-foreground/[0.03] md:p-8"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="grid size-11 place-items-center rounded-lg bg-primary/8 text-lg text-primary">
                {step.icon}
              </div>
              <span className="font-serif text-4xl italic text-foreground/10">
                {step.n}
              </span>
            </div>
            <h3 className="mb-3 font-serif text-xl text-foreground">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
