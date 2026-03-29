"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { SERIF, SANS } from "@/lib/constants";
import { useTheme } from "@/components/ThemeProvider";

type SubscriptionInfo = {
  planId: string;
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

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then(setSub)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const plan = PLAN_DISPLAY[sub?.planId ?? "free"] ?? PLAN_DISPLAY.free;

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: SANS }}>
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 md:pt-5">
        <div className="liquid-glass-adaptive mx-auto flex max-w-5xl items-center justify-between rounded-full px-5 py-2.5 md:px-6 md:py-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-muted-foreground no-underline transition-colors hover:text-foreground">
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
            {/* Current plan */}
            <div className="liquid-glass-adaptive rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Current plan</p>
                  <p className={`text-[22px] font-medium tracking-tight ${plan.color}`} style={{ fontFamily: SERIF }}>
                    {plan.name}
                  </p>
                </div>
                <div className={`rounded-full px-3 py-1 text-[12px] font-medium ${sub?.subscriptionStatus === "active" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                  {sub?.subscriptionStatus === "active" ? "Active" : "No plan"}
                </div>
              </div>

              {sub && sub.limits && sub.planId !== "free" && (
                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-foreground/[0.06] pt-4">
                  <div>
                    <p className="mb-0.5 text-[11px] text-muted-foreground">Screens used</p>
                    <p className="text-[15px] font-medium text-foreground">
                      {sub.screensUsed} / {sub.limits.screens}
                    </p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-[11px] text-muted-foreground">Remaining</p>
                    <p className="text-[15px] font-medium text-foreground">
                      {sub.screensRemaining} screens
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Upgrade CTA */}
            {(sub?.planId === "free" || sub?.planId === "pro") && (
              <div className="liquid-glass-adaptive rounded-xl p-6 ring-1 ring-primary/20">
                <p className="mb-1 text-[15px] font-medium text-foreground" style={{ fontFamily: SERIF }}>
                  {sub?.planId === "free" ? "Subscribe to get started" : "Upgrade to Ultra"}
                </p>
                <p className="mb-4 text-[13px] text-muted-foreground">
                  {sub?.planId === "free"
                    ? "Choose a plan to start generating screens with AI."
                    : "Get 120 screens/month, advanced AI models, and team collaboration."}
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
