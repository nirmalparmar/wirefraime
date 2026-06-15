# Landing Page Anatomy & Conversion Craft

A landing page is an argument, told top to bottom, that ends in one action. Each
section is a beat in that argument. This file covers the canonical sections, the
order that works, and the conversion job each one does. Use it to *plan* before you
build — decide which sections this specific page needs and what each must prove.

## The conversion arc

Visitors scroll while asking, mostly subconsciously: *What is this? Is it for me?
Does it work? Can I trust you? What's it cost? What do I do now?* A page that
answers those questions in roughly that order converts. The canonical section order
maps onto it:

1. **Nav** — orientation + a persistent CTA
2. **Hero** — *What is this, and why should I care?* (the thesis)
3. **Social proof strip** — *Other people trust this* (logos/ratings)
4. **Features / benefits** — *Here's what it does for me*
5. **How it works** — *Here's how simple it is*
6. **Stats / outcomes** — *Here's the proof it works*
7. **Testimonials** — *People like me succeeded*
8. **Pricing** — *Here's what it costs* (only if relevant)
9. **FAQ** — *My remaining objection, handled*
10. **Final CTA** — *Do the thing now*
11. **Footer** — links, legal, secondary navigation

You rarely need all of these. A waitlist page might be Hero → Social proof → CTA.
A developer tool might skip testimonials but lean hard on a live code mock. **Cut
ruthlessly** — every section the visitor scrolls past without converting is a
chance to lose them. Match the section set to the page's one job.

---

## Section-by-section

### Nav
- Fixed or sticky. A common refined move: the nav is transparent over the hero,
  then a condensed/frosted version slides in only after the visitor scrolls past
  the hero (`scrollY > innerHeight * 0.85`).
- Logo + 3–5 links + exactly one CTA button (the same primary action). Don't dilute
  with two buttons of equal weight.
- A frosted-glass "pill" nav (rounded, `backdrop-filter: blur`) is a clean modern look.

### Hero — the thesis
The most important section. Open with the most characteristic, true thing about the
product, not a generic greeting. Structure that reliably works:

- **Eyebrow / badge** (optional): a small pill — a rating ("★ 4.9 on G2"), a
  status ("Now in public beta"), or a category. Builds instant micro-credibility.
- **Headline**: the value proposition in one line. Specific beats clever. "Ship
  emails your customers actually read" beats "Reimagine communication." Make it big,
  tight tracking, fluid `clamp()` sizing. A single word in an italic serif or a
  gradient can add personality without clutter.
- **Subhead**: 1–2 sentences that make the promise concrete — who it's for and the
  outcome. Cap the measure around 50–60ch for readability.
- **CTA pair**: one primary (the conversion action) + one low-commitment secondary
  ("See how it works", "View demo"). The primary should be visually dominant.
- **Hero visual**: the centerpiece. The strongest options are a *device mockup*
  (phone/browser-chrome showing the real product) or an *animated product mock*, not
  a stock illustration. See `references/effects.md` for mockup recipes.

Above-the-fold rule: a first-time visitor should understand *what this is and what
to do* without scrolling. Everything below the fold is reinforcement.

### Social proof strip
A thin band right after the hero: "Trusted by teams at…" + a row of customer logos,
or star ratings, or a user count. An **infinite logo marquee** (edge-faded with
`mask-image`) is the standard treatment. Keep logos monochrome/dimmed so they read
as proof, not as a distraction. See `references/motion.md` for the marquee.

### Features / benefits
The core "what it does" section. Two strong layouts:

- **Bento grid** — a few cards of varying size (one large hero card spanning 2
  columns/rows + several smaller). The large card gets the flagship feature with a
  rich mock; smaller cards get supporting features. This is the modern default and
  looks premium when the cards contain real mini-mocks.
- **Alternating rows** — text on one side, visual on the other, alternating sides
  down the page. Good for 3–4 substantial features that each deserve a paragraph.

Frame features as *benefits*: lead with the outcome for the user, then the feature
that delivers it. "Never miss a renewal — automatic reminders 30/7/1 days out"
beats "Automated reminder system."

### How it works
Reduce perceived effort. 3 numbered steps (`01 / 02 / 03`) with short labels,
ideally connected by a line. Keep it to 3 — more steps signal complexity. Only use
explicit numbering when the steps are genuinely sequential; don't number things for
decoration.

### Stats / outcomes
A band of 2–4 big numbers (often on a dark/contrasting background) with **count-up
animation** on scroll (see `references/motion.md`). Use real, specific,
benefit-oriented metrics: "2.4M emails sent", "99.98% uptime", "12 min saved per
day". Vague stats ("lots of happy users") erode trust; specific ones build it.

### Testimonials
Quality over quantity. A single large, specific testimonial with a real name, role,
company, and photo often beats a carousel of generic praise. The most persuasive
quotes name a concrete outcome ("cut our onboarding from 3 weeks to 4 days"). If you
show several, give each an avatar + attribution; anonymous quotes read as invented.

### Pricing
Only if pricing is part of the decision. Standard pattern: 2–4 tiers, the
recommended tier visually elevated (accent border, "Most popular" badge, slight
lift/scale, color-matched glow). Each tier: name, price with `/mo`, one-line
positioning, feature list, CTA. Make the price scannable (`items-baseline` with a
smaller `/mo`). A monthly/annual toggle is a nice touch. For complex/enterprise,
a "Contact sales" tier is fine.

### FAQ
Handles the last objections so the visitor doesn't leave to go think. Use an
accordion. A clean hand-rolled accordion (animated `max-height` + a `+`→`×` icon
rotation) works well and avoids dependencies; native `<details>`/`<summary>` is the
zero-JS option. Answer the *real* objections: price justification, switching cost,
security, "does it work for my case," cancellation. Vague filler FAQs waste the slot.

### Final CTA
Repeat the hero's promise and ask for the action one more time, now that the visitor
is convinced. Often a high-contrast full-width band (gradient, dark, or a soft
glow). One headline + one button. This is frequently the highest-converting CTA on
the page because it catches people who read everything — make it count.

### Footer
Multi-column links (product, company, resources, legal), social icons, and often an
oversized brand wordmark for a confident finish. A newsletter capture can live here.
Keep it tidy; it's the floor of the page, not another pitch.

---

## Copy is design material

The words carry as much of the conversion as the layout. Principles:

- **Specific, not aspirational.** Name the concrete outcome and audience. Numbers,
  nouns, and verbs over adjectives.
- **Active voice, second person.** "You ship faster," not "Faster shipping is enabled."
- **Lead with the benefit, support with the feature.**
- **One idea per section.** Don't crowd a section with three messages.
- **Read it aloud.** If it sounds like a brochure or a robot, rewrite it like a
  smart person explaining the product to a friend.

When the brief is thin, *write real copy anyway* — invent a plausible product name,
value prop, three concrete features, and believable testimonials. A specific draft
is something the user can react to and correct; `[Headline goes here]` is not.

## Common mistakes that kill conversion

- More than one primary action competing for attention.
- A hero that describes the company ("We are a leading provider…") instead of the
  visitor's outcome.
- Stock-icon feature grids with no product in sight.
- Walls of equal-weight text with no visual hierarchy or scannable structure.
- Animation everywhere — motion should guide the eye, not fight for it.
- Fake-looking social proof (anonymous quotes, invented logos at huge scale).
- Burying the price three clicks away when price is the visitor's main question.
