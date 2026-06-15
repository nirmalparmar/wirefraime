# React Stack — Vite + Tailwind + shadcn

Read this when the brief calls for a real React project (see the output-format
decision in SKILL.md) rather than a single HTML file. If the user points you at an
**existing** repo, ignore the scaffolding here — match their stack, tokens, and
conventions instead, and just bring the section recipes, motion primitives, and
effects.

## Stack

The proven, current setup the source projects use:

- **React 18/19 + Vite** (`@vitejs/plugin-react-swc`) — fast, simple.
- **Tailwind** for styling. Tailwind **v4** uses a CSS-first config (`@theme` block
  in your CSS, no `tailwind.config.js`); **v3** uses `tailwind.config.ts`. Detect
  which the project uses; default to v4 for greenfield.
- **shadcn/ui** for primitives (Button, Card, Accordion, Dialog, Tabs…). Don't
  hand-roll what shadcn already gives you. Use the `shadcn` skill / CLI to add
  components. Style: `new-york`, icon library: `lucide-react`.
- **lucide-react** icons, **sonner** toasts, **embla** for any carousel.
- Motion: default to the IntersectionObserver + CSS primitives from
  `references/motion.md`. Add **framer-motion** only when you need spring physics or
  exit animations.
- `react-router-dom` (or TanStack Router) only if the site is multi-page. A
  single landing page needs no router.

Scaffold greenfield with `npm create vite@latest` (react-ts), add Tailwind, then
`npx shadcn@latest init`. Keep dependencies lean — every extra lib is weight.

## Token architecture

Define tokens once; reference them everywhere. Two equally good conventions from the
source material — pick one and be consistent:

**(A) Tailwind v4 + oklch `@theme`** (greenfield default). oklch gives vivid,
perceptually-even color and is what modern shadcn uses:
```css
/* index.css */
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));
:root {
  --radius: 0.75rem;
  --background: oklch(0.99 0.003 250);
  --foreground: oklch(0.18 0.02 260);
  --primary:    oklch(0.62 0.20 255);
  --muted:      oklch(0.96 0.004 250);
  /* … */
}
@theme inline {                        /* maps vars → Tailwind utilities */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary:    var(--primary);
  --radius-lg: var(--radius);
  --radius-sm: calc(var(--radius) - 4px);
}
```

**(B) Tailwind v3 + HSL variables** (the classic shadcn pattern). Store colors as
space-separated HSL triplets so `/opacity` modifiers work:
```css
:root { --primary: 218 100% 63%; --background: 0 0% 100%; --foreground: 222 47% 11%; }
```
```ts
// tailwind.config.ts
colors: { primary: "hsl(var(--primary))", background: "hsl(var(--background))" }
```

In both, also expose a **flat "rebrand" scale** the marketing components use
directly (`neutral-0…12` from white→black, `brand-1/2/3`), authored as a single
block with a comment like `/* edit these to rebrand */`. This is what lets a client
re-theme the whole site by touching one place.

## Vertical rhythm utilities

The biggest "feels designed" lever: define rhythm as utility classes so every
section breathes identically, instead of hardcoding random `py-20` per section.
```css
.section        { padding-block: 5rem; }              /* 6rem at ≥1200px */
.section-header { margin-bottom: 2.5rem; }
.page-top       { padding-top: 7.5rem; }              /* clears a fixed navbar */
@media (min-width: 1200px) { .section { padding-block: 6rem; } }
```
Use custom breakpoints that read by intent when it helps: `tablet: 810px`,
`desktop: 1200px`.

## Reusable components to build once

Build these as real components and reuse them — they're where consistency comes
from. (Code for `Reveal` and `CountUp` is in `references/motion.md`.)

- **`Reveal`** — IntersectionObserver fade-up wrapper (reduced-motion aware).
- **`CountUp`** — animated number for the stats band.
- **`SectionHeader`** — `{ eyebrow?, title, subtitle?, align?, maxWidth? }`. Title
  accepts `ReactNode` so it can embed a highlighted word. Cap copy width ~550px.
- **`Marquee`** — the logo/value-word ticker (CSS animation; see motion.md).
- **`cn()`** — the `clsx` + `tailwind-merge` helper for class composition.

Card components (Pricing, Feature, Testimonial, FAQ item) should each be small,
single-responsibility, and fed by a local data array in their section — trivially
swappable to a CMS later.

## Composition pattern

```tsx
// Landing.tsx
export default function Landing() {
  return (
    <main>
      <Navbar />
      <Hero />
      <LogoMarquee />
      <Features />
      <HowItWorks />
      <Stats />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
```
Each section: `<section className="section">` → internal `.container` →
`<SectionHeader/>` → content, with its root wrapped in `<Reveal>`.

## Performance hygiene

- `loading="lazy" decoding="async"` on images; reserve `aspect-ratio` to avoid CLS.
- Preconnect to `fonts.googleapis.com` / `fonts.gstatic.com`; load fonts with `display=swap`.
- Code-split routes if multi-page; a single landing page doesn't need it.
- Keep the bundle lean — prefer the CSS motion primitives over shipping an animation
  library when you can.

## Backend

For most landing pages, **no backend** — sections are static, fed by in-file data
arrays. A waitlist/contact form may need an endpoint (e.g. a serverless function or
Supabase), but keep it optional and isolated; it is not part of the marketing
surface. Don't pull in auth/DB infrastructure for a page whose job is to convert.
