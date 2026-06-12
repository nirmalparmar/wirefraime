"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { JSON_LD } from "@/components/landing/home-data";
import {
  CapabilitiesSection,
  FooterCtaSection,
  GallerySection,
  LandingFooter,
  LandingNavbar,
  PricingSection,
  ProcessSection,
  PromptHero,
  ProofBar,
  TestimonialsSection,
  TickerStrip,
} from "@/components/landing/home-sections";

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

  // Nav shrink-on-scroll + scroll-reveal — DOM-class side effects, scoped to this page.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const navEl = root.querySelector("nav");
    let ticking = false;
    const updateNav = () => {
      navEl?.classList.toggle("scrolled", window.scrollY > 24);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateNav);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    updateNav();

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

    return () => {
      window.removeEventListener("scroll", onScroll);
      obs.disconnect();
    };
  }, []);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <div className="wf-landing" ref={rootRef}>
        <TickerStrip />
        <LandingNavbar />
        <PromptHero
          prompt={prompt}
          onPromptChange={setPrompt}
          onPromptSubmit={submitPrompt}
        />
        <ProofBar />
        <GallerySection />
        <CapabilitiesSection />
        <ProcessSection />
        <PricingSection />
        <TestimonialsSection />
        <FooterCtaSection />
        <LandingFooter />
      </div>
    </>
  );
}
