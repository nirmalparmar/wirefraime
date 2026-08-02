import type { Metadata } from "next";
import { SearchLanding } from "@/components/marketing/search-landing";

export const metadata: Metadata = {
  title: "AI UI Generator from Prompt for Web and Mobile Apps",
  description: "Turn a prompt into polished, editable app UI. Generate connected web or mobile screens, refine the design, and export HTML, Tailwind, Next.js, or PNG.",
  alternates: { canonical: "/ai-ui-generator" },
  openGraph: {
    title: "AI UI Generator from Prompt for Web and Mobile Apps",
    description: "Generate polished, editable app screens and a consistent design system from one prompt.",
    url: "/ai-ui-generator",
    images: ["/og.webp"],
  },
};

export default function AiUiGeneratorPage() {
  return (
    <SearchLanding
      eyebrow="AI UI generator from prompt"
      title="Turn a prompt into polished, editable app UI."
      intro="Describe the web or mobile product you want to create. Wirefraime generates the screens, states, components, and visual system together—then lets you refine the result on canvas or through chat."
      definitionTitle="From text prompt to a usable interface system."
      definition="An AI UI generator converts natural-language product requirements into visual interface designs. The useful part is not producing one attractive screen; it is maintaining hierarchy, components, content, and interaction patterns across a complete experience. Wirefraime creates the UI as a connected system, so a dashboard, onboarding flow, settings screen, empty state, and error state feel like parts of the same product."
      benefits={[
        { title: "Web and mobile app screens", description: "Generate dashboards, SaaS products, internal tools, booking flows, marketplaces, mobile apps, and landing pages from a written brief." },
        { title: "A design system comes with it", description: "Wirefraime defines reusable colors, typography, spacing, and components, then applies them across every generated screen." },
        { title: "Edit visually or with a prompt", description: "Make a focused canvas edit or ask the AI to change a wider part of the flow. The existing design remains visible and editable throughout." },
        { title: "Export beyond a screenshot", description: "Download high-resolution PNGs for review or export HTML, Tailwind, and Next.js code for a faster path into implementation." },
      ]}
      steps={[
        { title: "Write the UI brief", description: "Name the audience, platform, key workflow, required screens, and any brand or style constraints." },
        { title: "Generate the interface", description: "Wirefraime plans the experience, builds a shared visual system, and renders the connected screens." },
        { title: "Direct the final pass", description: "Refine content and visual choices, compare the screens as a flow, and export the approved result." },
      ]}
      questions={[
        { question: "What can I generate with the AI UI generator?", answer: "You can generate web apps, mobile apps, SaaS dashboards, onboarding flows, admin tools, booking products, landing pages, and other interface-driven products." },
        { question: "Do I need to know Figma or write code?", answer: "No. You can start with a plain-language brief and refine the result visually or through chat. Code export is available when a developer is ready to continue the work." },
        { question: "Will all generated screens use the same style?", answer: "Yes. Wirefraime creates a design system for the project and uses its components and tokens across the generated screens." },
        { question: "Can I export the UI as code?", answer: "Yes. Paid plans include HTML and Tailwind export as well as a full Next.js project export. PNG export is also included." },
        { question: "Is there a free generation plan?", answer: "You can create an account and inspect the workspace for free. AI screen generation currently requires a paid plan, starting at $3 per month when billed annually." },
      ]}
      related={[{ href: "/ai-wireframe-generator", label: "AI wireframe generator" }]}
    />
  );
}
