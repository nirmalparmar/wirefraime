"use client";

import { useRef } from "react";
import { SectionHeading } from "./section-heading";

const SHOWCASES = [
  {
    name: "Fitness Tracker",
    platform: "Mobile",
    screens: 6,
    palette: ["#FF6B35", "#1A1A2E", "#F5F5F5"],
    layout: "mobile",
    sections: [
      { type: "nav", h: 44 },
      { type: "hero", h: 140 },
      { type: "stats", cols: 3, h: 56 },
      { type: "list", rows: 3, h: 48 },
      { type: "tab-bar", h: 48 },
    ],
  },
  {
    name: "SaaS Dashboard",
    platform: "Web",
    screens: 8,
    palette: ["#6366F1", "#F8FAFC", "#0F172A"],
    layout: "web",
    sections: [
      { type: "sidebar", w: 52 },
      { type: "header", h: 48 },
      { type: "stats", cols: 4, h: 72 },
      { type: "chart", h: 160 },
      { type: "table", rows: 4, h: 36 },
    ],
  },
  {
    name: "Food Delivery",
    platform: "Mobile",
    screens: 7,
    palette: ["#EF4444", "#FEF2F2", "#1C1917"],
    layout: "mobile",
    sections: [
      { type: "nav", h: 44 },
      { type: "search", h: 40 },
      { type: "chips", h: 32 },
      { type: "grid", cols: 2, rows: 2, h: 96 },
      { type: "tab-bar", h: 48 },
    ],
  },
  {
    name: "Project Manager",
    platform: "Web",
    screens: 10,
    palette: ["#8B5CF6", "#FAF5FF", "#1E1B4B"],
    layout: "web",
    sections: [
      { type: "sidebar", w: 52 },
      { type: "header", h: 48 },
      { type: "board", cols: 3, h: 200 },
    ],
  },
  {
    name: "Banking App",
    platform: "Mobile",
    screens: 9,
    palette: ["#059669", "#ECFDF5", "#064E3B"],
    layout: "mobile",
    sections: [
      { type: "nav", h: 44 },
      { type: "hero", h: 120 },
      { type: "actions", cols: 4, h: 56 },
      { type: "list", rows: 4, h: 52 },
    ],
  },
  {
    name: "E-commerce",
    platform: "Web",
    screens: 12,
    palette: ["#D97706", "#FFFBEB", "#1C1917"],
    layout: "web",
    sections: [
      { type: "header", h: 48 },
      { type: "hero", h: 180 },
      { type: "grid", cols: 4, rows: 2, h: 120 },
    ],
  },
];

/* Mini wireframe renderer */
function MiniWireframe({ item }: { item: typeof SHOWCASES[number] }) {
  const isMobile = item.layout === "mobile";
  const accent = item.palette[0];
  const bg = item.palette[1];
  const fg = item.palette[2];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: isMobile ? 180 : 320,
        height: isMobile ? 320 : 220,
        background: bg,
        borderRadius: isMobile ? 20 : 10,
        border: `1px solid color-mix(in srgb, ${fg} 8%, transparent)`,
      }}
    >
      {isMobile && item.sections.map((sec, i) => {
        if (sec.type === "nav") return (
          <div key={i} style={{ height: sec.h, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ width: 60, height: 8, borderRadius: 4, background: fg, opacity: 0.12 }} />
            <div style={{ width: 20, height: 20, borderRadius: 10, background: accent, opacity: 0.2 }} />
          </div>
        );
        if (sec.type === "hero") return (
          <div key={i} style={{ height: sec.h, margin: "0 14px", borderRadius: 12, background: accent, opacity: 0.1 }} />
        );
        if (sec.type === "search") return (
          <div key={i} style={{ height: sec.h, margin: "8px 14px 0", borderRadius: 8, background: fg, opacity: 0.06, border: `1px solid color-mix(in srgb, ${fg} 8%, transparent)` }} />
        );
        if (sec.type === "chips") return (
          <div key={i} style={{ display: "flex", gap: 6, padding: "8px 14px 0" }}>
            {[40, 52, 36, 44].map((w, j) => (
              <div key={j} style={{ width: w, height: 22, borderRadius: 11, background: j === 0 ? accent : fg, opacity: j === 0 ? 0.15 : 0.06 }} />
            ))}
          </div>
        );
        if (sec.type === "stats") return (
          <div key={i} style={{ display: "flex", gap: 8, padding: "10px 14px 0" }}>
            {Array.from({ length: sec.cols ?? 3 }).map((_, j) => (
              <div key={j} style={{ flex: 1, height: sec.h, borderRadius: 10, background: fg, opacity: 0.05, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <div style={{ width: 20, height: 6, borderRadius: 3, background: j === 0 ? accent : fg, opacity: 0.2 }} />
                <div style={{ width: 30, height: 4, borderRadius: 2, background: fg, opacity: 0.08 }} />
              </div>
            ))}
          </div>
        );
        if (sec.type === "actions") return (
          <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px 0", justifyContent: "center" }}>
            {Array.from({ length: sec.cols ?? 4 }).map((_, j) => (
              <div key={j} style={{ width: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: accent, opacity: 0.12 }} />
                <div style={{ width: 28, height: 4, borderRadius: 2, background: fg, opacity: 0.08 }} />
              </div>
            ))}
          </div>
        );
        if (sec.type === "list") return (
          <div key={i} style={{ padding: "10px 14px 0", display: "flex", flexDirection: "column", gap: 6 }}>
            {Array.from({ length: sec.rows ?? 3 }).map((_, j) => (
              <div key={j} style={{ height: sec.h ? sec.h - 10 : 38, borderRadius: 8, background: fg, opacity: 0.04, display: "flex", alignItems: "center", padding: "0 10px", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: accent, opacity: 0.12, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: "60%", height: 5, borderRadius: 3, background: fg, opacity: 0.1, marginBottom: 4 }} />
                  <div style={{ width: "40%", height: 4, borderRadius: 2, background: fg, opacity: 0.06 }} />
                </div>
              </div>
            ))}
          </div>
        );
        if (sec.type === "grid") return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: `repeat(${sec.cols ?? 2}, 1fr)`, gap: 8, padding: "10px 14px 0" }}>
            {Array.from({ length: (sec.cols ?? 2) * (sec.rows ?? 2) }).map((_, j) => (
              <div key={j} style={{ height: sec.h ? sec.h / (sec.rows ?? 2) - 4 : 40, borderRadius: 8, background: fg, opacity: 0.05 }}>
                <div style={{ width: "100%", height: "60%", borderRadius: "8px 8px 0 0", background: accent, opacity: 0.08 }} />
              </div>
            ))}
          </div>
        );
        if (sec.type === "tab-bar") return (
          <div key={i} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: sec.h, borderTop: `1px solid color-mix(in srgb, ${fg} 6%, transparent)`, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 20px" }}>
            {[1, 2, 3, 4].map((_, j) => (
              <div key={j} style={{ width: 20, height: 20, borderRadius: 6, background: j === 0 ? accent : fg, opacity: j === 0 ? 0.2 : 0.06 }} />
            ))}
          </div>
        );
        return null;
      })}

      {!isMobile && (
        <div style={{ display: "flex", height: "100%" }}>
          {item.sections.find(s => s.type === "sidebar") && (
            <div style={{ width: 52, borderRight: `1px solid color-mix(in srgb, ${fg} 6%, transparent)`, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: accent, opacity: 0.15 }} />
              <div style={{ width: 1, height: 8, background: fg, opacity: 0.06 }} />
              {[1, 2, 3, 4].map(j => (
                <div key={j} style={{ width: 24, height: 24, borderRadius: 6, background: fg, opacity: j === 1 ? 0.1 : 0.04 }} />
              ))}
            </div>
          )}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {item.sections.filter(s => s.type !== "sidebar").map((sec, i) => {
              if (sec.type === "header") return (
                <div key={i} style={{ height: sec.h, borderBottom: `1px solid color-mix(in srgb, ${fg} 6%, transparent)`, display: "flex", alignItems: "center", padding: "0 16px", justifyContent: "space-between" }}>
                  <div style={{ width: 80, height: 6, borderRadius: 3, background: fg, opacity: 0.1 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ width: 56, height: 24, borderRadius: 6, background: accent, opacity: 0.15 }} />
                    <div style={{ width: 24, height: 24, borderRadius: 12, background: fg, opacity: 0.08 }} />
                  </div>
                </div>
              );
              if (sec.type === "stats") return (
                <div key={i} style={{ display: "flex", gap: 10, padding: "12px 16px 0" }}>
                  {Array.from({ length: sec.cols ?? 4 }).map((_, j) => (
                    <div key={j} style={{ flex: 1, height: sec.h, borderRadius: 8, background: fg, opacity: 0.04, padding: "12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                      <div style={{ width: "40%", height: 4, borderRadius: 2, background: fg, opacity: 0.08 }} />
                      <div style={{ width: "60%", height: 8, borderRadius: 4, background: j === 0 ? accent : fg, opacity: j === 0 ? 0.2 : 0.12 }} />
                    </div>
                  ))}
                </div>
              );
              if (sec.type === "chart") return (
                <div key={i} style={{ height: sec.h, margin: "10px 16px 0", borderRadius: 8, background: fg, opacity: 0.03, display: "flex", alignItems: "flex-end", padding: "0 20px 16px", gap: 8 }}>
                  {[40, 65, 45, 80, 55, 70, 50, 85, 60].map((h, j) => (
                    <div key={j} style={{ flex: 1, height: `${h}%`, borderRadius: "4px 4px 0 0", background: accent, opacity: 0.12 + j * 0.01 }} />
                  ))}
                </div>
              );
              if (sec.type === "table") return (
                <div key={i} style={{ margin: "10px 16px 0", display: "flex", flexDirection: "column" }}>
                  {Array.from({ length: sec.rows ?? 4 }).map((_, j) => (
                    <div key={j} style={{ height: sec.h, borderBottom: `1px solid color-mix(in srgb, ${fg} 4%, transparent)`, display: "flex", alignItems: "center", gap: 12, padding: "0 8px" }}>
                      <div style={{ width: "25%", height: 5, borderRadius: 3, background: fg, opacity: j === 0 ? 0.1 : 0.06 }} />
                      <div style={{ width: "20%", height: 5, borderRadius: 3, background: fg, opacity: 0.05 }} />
                      <div style={{ flex: 1 }} />
                      <div style={{ width: 40, height: 5, borderRadius: 3, background: accent, opacity: 0.12 }} />
                    </div>
                  ))}
                </div>
              );
              if (sec.type === "board") return (
                <div key={i} style={{ display: "flex", gap: 10, padding: "12px 16px", flex: 1 }}>
                  {Array.from({ length: sec.cols ?? 3 }).map((_, j) => (
                    <div key={j} style={{ flex: 1, borderRadius: 8, background: fg, opacity: 0.03, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ width: "50%", height: 5, borderRadius: 3, background: fg, opacity: 0.1, marginBottom: 4 }} />
                      {[1, 2, 3].map(k => (
                        <div key={k} style={{ height: 40, borderRadius: 6, background: j === 1 && k === 1 ? accent : fg, opacity: j === 1 && k === 1 ? 0.08 : 0.04 }} />
                      ))}
                    </div>
                  ))}
                </div>
              );
              if (sec.type === "hero") return (
                <div key={i} style={{ height: sec.h, margin: "12px 16px 0", borderRadius: 10, background: accent, opacity: 0.06 }} />
              );
              if (sec.type === "grid") return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: `repeat(${sec.cols ?? 4}, 1fr)`, gap: 10, padding: "12px 16px" }}>
                  {Array.from({ length: (sec.cols ?? 4) * (sec.rows ?? 2) }).map((_, j) => (
                    <div key={j} style={{ height: sec.h ? sec.h / (sec.rows ?? 2) - 5 : 50, borderRadius: 8, background: fg, opacity: 0.04, overflow: "hidden" }}>
                      <div style={{ width: "100%", height: "55%", background: accent, opacity: 0.08 }} />
                    </div>
                  ))}
                </div>
              );
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function Showcase() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-5 md:px-12">
        <div className="reveal mb-12 md:mb-16">
          <SectionHeading
            badge="Showcase"
            title={
              <>
                From prompt to <em className="text-primary">production-ready</em> designs.
              </>
            }
            description="Real examples generated by Wirefraime in under 60 seconds. Every screen, every flow, every component."
          />
        </div>
      </div>

      {/* Horizontal scroll strip */}
      <div
        ref={scrollRef}
        className="reveal scrollbar-none flex gap-5 overflow-x-auto px-[max(1.25rem,calc((100vw-64rem)/2+1.25rem))] pb-4 md:gap-6"
      >
        {SHOWCASES.map((item) => (
          <div
            key={item.name}
            className="group flex shrink-0 flex-col"
          >
            {/* Card */}
            <div className="liquid-glass-adaptive overflow-hidden rounded-2xl p-4 transition-all hover:bg-foreground/[0.03] md:p-5">
              <MiniWireframe item={item} />
            </div>

            {/* Label */}
            <div className="mt-3.5 flex items-center justify-between px-1">
              <div>
                <div className="text-sm font-semibold text-foreground">{item.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{item.screens} screens</div>
              </div>
              <span className="liquid-glass-adaptive rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {item.platform}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
