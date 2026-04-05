export function TrustBand() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 border-y border-foreground/6 px-5 py-5 md:gap-12 md:px-12">
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        Powered by
      </span>
      {["Gemini", "Claude", "Vercel AI SDK"].map((name) => (
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
