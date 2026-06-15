# Aesthetic Directions

Pick **one** direction and commit. An aesthetic is a coherent set of choices —
palette, type pairing, motion personality, and one signature element — that belongs
to a specific kind of product. The fastest way to look generic is to blend several.
The fastest way to look designed is to choose one with conviction and execute it
fully.

These eight directions are distilled from genuinely excellent pages. They are
starting points, not straitjackets — adapt the palette and fonts to the actual
subject. Each entry gives you: the vibe, who it fits, palette, type pairing, motion
personality, and the one signature move. Implementation details for the effects
and motion live in `references/effects.md` and `references/motion.md`.

When choosing: match the direction's *personality* to the product. A meditation app
is not Brutalist Mono; a developer CLI tool is not Aurora Dream. If unsure between
two, pick the one that's more *restrained* — restraint reads as confidence.

---

## 1. Silent Minimalism ("aethera")
**Vibe:** quiet, premium, editorial. Confidence through emptiness.
**Fits:** focus tools, writing apps, high-end services, design studios.
**Palette:** pure white background, deep near-black ink, a single mid-gray for
secondary text. **No accent color** — or at most one barely-there tint.
**Type:** a serif display (e.g. *Instrument Serif*, *Fraunces*) over *Inter* body.
The serif headline against a stark white field is the whole look.
**Motion:** breathing and organic — word-by-word reveals with a slight blur-in,
perpetual micro-drift on a hero element, a cursor-following glow (multiply blend).
**Signature:** type and whitespace *are* the design. Resist adding anything.

## 2. Cinematic Luxury ("prisma")
**Vibe:** film-grain, dramatic, unhurried, high-fashion.
**Fits:** creative studios, film/photo, premium brands, portfolios.
**Palette:** warm off-white or cream text on **pure black**, with a subtle SVG
film-grain overlay (`mix-blend-mode: overlay`, low opacity).
**Type:** a bold display face with very tight tracking (`-0.06em`) at huge sizes
(`text-[20vw]` wordmarks), italic serif for asides.
**Motion:** slow and intentional — long marquees (30s+), a scale-up "camera
pull-back" reveal, per-character opacity cascade on body copy as it scrolls.
**Signature:** oversized type + film grain + black. Everything feels expensive.

## 3. Terminal / Mechanical ("typewriter")
**Vibe:** technical, deliberate, indie-developer, honest.
**Fits:** dev tools, CLIs, technical SaaS, indie products, AI tools for builders.
**Palette:** a single saturated base (forest green, or terminal amber) + cream, or
a dark mode with a phosphor accent. One strong color, used structurally.
**Type:** a monospace (e.g. *Space Mono*, *JetBrains Mono*) for everything, or
mono display + grotesk body. A handwriting font (*Caveat*) for one human accent.
**Motion:** mechanical — a typing/deleting caret on the headline, physical
inset-shadow "keys," step-by-step reveals.
**Signature:** the typewriter headline effect (see `references/motion.md`).

## 4. Organic / Playful ("verdant")
**Vibe:** friendly, natural, approachable, a little decorative.
**Fits:** wellness, sustainability, consumer apps, education, community products.
**Palette:** an organic green or warm earth tone + a couple of playful chips
(purple/orange accents) on cream. Softer, warmer than corporate SaaS.
**Type:** a light, rounded sans (*Poppins 300*, *Hanken Grotesk*) + an italic serif
for warmth.
**Motion:** decorative but purposeful — gentle parallax layers, count-up stats,
bars that grow in, subtle floating elements.
**Signature:** soft organic shapes and a warm, hand-made-but-tidy feel.

## 5. Dark High-Tech ("atlas")
**Vibe:** sleek, futuristic, AI/infra, serious engineering.
**Fits:** AI products, developer platforms, security, data/infra, fintech.
**Palette:** true near-black (`#090A0F`) + one electric accent (violet `#8B7BF0`,
cyan, or blue). Glassmorphic surfaces (`rgba(255,255,255,.03)` fills, faint
borders), a subtle noise overlay for texture.
**Type:** a clean geometric sans (*Satoshi*, *Space Grotesk*, *Geist*) with
gradient-clipped headings.
**Motion:** refined and subtle — tight reveals, simulated UI (chat windows,
citations, dashboards), faint ambient glows that drift.
**Signature:** glassmorphism + a single electric accent glowing on black.

## 6. Bright Friendly SaaS ("digital")
**Vibe:** optimistic, confident, modern B2B/B2C SaaS. The "clean startup" look.
**Fits:** most mainstream SaaS, productivity, marketing tools, dashboards.
**Palette:** near-white background, one bright brand color (a confident blue,
indigo, or coral), generous neutrals. Define it in oklch for vivid, even color.
**Type:** *Space Grotesk* or *Geist* display + *DM Sans*/*Inter* body.
**Motion:** springy and friendly — spring-physics card lifts, gentle infinite
bob/pulse on accents, staggered reveals.
**Signature:** bento feature grid full of live product mocks; bright, energetic,
trustworthy. This is the safest strong default for a generic SaaS brief.

## 7. Aurora Dream ("aurora")
**Vibe:** dreamy, soft, consumer, wellness/lifestyle, beautiful.
**Fits:** consumer apps, health/fitness, music, creative consumer products.
**Palette:** a soft **aurora mesh** background — several overlapping pastel radial
gradients (pink, peach, lilac, cream) over a warm non-white base. Black or deep-ink
text and CTAs for contrast against the soft field.
**Type:** an elegant serif (*Playfair Display*) headline + *Inter* body — the
serif/sans contrast is core to the dreamy-but-crisp feel.
**Motion:** slow drift on the aurora (gated by reduced-motion), gentle reveals,
glowing icon "dots."
**Signature:** the aurora mesh-gradient background + serif headline (see
`references/effects.md` for the gradient recipe). Often paired with a realistic
phone mockup centerpiece.

## 8. Soft Neumorphism ("neumorphic")
**Vibe:** tactile, premium-toy, calm, friendly-but-refined.
**Fits:** consumer SaaS, productivity, finance/budgeting, family/lifestyle apps.
**Palette:** a warm light-gray canvas (`#e3e5e8`) holding one big white rounded
"shell" card; soft blue accent; playful props (a rotated sticky note, soft-3D icon
tiles).
**Type:** a friendly geometric sans (*Plus Jakarta Sans*) + a handwriting font
(*Caveat*) for one human touch.
**Motion:** micro-interactions only — `scale(.98)` press, gentle lifts. Calm.
**Signature:** layered soft shadows with an inset top-highlight (the "extruded"
look) + the inset-shell card architecture + floating mini-card props (see
`references/effects.md`).

---

## How to use a direction

1. Lift the palette and type pairing as a starting point; adjust hues to the brand.
2. Set them as your token contract (see `effects.md` / `react-stack.md`).
3. Commit to the **one signature move** — that's what makes the page memorable.
4. Apply the motion personality consistently (don't mix springy and cinematic).
5. Keep everything else neutral and restrained so the signature can shine.

If the user describes a vibe that isn't here, derive a new direction the same way:
name the personality, pick a disciplined palette, choose a deliberate type pairing,
and decide on one signature element. The framework matters more than these eight
specific recipes.
