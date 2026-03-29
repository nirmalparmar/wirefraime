export function TrustBand() {
  const brands = ["Notion", "Linear", "Vercel", "Stripe", "Figma"];

  return (
    <div className="reveal flex flex-wrap items-center justify-center gap-6 border-y border-foreground/[0.06] px-5 py-5 md:gap-12 md:px-12">
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        Trusted by teams at
      </span>
      {brands.map((name) => (
        <span
          key={name}
          className="font-serif text-base tracking-tight text-muted-foreground/70 md:text-lg"
        >
          {name}
        </span>
      ))}
    </div>
  );
}
