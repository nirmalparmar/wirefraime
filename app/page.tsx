"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { JSON_LD } from "@/components/landing/home-data";
import { FAQ } from "@/components/landing/faq";
import { Pricing } from "@/components/landing/pricing";
import { LandingNavbar } from "@/components/landing/sections/landing-navbar";
import { PromptHero } from "@/components/landing/sections/prompt-hero";
import { ProductPreviewSection } from "@/components/landing/sections/product-preview";
import { CapabilitiesSection } from "@/components/landing/sections/capabilities";
import { GallerySection } from "@/components/landing/sections/gallery";
import { ProcessSection } from "@/components/landing/sections/process";
import { FooterCtaSection } from "@/components/landing/sections/footer-cta";
import { LandingFooter } from "@/components/landing/sections/landing-footer";

export default function Home() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState("");

  function submitPrompt() {
    const val = prompt.trim();
    if (!val) return;
    sessionStorage.setItem("wirefraime-landing-prompt", val);
    router.push("/dashboard");
  }

  // Scroll-reveal for .fade-up elements
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("vis");
            obs.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" }
    );
    root.querySelectorAll(".fade-up").forEach((el) => obs.observe(el));

    return () => obs.disconnect();
  }, []);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <div
        className="wf-landing overflow-x-hidden bg-background font-sans text-[15px] leading-[1.5] text-foreground antialiased"
        ref={rootRef}
      >
        <LandingNavbar />
        <div>
          <PromptHero
            prompt={prompt}
            onPromptChange={setPrompt}
            onPromptSubmit={submitPrompt}
          />
          <ProductPreviewSection />
          <CapabilitiesSection />
          <GallerySection />
          <ProcessSection />
          <Pricing />
          <FAQ />
          <FooterCtaSection
            prompt={prompt}
            onPromptChange={setPrompt}
            onPromptSubmit={submitPrompt}
          />
          <LandingFooter />
        </div>
      </div>
    </>
  );
}
