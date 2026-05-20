"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { SERIF, SANS } from "@/lib/constants";
import { useTheme } from "@/components/ThemeProvider";

type SubscriptionInfo = {
  planId: string;
  subscriptionId: string | null;
  subscriptionStatus: string;
  limits: { screens: number };
  screensUsed: number;
  screensRemaining: number;
};

const PLAN_DISPLAY: Record<string, { name: string; color: string }> = {
  free: { name: "Free", color: "text-muted-foreground" },
  pro: { name: "Pro", color: "text-primary" },
  ultra: { name: "Ultra", color: "text-chart-2" },
};

export default function BillingPage() {
  const { theme, toggle } = useTheme();
  const { user } = useUser();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalInFlight, setPortalInFlight] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then(setSub)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const plan = PLAN_DISPLAY[sub?.planId ?? "free"] ?? PLAN_DISPLAY.free;
  const hasPaidPlan = sub?.planId !== "free" && sub?.subscriptionStatus !== "inactive";

  async function openBillingPortal() {
    setPortalInFlight(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/customer-portal");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "We couldn't open the billing portal. Please try again.");
      }
      window.location.href = data.url;
    } catch (e) {
      setPortalError(e instanceof Error ? e.message : "We couldn't open the billing portal.");
      setPortalInFlight(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: SANS }}>
      <nav className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 md:pt-5">
        <div className="liquid-glass-adaptive mx-auto flex max-w-5xl items-center justify-between rounded-full px-5 py-2.5 md:px-6 md:py-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground no-underline transition-colors hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.5 8H3.5M7 4.5L3.5 8 7 11.5" />
            </svg>
            Back to Dashboard
          </Link>
          <button onClick={toggle} className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground">
            {theme === "dark" ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-[640px] px-5 pb-20 pt-28 md:px-12">
        <h1 className="mb-2 text-[32px] leading-none tracking-tight text-foreground" style={{ fontFamily: SERIF }}>
          Billing
        </h1>
        <p className="mb-10 text-[14px] text-muted-foreground">
          Manage your subscription and billing details.
        </p>

        {loading ? (
          <div className="space-y-4">
            <div className="sk liquid-glass-adaptive h-24 rounded-xl" />
            <div className="sk2 liquid-glass-adaptive h-16 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current plan + usage */}
            <div className="liquid-glass-adaptive rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Current plan</p>
                  <p className={`text-[22px] font-medium tracking-tight ${plan.color}`} style={{ fontFamily: SERIF }}>
                    {plan.name}
                  </p>
                </div>
                <div className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium ${
                  sub?.subscriptionStatus === "active"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {sub?.subscriptionStatus === "active" ? "Active" : "No plan"}
                </div>
              </div>

              {hasPaidPlan && sub && (
                <div className="mt-4 border-t border-foreground/[0.06] pt-4">
                  <p className="mb-0.5 text-[11px] text-muted-foreground">Screens used this month</p>
                  <p className="text-[15px] font-medium text-foreground">
                    {sub.screensUsed} / {sub.limits.screens}
                  </p>
                </div>
              )}
            </div>

            {/* Manage subscription — single CTA delegates to Dodo */}
            {hasPaidPlan ? (
              <div className="liquid-glass-adaptive rounded-xl p-6">
                <p className="mb-1 text-[15px] font-medium text-foreground" style={{ fontFamily: SERIF }}>
                  Manage subscription
                </p>
                <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
                  Open the secure billing portal to change plan, update your payment method,
                  download invoices, or cancel.
                </p>
                <Button
                  variant="clay"
                  onClick={openBillingPortal}
                  disabled={portalInFlight}
                  className="gap-2"
                >
                  {portalInFlight ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
                      <path d="M1.5 6.5h13" />
                      <path d="M4 9.5h2" />
                    </svg>
                  )}
                  Manage billing
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                    <path d="M6 3h7v7" />
                    <path d="M13 3L5 11" />
                  </svg>
                </Button>
                {portalError && (
                  <div className="mt-4 flex items-start gap-3 rounded-lg bg-destructive/[0.06] px-4 py-3 ring-1 ring-destructive/20">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-destructive">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <div className="flex-1 text-[13px] text-foreground/85">
                      <p>{portalError}</p>
                      <button
                        onClick={() => setPortalError(null)}
                        className="mt-1 text-[12px] font-medium text-destructive underline underline-offset-2 hover:no-underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="liquid-glass-adaptive rounded-xl p-6 ring-1 ring-primary/20">
                <p className="mb-1 text-[15px] font-medium text-foreground" style={{ fontFamily: SERIF }}>
                  Subscribe to get started
                </p>
                <p className="mb-4 text-[13px] text-muted-foreground">
                  Choose a plan to start generating screens with AI.
                </p>
                <Button variant="clay" size="xl" asChild>
                  <Link href="/#pricing">View plans</Link>
                </Button>
              </div>
            )}

            {/* Account info */}
            <div className="liquid-glass-adaptive rounded-xl p-6">
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Account</p>
              <div className="space-y-2 text-[14px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="text-foreground">{user?.emailAddresses[0]?.emailAddress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="text-foreground">{user?.fullName ?? "—"}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
