import type { PricingTier } from "@/components/landing/pricing-card";

export const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "#org",
      name: "Wirefraime",
      alternateName: ["Wireframe AI", "AI Wireframe Tool"],
      url: "/",
      logo: "/logo.svg",
    },
    {
      "@type": "WebSite",
      "@id": "#site",
      url: "/",
      name: "Wirefraime",
      publisher: { "@id": "#org" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Wirefraime",
      alternateName: "AI Wireframe & UI Design Tool",
      applicationCategory: "DesignApplication",
      applicationSubCategory: "Wireframe Tool",
      operatingSystem: "Web",
      description:
        "Wirefraime is an AI wireframe and UI design tool. Generate wireframes, UI mockups, and every screen of your app from a single prompt — your AI UI designer.",
      featureList: [
        "AI wireframe generation",
        "UI mockup from text prompt",
        "Full design system generation",
        "Live in-canvas editing",
        "Chat-based UI refinement",
        "Export to HTML, Tailwind, Next.js",
      ],
      keywords:
        "wireframe, wireframe tool, AI wireframe, wireframe mockup, AI UI design, UI designer, AI UI designer, UI design tool",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        ratingCount: "120",
      },
    },
  ],
};

export const TICKER = [
  { initials: "ZR", color: "#7aa4e8", name: "Zach", verb: "Building", cls: "verb-building", bold: "PicSEO" },
  { initials: "JM", color: "#f0a0a0", name: "Jesse", verb: "Shipped", cls: "verb-shipped", bold: "Salon Booker" },
  { initials: "CA", color: "#8fd6a3", name: "Carolina", verb: "Building", cls: "verb-building", bold: "Analytics Hub" },
  { initials: "AK", color: "#f0bd7a", name: "Aidan", verb: "Launched", cls: "verb-launched", bold: "Sprint Tracker" },
  { initials: "SK", color: "#c79be0", name: "Sarah", verb: "Building", cls: "verb-building", bold: "Client Portal" },
  { initials: "TL", color: "#7fc8e0", name: "Tom", verb: "Shipped", cls: "verb-shipped", bold: "EduTrack" },
  { initials: "PR", color: "#f09595", name: "Priya", verb: "Building", cls: "verb-building", bold: "HR Dashboard" },
  { initials: "MN", color: "#7aa4e8", name: "Marco", verb: "Launched", cls: "verb-launched", bold: "InventoryOS" },
  { initials: "EW", color: "#8fd6a3", name: "Emma", verb: "Building", cls: "verb-building", bold: "TechBlog CMS" },
  { initials: "DS", color: "#f0bd7a", name: "Diego", verb: "Shipped", cls: "verb-shipped", bold: "Event Planner" },
];

export const NAV_LINKS = [
  { label: "Pricing", href: "/#pricing" },
  { label: "Docs", href: "/blog" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Community", href: "/#gallery" },
];

export const PROOF = [
  { number: "48k+", label: "Screens generated" },
  { number: "12k", label: "Builders" },
  { number: "4 min", label: "Prompt to full design" },
  { number: "4.9 / 5", label: "Average rating" },
];

export const CHIPS = [
  { label: "CRM dashboard", prompt: "A CRM dashboard for my sales team" },
  { label: "Booking system", prompt: "A booking system for a hair salon" },
  { label: "Analytics app", prompt: "An analytics app for my SaaS product" },
  { label: "Project tracker", prompt: "A project management tool like Notion" },
];

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Pro",
    tagline: "Everything you need to ship your first product.",
    price: "$12",
    period: "/ mo",
    features: [
      "150 screens / month",
      "Full component library",
      "HTML & Next.js export",
      "PNG export per screen",
      "Chat refinement",
      "Design system generation",
    ],
    cta: "Start Pro",
    ctaHref: `/sign-up?redirect_url=${encodeURIComponent("/dashboard/billing")}`,
  },
  {
    name: "Ultra",
    tagline: "For teams designing multiple products at once.",
    price: "$40",
    period: "/ mo",
    features: [
      "350 screens / month",
      "Full component library",
      "HTML & Next.js export",
      "PNG export per screen",
      "Chat refinement",
      "Design system generation",
    ],
    cta: "Start Ultra",
    ctaHref: `/sign-up?redirect_url=${encodeURIComponent("/dashboard/billing")}`,
    featured: true,
    badge: "Most popular",
  },
];

export const HOW_STEPS = [
  {
    n: "01",
    title: "Describe your app",
    desc: "Write a plain-English description — as detailed or as loose as you like. WireFraime reads what you mean, not just what you say.",
  },
  {
    n: "02",
    title: "Watch screens appear",
    desc: "Every screen streams onto the canvas as it's designed — layout, color, and components drawn from one coherent design system, in real time.",
  },
  {
    n: "03",
    title: "Refine and export",
    desc: "Click any element to edit it, or chat to change anything. When it's right, export clean HTML, Tailwind, or a full Next.js project.",
  },
];

export const TESTIMONIALS = [
  {
    text: "\"I described our internal ops tool on a Tuesday morning. By lunch it was live and the team was using it. I genuinely couldn't believe it.\"",
    av: "AR",
    color: "#3366cc",
    name: "Alex Rivera",
    handle: "@alexbuilds · Clearflow",
  },
  {
    text: "\"The design quality is what gets me. It doesn't look AI-generated. It looks like a designer spent a week on it. Our clients have no idea.\"",
    av: "MJ",
    color: "#9055bb",
    name: "Maya Johnson",
    handle: "@mayabuilds · Freelancer",
  },
  {
    text: "\"We killed our four-month dev sprint. WireFraime built the prototype in an afternoon, we validated it with users, and we were profitable before we wrote a line of code.\"",
    av: "KL",
    color: "#2e8b57",
    name: "Kai Larsson",
    handle: "@kaishipps · Meridian",
  },
];

export const CALENDAR = ["#ffd0d0", "#ffd0d0", "#ffe8d0", "#d0ffd8", "#ffd0d0", "#e8e8e8", "#e8e8e8", "#d0ffd8", "#ffd0d0", "#ffe8d0", "#ffd0d0", "#d0ffd8", "#ffd0d0", "#e8e8e8"];

export const CHART = [
  { h: "30%", c: "#b9f0ce" },
  { h: "55%", c: "#80d0a0" },
  { h: "45%", c: "#b9f0ce" },
  { h: "70%", c: "#50b070" },
  { h: "60%", c: "#80d0a0" },
  { h: "85%", c: "#50b070" },
  { h: "75%", c: "#b9f0ce" },
];
