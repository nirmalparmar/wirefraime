const TESTIMONIALS = [
  {
    quote:
      "We used to spend two weeks aligning on flows before touching Figma. Wirefraime gave us a complete design system in one afternoon.",
    name: "James Okafor",
    role: "Head of Product Design, Linear",
  },
  {
    quote:
      "The flow generation is uncanny — it thought of journeys our team hadn't even discussed.",
    name: "Priya Sharma",
    role: "Design Lead, Stripe",
  },
  {
    quote:
      "What took two weeks of back-and-forth now happens before standup. Game changer.",
    name: "Tom Nakamura",
    role: "CPO, Loom",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16 md:px-12 md:py-20">
      <div className="reveal grid gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name}
            className="liquid-glass-adaptive rounded-xl p-6 md:p-7"
          >
            <p className="mb-5 font-serif text-base italic leading-relaxed text-foreground/80">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/8 font-serif text-sm text-muted-foreground">
                {t.name[0]}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {t.name}
                </div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
