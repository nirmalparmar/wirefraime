import { PLANS, PRICE_RANGE } from "@/lib/pricing";

export const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://wirefraime.com/#organization",
      name: "Wirefraime",
      url: "https://wirefraime.com/",
      logo: "https://wirefraime.com/logo.png",
    },
    {
      "@type": "WebSite",
      "@id": "https://wirefraime.com/#website",
      url: "https://wirefraime.com/",
      name: "Wirefraime",
      publisher: { "@id": "https://wirefraime.com/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://wirefraime.com/#software",
      name: "Wirefraime",
      url: "https://wirefraime.com/",
      applicationCategory: "DesignApplication",
      applicationSubCategory: "AI App Design Tool",
      operatingSystem: "Web",
      description:
        "Wirefraime turns a product idea into a consistent set of editable app screens, UI states, and a reusable design system, with a dedicated agent for landing pages.",
      featureList: [
        "AI app and wireframe generation",
        "Connected UI flows from a text prompt",
        "Dedicated AI landing-page builder",
        "Live in-canvas editing",
        "Chat-based UI refinement",
        "Export to HTML, Tailwind, Next.js",
      ],
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: String(PRICE_RANGE.low),
        highPrice: String(PRICE_RANGE.high),
        offerCount: String(PLANS.length),
      },
    },
  ],
};

export const NAV_LINKS = [
  { label: "Landing builder", href: "/landing-page-builder" },
  // { label: "Examples", href: "/#gallery" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Blog", href: "/blog" },
];

export const CHIPS = [
  { label: "CRM dashboard", prompt: "A CRM dashboard for my sales team" },
  { label: "Booking system", prompt: "A booking system for a hair salon" },
  { label: "Analytics app", prompt: "An analytics app for my SaaS product" },
  { label: "Project tracker", prompt: "A project management tool like Notion" },
];

export const HOW_STEPS = [
  {
    n: "01",
    title: "Describe your app",
    desc: "Write a plain-English description, as detailed or as loose as you like.",
  },
  {
    n: "02",
    title: "Watch screens appear",
    desc: "Every screen streams onto the canvas in real time, styled from one design system.",
  },
  {
    n: "03",
    title: "Refine and export",
    desc: "Click any element to edit, or chat to change anything. Export clean code when it's ready.",
  },
];

export const CALENDAR = ["#ece4da", "#ded5ca", "#f1ece4", "#37322f", "#ece4da", "#efe9e2", "#efe9e2", "#37322f", "#ded5ca", "#f1ece4", "#ece4da", "#37322f", "#ded5ca", "#efe9e2"];

export const CHART = [
  { h: "30%", c: "#ded5ca" },
  { h: "55%", c: "#a89e94" },
  { h: "45%", c: "#ded5ca" },
  { h: "70%", c: "#37322f" },
  { h: "60%", c: "#a89e94" },
  { h: "85%", c: "#2a2621" },
  { h: "75%", c: "#ded5ca" },
];
