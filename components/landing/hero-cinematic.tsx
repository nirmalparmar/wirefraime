"use client";

import { useRef, useCallback, useEffect } from "react";
import { Globe, ArrowRight } from "lucide-react";

function IconInstagram({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconX({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l6.5 8L4 20h2l5.5-6.8L16 20h4l-6.8-8.4L20 4h-2l-5.2 6.4L8 4H4z" />
    </svg>
  );
}

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4";
const FADE_MS = 500;
const FADE_OUT_OFFSET = 0.55;

export function HeroCinematic() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const fadingOutRef = useRef(false);

  /* ── Fade helpers ── */

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

  /* ── Event handlers ── */

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

  useEffect(() => {
    return () => cancelFade();
  }, [cancelFade]);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex flex-col">
      {/* ── Background video ── */}
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
        className="absolute inset-0 w-full h-full object-cover translate-y-[17%] opacity-0"
      />

      {/* ── Navigation ── */}
      <nav className="relative z-20 pl-6 pr-6 py-6">
        <div className="liquid-glass rounded-full px-6 py-3 flex items-center justify-between max-w-5xl mx-auto">
          {/* Left: Logo + links */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Globe size={24} className="text-white" />
              <span className="text-white font-semibold text-lg">Asme</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#" className="text-white/80 hover:text-white transition-colors text-sm font-medium">Features</a>
              <a href="#" className="text-white/80 hover:text-white transition-colors text-sm font-medium">Pricing</a>
              <a href="#" className="text-white/80 hover:text-white transition-colors text-sm font-medium">About</a>
            </div>
          </div>

          {/* Right: Buttons */}
          <div className="flex items-center gap-4">
            <button className="text-white text-sm font-medium">Sign Up</button>
            <button className="liquid-glass rounded-full px-6 py-2 text-white text-sm font-medium">
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero content ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center -translate-y-[20%]">
        <h1 className="font-instrument text-5xl md:text-6xl lg:text-7xl text-white mb-8 tracking-tight whitespace-nowrap">
          Built for the curious
        </h1>

        <div className="max-w-xl w-full space-y-4">
          {/* Email input bar */}
          <div className="liquid-glass rounded-full pl-6 pr-2 py-2 flex items-center gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 bg-transparent text-white placeholder:text-white/40 text-base outline-none border-none"
            />
            <button className="bg-white rounded-full p-3 text-black shrink-0 hover:bg-white/90 transition-colors">
              <ArrowRight size={20} />
            </button>
          </div>

          {/* Subtitle */}
          <p className="text-white text-sm leading-relaxed px-4">
            Stay updated with the latest news and insights. Subscribe to our
            newsletter today and never miss out on exciting updates.
          </p>

          {/* Manifesto button */}
          <div className="flex justify-center">
            <button className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/5 transition-colors">
              Manifesto
            </button>
          </div>
        </div>
      </div>

      {/* ── Social icons footer ── */}
      <div className="relative z-10 flex justify-center gap-4 pb-12">
        <a
          href="#"
          aria-label="Instagram"
          className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all"
        >
          <IconInstagram size={20} />
        </a>
        <a
          href="#"
          aria-label="Twitter"
          className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all"
        >
          <IconX size={20} />
        </a>
        <a
          href="#"
          aria-label="Website"
          className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all"
        >
          <Globe size={20} />
        </a>
      </div>
    </div>
  );
}
