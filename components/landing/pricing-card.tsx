import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PricingCardPlan = {
  id: string;
  name: string;
  tagline?: string;
  price: string;
  priceNote?: string;
  priceSubnote?: string;
  cta: string;
  featured: boolean;
  features: string[];
};

const CTA_BASE =
  "wf-lifted inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-none px-6 text-[14.5px] font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-60";

export function PricingCard({
  plan,
  className,
  onSelect,
  loading = false,
  disabled = false,
}: {
  plan: PricingCardPlan;
  className?: string;
  onSelect?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { featured } = plan;

  return (
    <article
      className={cn(
        "relative flex flex-col p-8 md:p-9",
        featured ? "bg-foreground text-background" : "bg-card text-foreground",
        className,
      )}
    >
      {featured && (
        <span className="absolute right-8 top-8 inline-flex items-center rounded-full border border-background/15 bg-background/10 px-2.5 py-1 text-[11px] font-semibold text-background">
          Most popular
        </span>
      )}

      <div>
        <p className="text-[15px] font-medium">{plan.name}</p>
        {plan.tagline && (
          <p className={cn("mt-1.5 max-w-[36ch] text-[13.5px] leading-relaxed", featured ? "text-background/60" : "text-muted-foreground")}>
            {plan.tagline}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="mt-8 flex items-baseline gap-1.5">
        <span className="font-serif text-[52px] leading-none tracking-[-0.01em]">{plan.price}</span>
        {plan.priceNote && (
          <span className={cn("text-[14px]", featured ? "text-background/60" : "text-muted-foreground")}>{plan.priceNote}</span>
        )}
      </div>
      {plan.priceSubnote && (
        <p className={cn("mt-2 text-[13px]", featured ? "text-background/50" : "text-muted-foreground")}>{plan.priceSubnote}</p>
      )}

      {/* CTA sits above the feature list */}
      <div className="mt-7">
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled || loading}
          className={cn(CTA_BASE, featured ? "bg-background text-foreground hover:bg-background/90" : "bg-primary text-primary-foreground hover:bg-primary/90")}
        >
          {loading ? "Processing…" : plan.cta}
        </button>
      </div>

      <div className={cn("my-7 h-px", featured ? "bg-background/10" : "bg-border")} />

      <ul className="flex flex-col gap-3">
        {plan.features.map((f) => (
          <li
            key={f}
            className={cn("flex items-start gap-2.5 text-[14px] leading-relaxed", featured ? "text-background/80" : "text-muted-foreground")}
          >
            <Check strokeWidth={2.5} className={cn("mt-[3px] size-[14px] shrink-0", featured ? "text-background/70" : "text-primary")} />
            {f}
          </li>
        ))}
      </ul>
    </article>
  );
}
