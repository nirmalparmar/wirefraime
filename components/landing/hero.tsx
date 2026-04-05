"use client";

import Link from "next/link";
import { useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const VIDEO_SRC = "/bg-video.mp4";
const FADE_MS = 500;
const FADE_OUT_OFFSET = 0.55;

const PROMPTS = [
  "A B2B SaaS CRM for sales teams — lead capture, pipeline, contact profiles, activity feed, analytics.",
  "Mobile banking app — account overview, send money, transaction history, bill payments, savings goals.",
  "E-commerce fashion app — home feed, product detail, size guide, cart, checkout, order tracking.",
];

export function Hero() {
  const typingRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const fadingOutRef = useRef(false);

  /* ── Video fade system ── */
  const cancelFade = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const animateOpacity = useCallback(
    (from: number, to: number, duration: number, onDone?: () => void) => {
      cancelFade();
      const video = videoRef.current;
      if (!video) return;
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        video.style.opacity = String(from + (to - from) * t);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = 0;
          onDone?.();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [cancelFade]
  );

  const fadeIn = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const current = parseFloat(video.style.opacity || "0");
    fadingOutRef.current = false;
    animateOpacity(current, 1, FADE_MS);
  }, [animateOpacity]);

  const fadeOutAndLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const current = parseFloat(video.style.opacity || "1");
    animateOpacity(current, 0, FADE_MS, () => {
      setTimeout(() => {
        if (!video) return;
        video.currentTime = 0;
        video.play();
        fadingOutRef.current = false;
        fadeIn();
      }, 100);
    });
  }, [animateOpacity, fadeIn]);

  const handleLoadedData = useCallback(() => fadeIn(), [fadeIn]);
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || fadingOutRef.current) return;
    const remaining = video.duration - video.currentTime;
    if (remaining <= FADE_OUT_OFFSET && remaining > 0) {
      fadingOutRef.current = true;
      fadeOutAndLoop();
    }
  }, [fadeOutAndLoop]);
  const handleEnded = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.style.opacity = "0";
    fadingOutRef.current = false;
    setTimeout(() => {
      video.currentTime = 0;
      video.play();
      fadeIn();
    }, 100);
  }, [fadeIn]);

  useEffect(() => () => cancelFade(), [cancelFade]);

  /* ── Typing effect ── */
  useEffect(() => {
    let pi = 0, ci = 0, del = false;
    let timer: ReturnType<typeof setTimeout>;
    function type() {
      const el = typingRef.current;
      if (!el) return;
      const cur = PROMPTS[pi];
      if (!del && ci <= cur.length) {
        el.textContent = cur.slice(0, ci++);
        timer = setTimeout(type, ci === cur.length + 1 ? 2600 : 22);
      } else if (!del) {
        del = true;
        timer = setTimeout(type, 80);
      } else if (del && ci > 0) {
        el.textContent = cur.slice(0, --ci);
        timer = setTimeout(type, 10);
      } else {
        del = false;
        pi = (pi + 1) % PROMPTS.length;
        timer = setTimeout(type, 400);
      }
    }
    type();
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* ── Video background — pinned to viewport height ── */}
      {/* <div className="pointer-events-none absolute inset-x-0 top-0 h-screen">
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          muted
          autoPlay
          playsInline
          loop={false}
          onLoadedData={handleLoadedData}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          className="absolute inset-0 h-full w-full object-cover opacity-0"
        /> */}

      {/* Theme-adaptive overlay: light = heavy white wash, dark = subtle dim */}
      {/* <div className="absolute inset-0 bg-background/50" /> */}
      {/* Bottom gradient fade into page background */}
      {/* <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-background to-transparent" /> */}
      {/* </div> */}

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-16 pt-32 text-center md:px-12 md:pb-24 md:pt-44">
        {/* Badge */}
        <div className="mb-7 animate-[fadeUp_0.5s_ease_both]">
          <div className="liquid-glass-adaptive inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-foreground/80">
            <span className="inline-block size-1.5 rounded-full bg-green-500" />
            Now in public beta
          </div>
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-3xl animate-[fadeUp_0.6s_0.08s_ease_both] font-serif text-[clamp(44px,5.5vw,76px)] leading-[1.05] tracking-tight text-foreground">
          Describe your app.{" "}
          <br className="hidden md:block" />
          Get the <em className="text-primary">full design.</em>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-xl animate-[fadeUp_0.6s_0.16s_ease_both] text-lg leading-relaxed text-muted-foreground md:text-xl">
          Tell Wirefraime your app&apos;s purpose and users. AI generates every
          screen, every flow, every edge case fully designed in seconds.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-[fadeUp_0.6s_0.24s_ease_both]">
          <Button variant="clay" size="2xl" className="shadow-[0_0_24px_rgba(220,38,38,0.12)]" asChild>
            <Link href="/dashboard">
              Start building
              <span className="text-lg">→</span>
            </Link>
          </Button>
          <Button variant="outline" size="2xl" className="liquid-glass-adaptive border-none" asChild>
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>

        {/* Powered by */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 animate-[fadeUp_0.6s_0.32s_ease_both] text-sm text-muted-foreground md:gap-8">
          <span className="text-[11px] font-medium uppercase tracking-widest">Powered by</span>
          <span className="font-medium text-foreground/70">Gemini</span>
          <span className="font-medium text-foreground/70">Claude</span>
          <span className="font-medium text-foreground/70">Vercel AI SDK</span>
        </div>

        {/* Product screenshot */}
        <div className="mt-16 md:mt-20">
          <div className="liquid-glass-adaptive overflow-hidden rounded-xl">
            <img
              src="/example.png"
              alt="Wirefraime workspace — Fitness tracker app with 4 screens generated by AI"
              className="w-full"
              loading="eager"
            />
          </div>
        </div>

        {/* Demo typing card */}
        <div className="mt-12 md:mt-16">
          <div className="liquid-glass-adaptive overflow-hidden rounded-xl">
            <div className="flex items-center justify-between border-b border-foreground/6 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="font-serif text-base text-foreground">
                  Try the generator
                </span>
                <span className="text-xs text-muted-foreground">
                  Free · No account needed
                </span>
              </div>
              <Badge
                variant="outline"
                className="gap-1.5 border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400"
              >
                <span className="sk inline-block size-1.5 rounded-full bg-green-500" />
                AI ready
              </Badge>
            </div>

            <div className="grid min-h-[200px] md:grid-cols-2">
              <div className="flex flex-col border-b border-foreground/6 p-5 md:border-b-0 md:border-r md:p-7">
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Describe your app
                </div>
                <div className="flex-1">
                  <span
                    ref={typingRef}
                    className="font-serif text-base italic leading-relaxed text-foreground/80"
                  />
                  <span className="ml-0.5 inline-block h-[1.1em] w-0.5 animate-[blink_1s_infinite] bg-primary align-text-bottom" />
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["SaaS", "Mobile", "E-commerce", "Dev Tool"].map((tag) => (
                    <span
                      key={tag}
                      className="liquid-glass-adaptive cursor-pointer rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 p-5 md:p-7">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Live preview
                </div>
                <div className="sk h-8 rounded-md bg-foreground/5" />
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className={`h-12 rounded-md bg-foreground/5 ${i % 3 === 0 ? "sk" : i % 3 === 1 ? "sk2" : "sk3"
                        }`}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <div className="sk3 h-2.5 flex-[0.6] rounded bg-foreground/5" />
                  <div className="sk h-2.5 flex-[0.4] rounded bg-foreground/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
