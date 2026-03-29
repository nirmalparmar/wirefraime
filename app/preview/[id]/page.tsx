"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import type { WireframeApp, Platform } from "@/lib/types";
import { SERIF, SANS, VIEWPORTS } from "@/lib/constants";

function getViewport(platform: Platform) {
  return VIEWPORTS[platform] ?? VIEWPORTS.web;
}

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<WireframeApp | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedScreen, setExpandedScreen] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setApp(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleClose = useCallback(() => setExpandedScreen(null), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground" style={{ fontFamily: SANS }}>
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-border border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground" style={{ fontFamily: SANS }}>
        <div className="text-center">
          <h1 className="text-[28px] mb-2" style={{ fontFamily: SERIF }}>Not Found</h1>
          <p className="text-muted-foreground text-[15px]">
            This preview link may have expired or doesn&apos;t exist.
          </p>
          <a
            href="/"
            className="inline-block mt-6 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg no-underline text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ fontFamily: SANS }}
          >
            Go to Wirefraime
          </a>
        </div>
      </div>
    );
  }

  const viewport = getViewport(app.platform);
  const screensWithHtml = app.screens.filter((s) => s.html);
  const CARD_WIDTH = 400;
  const scale = CARD_WIDTH / viewport.w;
  const cardHeight = viewport.h * scale;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background/95 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-[1320px] mx-auto py-5 px-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-[26px] font-semibold tracking-tight m-0 leading-tight"
              style={{ fontFamily: SERIF, letterSpacing: "-0.02em" }}
            >
              {app.name}
            </h1>
            {app.description && (
              <p
                className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-[600px]"
                style={{ fontFamily: SANS }}
              >
                {app.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 text-[13px]" style={{ fontFamily: SANS }}>
            <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border capitalize">
              {app.platform}
            </span>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/25">
              {screensWithHtml.length} screen{screensWithHtml.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </header>

      {/* Screen Grid */}
      <main className="max-w-[1320px] mx-auto px-6 pt-10 pb-20">
        {screensWithHtml.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-[15px]" style={{ fontFamily: SANS }}>
            No screens to display.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fill, minmax(${Math.min(CARD_WIDTH, 340)}px, 1fr))`,
              gap: 28,
            }}
          >
            {screensWithHtml.map((screen) => (
              <div
                key={screen.id}
                onClick={() => setExpandedScreen(screen.id)}
                className="cursor-pointer group"
              >
                {/* Screen Label */}
                <div
                  className="text-[13px] font-medium text-foreground mb-2.5 flex items-center gap-2"
                  style={{ fontFamily: SANS }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {screen.name}
                </div>

                {/* Card */}
                <div className="rounded-xl border border-border overflow-hidden bg-card transition-all duration-200 shadow-sm group-hover:shadow-lg group-hover:-translate-y-0.5">
                  <div
                    style={{
                      width: "100%",
                      height: cardHeight,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <iframe
                      srcDoc={screen.html}
                      sandbox="allow-scripts"
                      style={{
                        width: viewport.w,
                        height: viewport.h,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        border: "none",
                        pointerEvents: "none",
                        display: "block",
                      }}
                      title={screen.name}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-[13px] text-muted-foreground" style={{ fontFamily: SANS }}>
        Built with{" "}
        <a href="/" className="text-primary no-underline font-medium hover:underline">
          Wirefraime
        </a>
      </footer>

      {/* Fullscreen Modal */}
      {expandedScreen && (
        <div
          onClick={handleClose}
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-[95vw] max-h-[92vh] overflow-auto rounded-2xl bg-card border border-border shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="sticky top-3 float-right mr-3 mt-3 z-10 w-9 h-9 rounded-full border border-border bg-background text-foreground cursor-pointer flex items-center justify-center text-lg leading-none shadow-md hover:bg-accent transition-colors"
              style={{ fontFamily: SANS }}
              aria-label="Close"
            >
              &times;
            </button>

            {/* Modal Label */}
            <div
              className="px-5 pt-4 pb-3 text-sm font-medium text-foreground border-b border-border"
              style={{ fontFamily: SANS }}
            >
              {screensWithHtml.find((s) => s.id === expandedScreen)?.name}
            </div>

            {/* Iframe */}
            <div style={{ overflow: "auto" }}>
              <iframe
                srcDoc={
                  screensWithHtml.find((s) => s.id === expandedScreen)?.html ?? ""
                }
                sandbox="allow-scripts"
                style={{
                  width: viewport.w,
                  height: viewport.h,
                  border: "none",
                  display: "block",
                }}
                title={
                  screensWithHtml.find((s) => s.id === expandedScreen)?.name ?? "Screen"
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
