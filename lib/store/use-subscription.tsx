"use client";

import useSWR from "swr";
import { useAuth } from "@clerk/nextjs";

export type PlanId = "free" | "pro" | "ultra";
export type SubscriptionStatus =
  | "inactive"
  | "active"
  | "past_due"
  | "cancel_pending";

type SubscriptionPayload = {
  planId: PlanId;
  subscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  limits: { screens: number };
  screensUsed: number;
  screensRemaining: number;
};

const fetcher = async (url: string): Promise<SubscriptionPayload> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load subscription (${res.status})`);
  return res.json();
};

/**
 * Subscription state for client components. Source of truth is `/api/subscription`
 * which reads from Postgres — the same DB the Dodo webhook writes to.
 *
 * Use `mutate()` to force a refresh after returning from Dodo's checkout/portal.
 */
export function useSubscription() {
  const { isSignedIn, isLoaded } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<SubscriptionPayload>(
    isSignedIn ? "/api/subscription" : null,
    fetcher,
    {
      revalidateOnFocus: true,
      shouldRetryOnError: false,
      dedupingInterval: 30_000,
    }
  );

  const planId = data?.planId ?? "free";
  const status = data?.subscriptionStatus ?? "inactive";
  const isActive = status === "active";

  return {
    isLoaded: isLoaded && !isLoading,
    isLoading,
    error,
    planId,
    subscriptionId: data?.subscriptionId ?? null,
    subscriptionStatus: status,
    limits: data?.limits ?? { screens: 0 },
    screensUsed: data?.screensUsed ?? 0,
    screensRemaining: data?.screensRemaining ?? 0,
    isActive,
    isPro: isActive && (planId === "pro" || planId === "ultra"),
    refresh: mutate,
  };
}
