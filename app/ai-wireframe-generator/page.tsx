import type { Metadata } from "next";
import { SearchLanding } from "@/components/marketing/search-landing";

export const metadata: Metadata = {
  title: "AI Wireframe Generator for Complete Product Flows",
  description: "Generate editable wireframes, UI states, and a complete multi-screen product flow from one prompt. Refine on canvas and export to code with Wirefraime.",
  alternates: { canonical: "/ai-wireframe-generator" },
  openGraph: {
    title: "AI Wireframe Generator for Complete Product Flows",
    description: "Turn one product brief into a complete, editable wireframe flow with Wirefraime.",
    url: "/ai-wireframe-generator",
    images: ["/og.webp"],
  },
};

export default function AiWireframeGeneratorPage() {
  return (
    <SearchLanding
      eyebrow="AI wireframe generator"
      title="Generate every wireframe in your product flow from one prompt."
      intro="Wirefraime plans the screens, creates the interface, covers important UI states, and keeps the whole flow visually consistent—so founders and product teams can validate an idea before development begins."
      definitionTitle="What is an AI wireframe generator?"
      definition="An AI wireframe generator turns a written product brief into visual interface structure. Wirefraime goes beyond a single low-fidelity frame: it plans a connected set of screens, produces high-fidelity UI, creates a shared design system, and keeps the result editable. That makes the output useful for product discussion, user-flow review, stakeholder approval, and developer handoff—not only early brainstorming."
      benefits={[
        { title: "Generate the whole flow", description: "Start with onboarding, dashboards, settings, and the states between them. Wirefraime plans the screens as one product instead of creating isolated frames." },
        { title: "Keep every screen consistent", description: "Colors, type, spacing, components, and interaction patterns come from one reusable design system, so later screens do not feel bolted on." },
        { title: "Refine without starting over", description: "Select an element on the canvas or describe a change in chat. Adjust copy, layout, color, and components while preserving the rest of the design." },
        { title: "Hand off something concrete", description: "Export PNGs for review, clean HTML and Tailwind for implementation, or a Next.js project when the flow is ready to move into development." },
      ]}
      steps={[
        { title: "Describe the product", description: "Explain the users, main job, essential features, and visual direction in plain language." },
        { title: "Review the planned screens", description: "Wirefraime turns the brief into a screen map and generates a coherent UI flow on the canvas." },
        { title: "Refine and export", description: "Edit individual elements, ask for broader changes, then export the screens or code for your team." },
      ]}
      questions={[
        { question: "Can Wirefraime generate more than one screen?", answer: "Yes. Multi-screen generation is the core workflow. A product brief can become onboarding, primary workflows, settings, empty states, and other screens that belong to the same design system." },
        { question: "Are the wireframes editable?", answer: "Yes. You can edit elements on the canvas and use chat-based refinement to change the copy, layout, components, and visual direction." },
        { question: "Does it create low-fidelity or high-fidelity wireframes?", answer: "Wirefraime creates high-fidelity interface screens with real components and content. The result is intended for product validation and handoff, not only boxes-and-arrows exploration." },
        { question: "Can I export the generated wireframes?", answer: "Yes. Paid plans include PNG export, HTML and Tailwind export, and full Next.js project export." },
        { question: "How much does it cost?", answer: "Starter is $5 month-to-month or $3 per month when billed annually, with 7 screens per month. Pro is $20 month-to-month or $12 per month when billed annually, with 40 screens per month. Ultra is $40 month-to-month or $24 per month when billed annually, with 100 screens per month." },
      ]}
      related={[{ href: "/ai-ui-generator", label: "AI UI generator" }]}
    />
  );
}
