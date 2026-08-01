"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ANNUAL_DISCOUNT, PLANS, annualPrice, type PlanSlug } from "@/lib/pricing";
import { Em, Eyebrow, SectionHeading } from "@/components/landing/sections/section-heading";
import { PricingCard } from "@/components/landing/pricing-card";

/* ── Section ─────────────────────────────────────────────────── */

export function Pricing() {
  const [annual, setAnnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { isSignedIn } = useAuth();

  async function handleCheckout(slug: PlanSlug) {
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
    <section id="pricing" className="relative px-6 py-20 text-foreground md:px-10 md:py-28">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12">
          <SectionHeading
            align="center"
            eyebrow={<Eyebrow tone="amber">Pricing</Eyebrow>}
            title={
              <>
                Simple, <Em>honest</Em> pricing
              </>
            }
            lede="Two plans. Switch or cancel any time."
          />
        </div>

        {/* Billing-interval toggle */}
        <div className="mx-auto mb-10 flex w-fit items-center gap-1 rounded-full bg-muted p-1 text-[13px] font-medium">
          <button
            onClick={() => setAnnual(false)}
            aria-pressed={!annual}
            className={`relative rounded-full px-4 py-1.5 transition-colors ${
              !annual ? "bg-card text-foreground shadow-[var(--wf-shadow-soft)]" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            aria-pressed={annual}
            className={`relative inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-colors ${
              annual ? "bg-card text-foreground shadow-[var(--wf-shadow-soft)]" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-accent-foreground">
              −{ANNUAL_DISCOUNT}%
            </span>
          </button>
        </div>

        {/* Plan cards — one flush bordered strip, no gaps */}
        <div className="grid overflow-hidden rounded-[20px] border border-border md:grid-cols-2">
          {PLANS.map((card, i) => {
            const isLoading = loadingPlan === card.slug;
            const price = annual ? annualPrice(card.priceMonthly) : card.priceMonthly;

            return (
              <PricingCard
                key={card.slug}
                className={i < PLANS.length - 1 ? "border-b border-border md:border-b-0 md:border-r md:border-border" : ""}
                plan={{
                  id: card.slug,
                  name: card.name,
                  tagline: card.tagline,
                  price: `$${price}`,
                  priceNote: "/ mo",
                  priceSubnote: annual ? `Billed annually at $${price * 12}/yr` : "Billed monthly",
                  cta: card.cta,
                  featured: card.featured,
                  features: card.features,
                }}
                loading={isLoading}
                onSelect={() => handleCheckout(card.slug)}
              />
            );
          })}
        </div>

        {/* Trust line */}
        <p className="mt-10 text-center text-[13px] text-muted-foreground">
          Secure checkout by Dodo Payments · No setup fees · Cancel any time
        </p>
      </div>
    </section>
  );
}
