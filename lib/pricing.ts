export const ANNUAL_DISCOUNT = 40;

export type PlanSlug = "pro" | "ultra";

export type Plan = {
  name: string;
  slug: PlanSlug;
  tagline: string;
  priceMonthly: number;
  featured: boolean;
  features: string[];
  cta: string;
};

export const PLANS: Plan[] = [
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
      "Full component library",
      "HTML & Next.js export",
      "PNG export per screen",
      "Chat refinement",
      "Design system generation",
    ],
    cta: "Start Ultra",
  },
];

export function annualPrice(monthly: number) {
  return Math.round(monthly * (1 - ANNUAL_DISCOUNT / 100));
}

export const STARTING_PRICE = annualPrice(PLANS[0].priceMonthly);

export const PRICE_RANGE = {
  low: annualPrice(PLANS[0].priceMonthly),
  high: PLANS[PLANS.length - 1].priceMonthly,
};
