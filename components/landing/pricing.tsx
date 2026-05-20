"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

const ANNUAL_DISCOUNT = 40;

type Plan = {
  name: string;
  slug: "pro" | "ultra";
  tagline: string;
  priceMonthly: number;
  featured: boolean;
  features: string[];
  cta: string;
};

const PLANS: Plan[] = [
  {
    name: "Pro",
    slug: "pro",
    tagline: "Everything you need to ship your first product.",
    priceMonthly: 20,
    featured: false,
    features: [
      "150 screens / month",
      "Full component library",
      "HTML & Next.js export",
      "PNG export per screen",
      "Chat refinement",
      "Design system generation",
    ],
    cta: "Start Pro",
  },
  {
    name: "Ultra",
    slug: "ultra",
    tagline: "For teams designing multiple products at once.",
    priceMonthly: 40,
    featured: true,
    features: [
      "350 screens / month",
      "Everything in Pro",
      "Advanced AI models",
      "Custom design systems",
      "Priority support",
    ],
    cta: "Start Ultra",
  },
];

/* ── Small inline icons ─────────────────────────────────────── */

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-foreground/55">
      <path d="M2.5 7.5l2.8 2.8L11.5 4" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    </svg>
  );
}

/* ── Section ─────────────────────────────────────────────────── */

export function Pricing() {
  const [annual, setAnnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { isSignedIn } = useAuth();

  function annualPrice(monthly: number) {
    return Math.round(monthly * (1 - ANNUAL_DISCOUNT / 100));
  }

  async function handleCheckout(slug: "pro" | "ultra") {
    if (!isSignedIn) {
      window.location.href = `/sign-up?redirect_url=${encodeURIComponent("/dashboard")}`;
      return;
    }

    setLoadingPlan(slug);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: slug, annual }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        console.error("Checkout error:", data.error);
      }
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <section id="pricing" className="relative px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-5xl">
        {/* Heading — matches Features / FAQ */}
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Pricing
          </span>
          <h2 className="mt-4 text-[clamp(30px,4.5vw,52px)] font-semibold leading-[1.05] tracking-[-0.025em] text-foreground">
            Simple, honest pricing
          </h2>
          <p className="mx-auto mt-4 max-w-md text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
            One AI UI designer, two plans. Switch or cancel any time.
          </p>
        </div>

        {/* Billing-interval toggle */}
        <div className="mx-auto mb-12 flex w-fit items-center gap-1 rounded-full border border-foreground/8 bg-card/60 p-1 text-[13px] font-medium">
          <button
            onClick={() => setAnnual(false)}
            aria-pressed={!annual}
            className={`relative rounded-full px-4 py-1.5 transition-colors ${
              !annual ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            aria-pressed={annual}
            className={`relative inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-colors ${
              annual ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                annual ? "bg-background/20 text-background" : "bg-primary/10 text-primary"
              }`}
            >
              −{ANNUAL_DISCOUNT}%
            </span>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          {PLANS.map((card) => {
            const isLoading = loadingPlan === card.slug;
            const price = annual ? annualPrice(card.priceMonthly) : card.priceMonthly;

            return (
              <div
                key={card.slug}
                className={`group relative isolate flex flex-col overflow-hidden rounded-3xl border bg-card/60 p-7 transition-colors hover:bg-card/80 md:p-8 ${
                  card.featured
                    ? "border-primary/25 ring-1 ring-primary/15"
                    : "border-foreground/8"
                }`}
              >
                {/* Featured marker */}
                {card.featured && (
                  <span className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary md:right-7 md:top-7">
                    <SparkleIcon />
                    Most popular
                  </span>
                )}

                {/* Plan name + tagline */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {card.name}
                  </p>
                  <p className="mt-2 max-w-[36ch] text-[14px] leading-relaxed text-muted-foreground">
                    {card.tagline}
                  </p>
                </div>

                {/* Price */}
                <div className="mt-7 flex items-baseline gap-1.5">
                  <span className="text-[44px] font-semibold leading-none tracking-[-0.03em] text-foreground md:text-[52px]">
                    ${price}
                  </span>
                  <span className="text-[14px] font-medium text-muted-foreground">/ mo</span>
                </div>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  {annual ? (
                    <>
                      Billed annually at{" "}
                      <span className="font-medium text-foreground/85">${price * 12}/yr</span>
                    </>
                  ) : (
                    "Billed monthly"
                  )}
                </p>

                <div className="my-7 h-px bg-foreground/[0.08]" />

                {/* Feature list */}
                <ul className="flex flex-col gap-3">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-foreground/80">
                      <span className="mt-[3px]">
                        <CheckIcon />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-8">
                  <Button
                    variant={card.featured ? "clay" : "outline"}
                    size="xl"
                    className={`w-full ${card.featured ? "" : "border-foreground/12 bg-card/40 hover:bg-card hover:border-foreground/20"}`}
                    disabled={isLoading}
                    onClick={() => handleCheckout(card.slug)}
                  >
                    {isLoading ? (
                      <>
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                        Processing…
                      </>
                    ) : (
                      card.cta
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust line */}
        <p className="mt-10 text-center text-[13px] text-muted-foreground">
          Secure checkout by{" "}
          <span className="font-medium text-foreground/80">Dodo Payments</span>. No setup fees, cancel any time.
        </p>
      </div>
    </section>
  );
}
