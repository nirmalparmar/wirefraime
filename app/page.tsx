"use client";

import { useEffect } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { TrustBand } from "@/components/landing/trust-band";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

const JSON_LD = {
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

export default function Home() {
  /* Scroll reveal observer */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        }),
      { threshold: 0.07, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Navbar />
      <main>
        <Hero />
        <TrustBand />
        <Features />
        <HowItWorks />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
