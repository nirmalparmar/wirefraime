export const ANNUAL_DISCOUNT = 40;

export type PlanSlug = "starter" | "pro" | "ultra";

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
    name: "Starter",
    slug: "starter",
    tagline: "Kick the tires and design your first few screens.",
    priceMonthly: 5,
    featured: false,
    features: [
      "7 screens / month",
      "Full component library",
      "HTML & Next.js export",
      "PNG export per screen",
      "Chat refinement",
      "Design system generation",
    ],
    cta: "Start Starter",
  },
  {
    name: "Pro",
    slug: "pro",
    tagline: "Everything you need to ship your first product.",
    priceMonthly: 20,
    featured: false,
    features: [
      "40 screens / month",
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
      "100 screens / month",
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
