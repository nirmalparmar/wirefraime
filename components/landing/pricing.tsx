"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "./section-heading";

const ANNUAL_DISCOUNT = 56;

const PLANS = [
  {
    plan: "Pro",
    slug: "pro" as const,
    priceMonthly: 20,
    featured: false,
    features: [
      "50 screens / month",
      "Full component library",
      "HTML & React export",
      "Chat refinement",
      "Design system generation",
      "Priority support",
    ],
    cta: "Start Pro",
    ctaVariant: "outline" as const,
  },
  {
    plan: "Ultra",
    slug: "ultra" as const,
    priceMonthly: 40,
    featured: true,
    features: [
      "120 screens / month",
      "Everything in Pro",
      "Advanced AI models",
      "Custom design systems",
      "Figma export",
      "Team collaboration",
      "Dedicated support",
    ],
    cta: "Start Ultra",
    ctaVariant: "clay" as const,
  },
];

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
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <section
      id="pricing"
      className="px-5 py-20 md:px-12 md:py-28"
    >
      <div className="mx-auto max-w-4xl">
        <div className="reveal mb-6 md:mb-10">
          <SectionHeading
            badge="Pricing"
            title={
              <>
                Simple, <em className="text-primary">honest</em> pricing.
              </>
            }
          />
        </div>

        {/* Toggle */}
        <div className="reveal mb-10 flex items-center justify-center gap-3 md:mb-14">
          <span
            className={`text-sm font-medium ${annual ? "text-muted-foreground" : "text-foreground"}`}
          >
            Monthly
          </span>
          <button
            role="switch"
            aria-checked={annual}
            onClick={() => setAnnual((p) => !p)}
            className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
              annual ? "bg-primary" : "bg-muted"
            }`}
          >
            <div
              className={`absolute top-[3px] left-[3px] size-[18px] rounded-full bg-white shadow-sm transition-transform ${
                annual ? "translate-x-5" : ""
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}
          >
            Annual
          </span>
          {annual && (
            <Badge className="border-primary/20 bg-primary/10 text-primary">
              -{ANNUAL_DISCOUNT}%
            </Badge>
          )}
        </div>

        {/* Cards */}
        <div className="reveal grid gap-5 md:grid-cols-2">
          {PLANS.map((card) => {
            const isLoading = loadingPlan === card.slug;
            const price = annual ? annualPrice(card.priceMonthly) : card.priceMonthly;

            return (
              <div
                key={card.plan}
                className={`liquid-glass-adaptive relative rounded-xl p-7 transition-all md:p-8 ${
                  card.featured
                    ? "ring-1 ring-primary/30 shadow-[0_0_32px_rgba(220,38,38,0.08)]"
                    : "hover:bg-foreground/[0.03]"
                }`}
              >
                {card.featured && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-lg bg-primary px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                    Most popular
                  </div>
                )}

                <div className="mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {card.plan}
                </div>

                <div className="mb-1 flex items-start font-serif text-5xl tracking-tight text-foreground">
                  <sup className="mt-2.5 text-lg font-medium">$</sup>
                  {price}
                </div>

                <div className="mb-6 text-sm text-muted-foreground">
                  {annual ? (
                    <>per month, billed <span className="font-medium text-foreground">${price * 12}/yr</span></>
                  ) : (
                    "per month"
                  )}
                </div>

                <div className="mb-6 h-px bg-foreground/[0.06]" />

                <ul className="mb-7 flex flex-col gap-3">
                  {card.features.map((text) => (
                    <li
                      key={text}
                      className="flex items-center gap-2.5 text-sm text-muted-foreground"
                    >
                      <span className="shrink-0 text-xs text-green-500">✓</span>
                      {text}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={card.ctaVariant}
                  size="xl"
                  className={`w-full ${card.ctaVariant === "outline" ? "liquid-glass-adaptive border-none" : ""}`}
                  disabled={isLoading}
                  onClick={() => handleCheckout(card.slug)}
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                      Processing...
                    </>
                  ) : (
                    card.cta
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
