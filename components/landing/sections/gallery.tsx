import type { CSSProperties } from "react";
import { CALENDAR, CHART } from "@/components/landing/home-data";
import { Eyebrow, SectionHeading } from "./section-heading";

const cardClass =
  "group fade-up overflow-hidden rounded-[20px] border border-border bg-card transition-[border-color,box-shadow] duration-200 hover:border-ring hover:shadow-[var(--wf-shadow-soft)]";
const previewClass = "h-[190px] relative overflow-hidden";
const miniUiClass =
  "absolute inset-3 rounded-[12px] bg-card border border-border overflow-hidden flex flex-col transition-transform duration-300 group-hover:-translate-y-0.5";
const infoClass = "p-4 border-t border-border";
const titleClass = "text-[14px] font-medium text-foreground mb-1";
const metaClass = "text-[12px] text-muted-foreground flex items-center gap-1.5";
const tagClass = "bg-muted rounded-full py-[2px] px-[10px] text-[11px] text-muted-foreground ml-auto";

// Two flat preview backgrounds: soft tint and soft gray, alternating
const WASH_TINT = "bg-muted";
const WASH_GRAY = "bg-secondary";

export function GallerySection() {
  return (
    <section className="mx-auto max-w-[1080px] px-6 py-20 md:px-10 md:py-28" id="gallery">
      <div className="mb-12">
        <SectionHeading eyebrow={<Eyebrow tone="amber">Examples</Eyebrow>} title="Start with the product you need" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Card 1 — CRM */}
        <article className={`${cardClass} d1`}>
          <div className={`${previewClass} ${WASH_TINT}`}>
            <div className={miniUiClass}>
              <div className="flex h-8 items-center gap-1.5 bg-[#37322f] px-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-white/50" />
                <div className="h-1.5 w-1.5 rounded-full bg-white/50" />
                <div className="h-1.5 w-1.5 rounded-full bg-white/50" />
              </div>
              <div className="flex flex-1 overflow-hidden">
                <div className="flex w-[70px] flex-col gap-[5px] border-r border-[#f0f1f5] bg-[#fafbfc] p-2">
                  <div style={{ height: 7, background: "#ece4da", borderRadius: 4 }} />
                  <div style={{ height: 7, background: "#ece4da", borderRadius: 4, width: "70%" }} />
                  <div style={{ height: 7, background: "#ece4da", borderRadius: 4, width: "80%" }} />
                  <div style={{ height: 7, background: "#37322f", borderRadius: 4 }} />
                  <div style={{ height: 7, background: "#ece4da", borderRadius: 4, width: "60%" }} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                  <div style={{ fontSize: 7, color: "#333", fontWeight: 600, marginBottom: 4 }}>Pipeline Overview</div>
                  <div className="mt-1 flex gap-1.5">
                    <div className="h-[42px] flex-1 rounded-[6px] border border-[#f0f1f5] bg-[#f6f7fa]" />
                    <div className="h-[42px] flex-1 rounded-[6px] border border-[#f0f1f5] bg-[#f6f7fa]" />
                    <div className="h-[42px] flex-1 rounded-[6px] border border-[#f0f1f5] bg-[#f6f7fa]" />
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: "#f0f1f5", width: "60%", marginTop: 8 }} />
                  <div style={{ height: 6, borderRadius: 4, background: "#f0f1f5", width: "40%" }} />
                </div>
              </div>
            </div>
          </div>
          <div className={infoClass}>
            <p className={titleClass}>Sales CRM Dashboard</p>
            <div className={metaClass}>
              Pipeline, contacts, reporting
              <span className={tagClass}>SaaS</span>
            </div>
          </div>
        </article>

        {/* Card 2 — Salon */}
        <article className={`${cardClass} d2`}>
          <div className={`${previewClass} ${WASH_GRAY}`}>
            <div className={miniUiClass}>
              <MiniBar />
              <div className="flex flex-1 flex-col gap-[7px] overflow-hidden p-2.5">
                <div style={{ fontSize: 7, color: "#333", fontWeight: 600 }}>Booking Calendar — June</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginTop: 4 }}>
                  {CALENDAR.map((bg, i) => (
                    <div key={i} style={{ height: 14, background: bg, borderRadius: 3 }} />
                  ))}
                </div>
                <div style={{ height: 6, borderRadius: 4, background: "#ded5ca", width: "60%", marginTop: 8 }} />
              </div>
            </div>
          </div>
          <div className={infoClass}>
            <p className={titleClass}>Salon Booking System</p>
            <div className={metaClass}>
              Calendar, customers, payments
              <span className={tagClass}>Service</span>
            </div>
          </div>
        </article>

        {/* Card 3 — Analytics */}
        <article className={`${cardClass} d3`}>
          <div className={`${previewClass} ${WASH_TINT}`}>
            <div className={miniUiClass}>
              <MiniBar />
              <div className="flex flex-1 flex-col gap-[7px] overflow-hidden p-2.5">
                <div style={{ fontSize: 7, color: "#333", fontWeight: 600, marginBottom: 6 }}>Revenue Analytics</div>
                <div className="flex h-[50px] items-end gap-[5px] px-2 py-1.5">
                  {CHART.map((b, i) => (
                    <div key={i} className="flex-1 rounded-t-[3px]" style={{ height: b.h, background: b.c }} />
                  ))}
                </div>
                <div style={{ height: 6, borderRadius: 4, background: "#ded5ca", width: "60%" }} />
              </div>
            </div>
          </div>
          <div className={infoClass}>
            <p className={titleClass}>SaaS Analytics Platform</p>
            <div className={metaClass}>
              Metrics, reports, alerts
              <span className={tagClass}>Analytics</span>
            </div>
          </div>
        </article>

        {/* Card 4 — Sprint */}
        <article className={`${cardClass} d1`}>
          <div className={`${previewClass} ${WASH_GRAY}`}>
            <div className={miniUiClass}>
              <MiniBar />
              <div className="flex flex-1 flex-col gap-[7px] overflow-hidden p-2.5">
                <div style={{ fontSize: 7, color: "#333", fontWeight: 600, marginBottom: 6 }}>Sprint Board</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                  <div>
                    <div style={{ fontSize: 6, color: "#999", marginBottom: 3 }}>To Do</div>
                    <div style={{ height: 18, background: "#ece4da", borderRadius: 4, marginBottom: 3 }} />
                    <div style={{ height: 18, background: "#ece4da", borderRadius: 4 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 6, color: "#999", marginBottom: 3 }}>In Progress</div>
                    <div style={{ height: 18, background: "#ded5ca", borderRadius: 4 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 6, color: "#999", marginBottom: 3 }}>Done</div>
                    <div style={{ height: 18, background: "#37322f", borderRadius: 4, marginBottom: 3 }} />
                    <div style={{ height: 18, background: "#37322f", borderRadius: 4 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={infoClass}>
            <p className={titleClass}>Agile Sprint Tracker</p>
            <div className={metaClass}>
              Backlog, sprints, progress
              <span className={tagClass}>Productivity</span>
            </div>
          </div>
        </article>

        {/* Card 5 — Portal */}
        <article className={`${cardClass} d2`}>
          <div className={`${previewClass} ${WASH_TINT}`}>
            <div className={miniUiClass}>
              <MiniBar />
              <div className="flex flex-1 flex-col gap-[7px] overflow-hidden p-2.5">
                <div style={{ fontSize: 7, color: "#333", fontWeight: 600, marginBottom: 5 }}>Customer Portal</div>
                {["#ded5ca", "#37322f", "#ded5ca", "#ece4da"].map((badge, i) => (
                  <div key={i} className="flex items-center gap-1.5 border-b border-[#f2f3f6] py-1">
                    <div className="h-1.5 flex-1 rounded-[3px] bg-[#dfe2e8]" />
                    <div className="h-1.5 flex-1 rounded-[3px] bg-[#edeff3]" />
                    <div className="h-3 w-7 shrink-0 rounded-[6px]" style={{ background: badge }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={infoClass}>
            <p className={titleClass}>Client Portal + Invoicing</p>
            <div className={metaClass}>
              Requests, files, approvals
              <span className={tagClass}>Finance</span>
            </div>
          </div>
        </article>

        {/* Card 6 — EduTrack */}
        <article className={`${cardClass} d3`}>
          <div className={`${previewClass} ${WASH_GRAY}`}>
            <div className={miniUiClass}>
              <MiniBar />
              <div className="flex flex-1 flex-col gap-[7px] overflow-hidden p-2.5">
                <div style={{ fontSize: 7, color: "#333", fontWeight: 600, marginBottom: 5 }}>Learning Dashboard</div>
                <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                  <div style={{ flex: 1, height: 28, background: "#ded5ca", borderRadius: 5 }} />
                  <div style={{ flex: 1, height: 28, background: "#f1ece4", borderRadius: 5 }} />
                </div>
                {["65%", "40%", "80%"].map((w, i) => (
                  <div key={i} style={{ height: 5, background: "#f1ece4", borderRadius: 3, overflow: "hidden", marginBottom: i < 2 ? 3 : 0 }}>
                    <div style={{ height: "100%", width: w, background: "#37322f", borderRadius: 3 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={infoClass}>
            <p className={titleClass}>E-learning Progress Tracker</p>
            <div className={metaClass}>
              Courses, progress, insights
              <span className={tagClass}>EdTech</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function MiniBar() {
  const dot = (background: string): CSSProperties => ({ background });
  return (
    <div className="flex h-7 items-center gap-[5px] border-b border-[#f0f1f5] bg-[#fafbfc] px-2.5">
      <div className="h-[7px] w-[7px] rounded-full" style={dot("#dfe2e8")} />
      <div className="h-[7px] w-[7px] rounded-full" style={dot("#dfe2e8")} />
      <div className="h-[7px] w-[7px] rounded-full" style={dot("#dfe2e8")} />
    </div>
  );
}
