import { SectionHeading } from "./section-heading";

const ROWS = [
  { label: "Describe your app idea", wf: "60 seconds", trad: "Not applicable" },
  { label: "Design system created", wf: "Automatic", trad: "2–5 days" },
  { label: "Full screen designs", wf: "Under 2 minutes", trad: "1–3 weeks" },
  { label: "Connected user flows", wf: "Auto-generated", trad: "Manual mapping" },
  { label: "Edge cases & empty states", wf: "Included", trad: "Often missed" },
  { label: "Iterate on feedback", wf: "Chat in seconds", trad: "Hours per round" },
  { label: "Export to code", wf: "One click", trad: "Dev handoff process" },
  { label: "Cost per project", wf: "From $0", trad: "$5K–$25K+" },
];

export function Comparison() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-20 md:px-12 md:py-28">
      <div className="reveal mb-12 md:mb-16">
        <SectionHeading
          badge="Comparison"
          title={
            <>
              What used to take weeks,
              <br />
              now takes <em className="text-primary">minutes.</em>
            </>
          }
        />
      </div>

      <div className="reveal liquid-glass-adaptive overflow-hidden rounded-xl">
        {/* Header */}
        <div className="grid grid-cols-[1fr_140px_140px] border-b border-foreground/[0.06] px-5 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground md:grid-cols-[1fr_180px_180px] md:px-7">
          <span />
          <span className="text-center text-primary">Wirefraime</span>
          <span className="text-center">Traditional</span>
        </div>

        {/* Rows */}
        {ROWS.map((row, i) => (
          <div
            key={row.label}
            className={`grid grid-cols-[1fr_140px_140px] items-center px-5 py-3.5 text-sm md:grid-cols-[1fr_180px_180px] md:px-7 ${
              i < ROWS.length - 1 ? "border-b border-foreground/[0.06]" : ""
            } ${i % 2 === 0 ? "bg-foreground/[0.02]" : ""}`}
          >
            <span className="font-medium text-foreground">{row.label}</span>
            <span className="text-center font-medium text-primary">{row.wf}</span>
            <span className="text-center text-muted-foreground">{row.trad}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
