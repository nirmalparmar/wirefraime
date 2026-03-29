export type PlanId = "free" | "pro" | "ultra";

export const PLAN_LIMITS: Record<PlanId, { screens: number }> = {
  free: { screens: 0 },
  pro: { screens: 50 },
  ultra: { screens: 120 },
};

/** Monthly prices in USD */
export const PLAN_PRICES: Record<Exclude<PlanId, "free">, { monthly: number; annual: number }> = {
  pro: { monthly: 20, annual: Math.round(20 * (1 - 0.56)) },
  ultra: { monthly: 40, annual: Math.round(40 * (1 - 0.56)) },
};

/** Annual discount percentage */
export const ANNUAL_DISCOUNT = 56;

/** Map Dodo product IDs → plan IDs */
export const PLAN_PRODUCT_IDS: Record<string, PlanId> = {
  [process.env.NEXT_PUBLIC_DODO_PRO_MONTHLY_PRODUCT_ID ?? ""]: "pro",
  [process.env.NEXT_PUBLIC_DODO_PRO_ANNUAL_PRODUCT_ID ?? ""]: "pro",
  [process.env.NEXT_PUBLIC_DODO_ULTRA_MONTHLY_PRODUCT_ID ?? ""]: "ultra",
  [process.env.NEXT_PUBLIC_DODO_ULTRA_ANNUAL_PRODUCT_ID ?? ""]: "ultra",
};
