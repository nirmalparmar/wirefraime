"use client";

import { Fragment, type CSSProperties } from "react";
import Link from "next/link";
import { NavAuthActions } from "@/components/landing/nav-auth-actions";
import { PricingCard } from "@/components/landing/pricing-card";
import {
  CALENDAR,
  CHART,
  CHIPS,
  HOW_STEPS,
  NAV_LINKS,
  PRICING_TIERS,
  PROOF,
  TESTIMONIALS,
  TICKER,
} from "@/components/landing/home-data";

export function TickerStrip() {
  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {[...TICKER, ...TICKER].map((p, i) => (
          <div className="ticker-item" key={i}>
            <div
              className="ticker-avatar"
              style={{ background: `${p.color}33`, color: p.color }}
            >
              {p.initials}
            </div>
            <span className={`ticker-verb ${p.cls}`}>{p.verb}</span>
            <span className="ticker-text">
              <strong>{p.bold}</strong> · {p.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingNavbar() {
  return (
    <nav>
      <Link href="/" className="nav-logo flex items-center justify-center">
        <img src="/logo.svg" alt="" width={26} height={26} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }} />
        WireFraime
      </Link>
      <ul className="nav-links">
        {NAV_LINKS.map((l) => (
          <li key={l.label}>
            <Link href={l.href}>{l.label}</Link>
          </li>
        ))}
        <NavAuthActions variant="landing" />
      </ul>
    </nav>
  );
}

export function PromptHero({
  prompt,
  onPromptChange,
  onPromptSubmit,
}: {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onPromptSubmit: () => void;
}) {
  return (
    <section className="hero">
      <div className="hero-bg" />
      {/* <div className="hero-noise" /> */}

      <div className="hero-content">
        <div className="hero-eyebrow">
          <span className="eyebrow-badge">New</span>
          Full design-system generation, 10× faster
        </div>
        <h1>
          Describe your app.
          <br />
          Get{" "}
          <span className="word-select">
            every screen
            <b className="sel-h tl" aria-hidden="true" />
            <b className="sel-h tr" aria-hidden="true" />
            <b className="sel-h bl" aria-hidden="true" />
            <b className="sel-h br" aria-hidden="true" />
            <span className="sel-tag" aria-hidden="true">1440 × 900</span>
          </span>
          .
        </h1>
        <p className="hero-sub">
          One prompt becomes a complete design system and every screen of your
          product, editable on canvas, exportable as code.
        </p>

        <div className="prompt-box">
          <textarea
            className="prompt-textarea"
            placeholder="Describe the app you want to design…"
            rows={3}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onPromptSubmit();
              }
            }}
          />
          <div className="prompt-footer">
            <div className="prompt-chips">
              {CHIPS.map((c) => (
                <button
                  key={c.label}
                  className="p-chip"
                  type="button"
                  onClick={() => onPromptChange(c.prompt)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <button
              className="prompt-send"
              type="button"
              aria-label="Submit"
              onClick={onPromptSubmit}
            >
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="scroll-hint">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 5.5l4 4 4-4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
}

export function ProofBar() {
  return (
    <div className="proof-bar fade-up">
      {PROOF.map((s, i) => (
        <Fragment key={s.label}>
          {i > 0 && <div className="proof-div" />}
          <div className="proof-stat">
            <p className="proof-number">{s.number}</p>
            <p className="proof-label">{s.label}</p>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

export function GallerySection() {
  return (
    <section className="gallery-section" id="gallery">
      <div className="gallery-header fade-up">
        <div>
          <p className="section-label">Built with WireFraime</p>
          <h2 className="gallery-title">What builders are <em>creating</em></h2>
        </div>
        <p className="gallery-sub">
          Real apps shipped by real teams — from side projects to enterprise tools.
        </p>
      </div>

      <div className="gallery-grid">
        <article className="gallery-card fade-up d1">
          <div className="gallery-card-preview">
            <div className="mini-ui">
              <div className="mini-header">
                <div className="mini-header-dot" />
                <div className="mini-header-dot" />
                <div className="mini-header-dot" />
              </div>
              <div className="mini-layout">
                <div className="mini-sidebar">
                  <div className="mini-row" style={{ height: 7, background: "#dde6ff", borderRadius: 4 }} />
                  <div className="mini-row" style={{ height: 7, background: "#dde6ff", borderRadius: 4, width: "70%" }} />
                  <div className="mini-row" style={{ height: 7, background: "#dde6ff", borderRadius: 4, width: "80%" }} />
                  <div className="mini-row" style={{ height: 7, background: "#3366cc", borderRadius: 4 }} />
                  <div className="mini-row" style={{ height: 7, background: "#dde6ff", borderRadius: 4, width: "60%" }} />
                </div>
                <div className="mini-content">
                  <div style={{ fontSize: 7, color: "#333", fontWeight: 600, marginBottom: 4 }}>Pipeline Overview</div>
                  <div className="mini-card-row">
                    <div className="mini-card" />
                    <div className="mini-card" />
                    <div className="mini-card" />
                  </div>
                  <div className="mini-row sm" style={{ height: 6, marginTop: 8 }} />
                  <div className="mini-row xs" style={{ height: 6 }} />
                </div>
              </div>
            </div>
          </div>
          <div className="gallery-card-info">
            <p className="g-title">Sales CRM Dashboard</p>
            <div className="g-meta">
              <div className="g-avatar-sm" style={{ background: "#3366cc" }}>ZR</div>
              Zach · Building PicSEO
              <span className="g-tag">SaaS</span>
            </div>
          </div>
        </article>

        <article className="gallery-card fade-up d2">
          <div className="gallery-card-preview">
            <div className="mini-ui">
              <MiniBar />
              <div className="mini-body">
                <div style={{ fontSize: 7, color: "#333", fontWeight: 600 }}>Booking Calendar — June</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginTop: 4 }}>
                  {CALENDAR.map((bg, i) => (
                    <div key={i} style={{ height: 14, background: bg, borderRadius: 3 }} />
                  ))}
                </div>
                <div className="mini-row sm" style={{ height: 6, marginTop: 8, background: "#ffc9c9" }} />
              </div>
            </div>
          </div>
          <div className="gallery-card-info">
            <p className="g-title">Salon Booking System</p>
            <div className="g-meta">
              <div className="g-avatar-sm" style={{ background: "#e05050" }}>JM</div>
              Jesse · Freelancer
              <span className="g-tag">Service</span>
            </div>
          </div>
        </article>

        <article className="gallery-card fade-up d3">
          <div className="gallery-card-preview">
            <div className="mini-ui">
              <MiniBar />
              <div className="mini-body">
                <div style={{ fontSize: 7, color: "#333", fontWeight: 600, marginBottom: 6 }}>Revenue Analytics</div>
                <div className="mini-chart">
                  {CHART.map((b, i) => (
                    <div key={i} className="mini-bar-item" style={{ height: b.h, background: b.c }} />
                  ))}
                </div>
                <div className="mini-row sm" style={{ height: 6, background: "#b9f0ce" }} />
              </div>
            </div>
          </div>
          <div className="gallery-card-info">
            <p className="g-title">SaaS Analytics Platform</p>
            <div className="g-meta">
              <div className="g-avatar-sm" style={{ background: "#2e8b57" }}>CA</div>
              Carolina · Stratos
              <span className="g-tag">Analytics</span>
            </div>
          </div>
        </article>

        <article className="gallery-card fade-up d2">
          <div className="gallery-card-preview">
            <div className="mini-ui">
              <MiniBar />
              <div className="mini-body">
                <div style={{ fontSize: 7, color: "#333", fontWeight: 600, marginBottom: 6 }}>Sprint Board</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                  <div>
                    <div style={{ fontSize: 6, color: "#999", marginBottom: 3 }}>To Do</div>
                    <div style={{ height: 18, background: "#fde9a0", borderRadius: 4, marginBottom: 3 }} />
                    <div style={{ height: 18, background: "#fde9a0", borderRadius: 4 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 6, color: "#999", marginBottom: 3 }}>In Progress</div>
                    <div style={{ height: 18, background: "#fef0c0", borderRadius: 4, marginBottom: 3 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 6, color: "#999", marginBottom: 3 }}>Done</div>
                    <div style={{ height: 18, background: "#d0ffd8", borderRadius: 4, marginBottom: 3 }} />
                    <div style={{ height: 18, background: "#d0ffd8", borderRadius: 4 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="gallery-card-info">
            <p className="g-title">Agile Sprint Tracker</p>
            <div className="g-meta">
              <div className="g-avatar-sm" style={{ background: "#b07820" }}>AK</div>
              Aidan · Axiom
              <span className="g-tag">Productivity</span>
            </div>
          </div>
        </article>

        <article className="gallery-card fade-up d3">
          <div className="gallery-card-preview">
            <div className="mini-ui">
              <MiniBar />
              <div className="mini-body">
                <div style={{ fontSize: 7, color: "#333", fontWeight: 600, marginBottom: 5 }}>Customer Portal</div>
                {["#c2ffd0", "#ffd0d0", "#c2ffd0", "#d0dfff"].map((badge, i) => (
                  <div className="mini-table-row" key={i}>
                    <div className="mini-cell dark" />
                    <div className="mini-cell" />
                    <div className="mini-badge" style={{ background: badge }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="gallery-card-info">
            <p className="g-title">Client Portal + Invoicing</p>
            <div className="g-meta">
              <div className="g-avatar-sm" style={{ background: "#9055bb" }}>SK</div>
              Sarah · Freelancer
              <span className="g-tag">Finance</span>
            </div>
          </div>
        </article>

        <article className="gallery-card fade-up d4">
          <div className="gallery-card-preview">
            <div className="mini-ui">
              <MiniBar />
              <div className="mini-body">
                <div style={{ fontSize: 7, color: "#333", fontWeight: 600, marginBottom: 5 }}>Learning Dashboard</div>
                <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                  <div style={{ flex: 1, height: 28, background: "#b2e6fb", borderRadius: 5 }} />
                  <div style={{ flex: 1, height: 28, background: "#d0f0ff", borderRadius: 5 }} />
                </div>
                {["65%", "40%", "80%"].map((w, i) => (
                  <div key={i} style={{ height: 5, background: "#e0f5ff", borderRadius: 3, overflow: "hidden", marginBottom: i < 2 ? 3 : 0 }}>
                    <div style={{ height: "100%", width: w, background: "#3399cc", borderRadius: 3 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="gallery-card-info">
            <p className="g-title">E-learning Progress Tracker</p>
            <div className="g-meta">
              <div className="g-avatar-sm" style={{ background: "#2288aa" }}>TL</div>
              Tom · EduStart
              <span className="g-tag">EdTech</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export function CapabilitiesSection() {
  return (
    <section className="caps-section" id="features">
      <div className="caps-bg" />
      <div className="caps-inner">
        <p className="caps-label fade-up">What WireFraime does</p>
        <h2 className="caps-headline fade-up">One prompt. <em>Every screen.</em></h2>
        <p className="caps-intro fade-up">
          Describe what you want and WireFraime designs the whole product — a
          coherent design system and every screen, generated together so nothing
          looks bolted on. Refine it in chat, then take the code with you.
        </p>
        <div className="caps-grid">
          <div className="cap-item fade-up">
            <div className="cap-icon" style={{ background: "rgba(51,102,204,0.1)" }}>
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2.5" y="3.5" width="15" height="13" rx="2" stroke="#3366cc" strokeWidth="1.4" />
                <path d="M2.5 7.5h15" stroke="#3366cc" strokeWidth="1.4" />
                <path d="M7 10.5h6M7 13h4" stroke="#3366cc" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <p className="cap-title">Screens, not sketches</p>
            <p className="cap-desc">Dashboards, settings, onboarding, empty states — every screen rendered as real, responsive UI. Not boxes and arrows.</p>
          </div>
          <div className="cap-item fade-up d1">
            <div className="cap-icon" style={{ background: "rgba(144,85,187,0.1)" }}>
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="14" height="4" rx="1.5" stroke="#9055bb" strokeWidth="1.4" />
                <rect x="3" y="10" width="9" height="4" rx="1.5" stroke="#9055bb" strokeWidth="1.4" />
                <path d="M3 17h5" stroke="#9055bb" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <p className="cap-title">A real design system</p>
            <p className="cap-desc">Color, type, spacing, and components derived from your description — and applied consistently across everything it draws.</p>
          </div>
          <div className="cap-item fade-up d2">
            <div className="cap-icon" style={{ background: "rgba(46,139,87,0.1)" }}>
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4h12a1 1 0 011 1v7a1 1 0 01-1 1H9.5L6 16v-3H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="#2e8b57" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M6.5 7.5h7M6.5 10h4" stroke="#2e8b57" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <p className="cap-title">Edit by conversation</p>
            <p className="cap-desc">Click any element and say what should change. WireFraime rewrites the design in place — no layers panel to learn.</p>
          </div>
          <div className="cap-item fade-up d3">
            <div className="cap-icon" style={{ background: "rgba(200,140,60,0.12)" }}>
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 4l-4 6 4 6M13 4l4 6-4 6" stroke="#c8862c" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="cap-title">Code you own</p>
            <p className="cap-desc">Export any screen as clean HTML and Tailwind, or a full Next.js project. Readable, componentized, and yours to extend.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProcessSection() {
  return (
    <section className="how-section" id="how-it-works">
      <p className="section-label fade-up">Process</p>
      <h2 className="section-h2 fade-up">
        From prompt to product design
        <br />
        in under <em>five minutes</em>
      </h2>
      <div className="how-steps">
        {HOW_STEPS.map((s, i) => (
          <div className={`how-step fade-up d${i + 1}`} key={s.n}>
            <p className="how-num">{s.n}</p>
            <p className="how-title">{s.title}</p>
            <p className="how-desc">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PricingSection() {
  return (
    <section className="pricing-section" id="pricing">
      <p className="section-label fade-up">Pricing</p>
      <h2 className="section-h2 fade-up">Simple, <em>honest</em> pricing</h2>
      <p className="pricing-intro fade-up">
        One AI UI designer, two plans. Switch or cancel any time.
      </p>
      <div className="pricing-grid">
        {PRICING_TIERS.map((tier, i) => (
          <PricingCard key={tier.name} tier={tier} className={`fade-up d${i + 1}`} />
        ))}
      </div>
      <p className="price-note fade-up">
        Secure checkout by Dodo Payments · no setup fees · cancel any time.
      </p>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section className="testi-section">
      <div className="testi-inner">
        <p className="section-label fade-up">What people say</p>
        <h2 className="section-h2 fade-up">Builders <em>love</em> it</h2>
        <div className="testi-grid">
          {TESTIMONIALS.map((t, i) => (
            <div className={`testi-card fade-up d${i + 1}`} key={t.name}>
              <p className="testi-text">{t.text}</p>
              <div className="testi-author">
                <div className="testi-av" style={{ background: t.color }}>{t.av}</div>
                <div>
                  <p className="testi-name">{t.name}</p>
                  <p className="testi-handle">{t.handle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FooterCtaSection() {
  return (
    <section className="footer-cta">
      <div className="footer-cta-bg" />
      <div className="footer-cta-inner fade-up">
        <h2>
          Your app starts
          <br />
          <em>right here</em>
        </h2>
        <p>Describe what you want to build. WireFraime designs every screen.</p>
        <div className="cta-row">
          <Link href="/sign-up" className="cta-btn-main">Start building free</Link>
          <Link href="/#pricing" className="cta-btn-ghost">View pricing</Link>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer>
      <Link href="/" className="footer-logo">WireFraime</Link>
      <ul className="footer-links">
        <li><Link href="/privacy">Privacy</Link></li>
        <li><Link href="/terms">Terms</Link></li>
        <li><Link href="/#features">Status</Link></li>
        <li><a href="https://twitter.com" target="_blank" rel="noreferrer">Twitter</a></li>
      </ul>
      <p className="footer-copy">© 2026 WireFraime, Inc.</p>
    </footer>
  );
}

function MiniBar() {
  const dot = (background: string): CSSProperties => ({ background });
  return (
    <div className="mini-bar">
      <div className="mini-dot" style={dot("#f09595")} />
      <div className="mini-dot" style={dot("#f0c060")} />
      <div className="mini-dot" style={dot("#80c080")} />
    </div>
  );
}
