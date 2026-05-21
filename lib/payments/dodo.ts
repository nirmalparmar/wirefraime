import "server-only";

export type PlanId = "free" | "pro" | "ultra";
export type SubscriptionStatus =
  | "inactive"
  | "active"
  | "past_due"
  | "cancel_pending";

export const PLAN_LIMITS: Record<PlanId, { screens: number }> = {
  free: { screens: 0 },
  pro: { screens: 150 },
  ultra: { screens: 350 },
};

/** Monthly prices in USD */
export const PLAN_PRICES: Record<Exclude<PlanId, "free">, { monthly: number; annual: number }> = {
  pro: { monthly: 20, annual: Math.round(20 * (1 - 0.4)) },
  ultra: { monthly: 40, annual: Math.round(40 * (1 - 0.4)) },
};

export const ANNUAL_DISCOUNT = 40;

type PlanKey = `${Exclude<PlanId, "free">}_${"monthly" | "annual"}`;

/** Dodo product IDs keyed by `${plan}_${cycle}`. Server-only — never expose. */
const PRODUCT_IDS: Record<PlanKey, string | undefined> = {
  pro_monthly: process.env.DODO_PRO_MONTHLY_PRODUCT_ID,
  pro_annual: process.env.DODO_PRO_ANNUAL_PRODUCT_ID,
  ultra_monthly: process.env.DODO_ULTRA_MONTHLY_PRODUCT_ID,
  ultra_annual: process.env.DODO_ULTRA_ANNUAL_PRODUCT_ID,
};

/** Reverse map: Dodo product ID → plan tier. Built lazily so env order doesn't matter. */
const PRODUCT_TO_PLAN: Record<string, PlanId> = Object.entries(PRODUCT_IDS).reduce(
  (acc, [key, productId]) => {
    if (productId) acc[productId] = key.startsWith("pro_") ? "pro" : "ultra";
    return acc;
  },
  {} as Record<string, PlanId>
);

export function getProductId(plan: Exclude<PlanId, "free">, annual: boolean): string | null {
  return PRODUCT_IDS[`${plan}_${annual ? "annual" : "monthly"}` as PlanKey] ?? null;
}

export function planFromProductId(productId: string | null | undefined): PlanId | null {
  if (!productId) return null;
  return PRODUCT_TO_PLAN[productId] ?? null;
}
