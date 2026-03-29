"use client";

import { useUser } from "@clerk/nextjs";
import { PLAN_LIMITS, PLAN_PRODUCT_IDS, type PlanId } from "@/lib/payments/dodo";

export function useSubscription() {
  const { user, isLoaded } = useUser();

  const productId = (user?.publicMetadata?.plan as string) ?? null;
  const subscriptionStatus =
    (user?.publicMetadata?.subscriptionStatus as string) ?? "inactive";

  const planId: PlanId =
    productId && subscriptionStatus === "active"
      ? PLAN_PRODUCT_IDS[productId] ?? "free"
      : "free";

  const limits = PLAN_LIMITS[planId];
  const isActive = subscriptionStatus === "active";
  const isPro = planId === "pro" || planId === "ultra";

  return {
    isLoaded,
    planId,
    productId,
    subscriptionStatus,
    limits,
    isActive,
    isPro,
  };
}
