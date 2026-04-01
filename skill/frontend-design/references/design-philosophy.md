# Design Philosophy

Restraint over spectacle. Intention over decoration. Clarity over cleverness.

The best interfaces feel inevitable — every decision has a reason, nothing is there to impress. You are not designing to look impressive. You are designing to feel right for the specific product, user, and context.

You are evaluated on one thing: could this ship in a real app used by people with taste?

---

## Reading a Design System

When given a design system (colors, fonts, spacing), treat it as design intent, not literal commands.

- Raw hex values are starting points. Reinterpret them if they produce poor results.
- Saturation in design systems is almost always too high. Reduce accent colors by 20-35% saturation before using them.
- If the palette has more than one bright accent color, demote all but one to near-neutral in actual usage.
- Pure black (#000000) and pure white (#FFFFFF) backgrounds are almost always wrong. Add a subtle hue — very dark navy, warm charcoal, off-white cream.
- State your color reinterpretations briefly before building. Be decisive, not apologetic.

---

## Color Rules

**Saturation discipline.** Fully saturated colors work in logos, not in interfaces. Every accent you use at full saturation makes the design feel cheaper. When in doubt, pull it back.

**One hero accent per screen.** Pick one color to carry meaning. Everything else should be neutral or near-neutral. Secondary palette colors are for data visualization and semantic states (error, success), not for decoration.

**Forbidden combinations:**
- Neon yellow + cyan + neon green simultaneously (energy drink aesthetic)
- Purple gradient on dark or white backgrounds (the single most overused AI design choice)
- Multiple bright colors competing for attention on the same surface

**Semantic color restraint.** Error red, success green, warning amber — these should be desaturated enough to coexist with body text without alarming the user unnecessarily. #FF3366 is a panic color; #E0607A is an error color.

**Dark mode surfaces.** Very dark backgrounds should have a slight hue — blue-black, warm-black, green-black. Pure #09090B reads as dead and generic. The hue does not need to be perceptible; it just needs to exist.

**Light mode surfaces.** Off-white is almost always better than pure white. #FAFAF8, #F7F6F3, #F5F4EF — these feel like paper. #FFFFFF feels like a blank document.

---

## Typography

**Two typefaces maximum.** One for display/headings, one for body/UI. Never three.

**Size creates hierarchy, weight confirms it.** Do not use bold weight as a substitute for scale. One number cannot be both large and bold and also surrounded by other large bold numbers — hierarchy collapses.

**Line height matters more than font size.** Body text needs 1.55-1.7. Headings need 1.1-1.25. Tight line height on body text is the fastest way to make an interface feel cramped.

**Letter spacing rules:**
- Large display text (48px+): -0.02em to -0.03em
- Headings (24-48px): -0.01em
- Body: 0
- Short uppercase labels (3-5 chars max): +0.06em to +0.1em
- Never use wide letter-spacing on body text or long labels

**ALL CAPS** is for unit labels (km, bpm, kcal, USD) and very short category tags only. Never for sentences, headings, or any string longer than 5 characters.

**Monospace fonts** are for numbers, timestamps, code, and metrics. Not for labels, headings, or navigation.

---

## Visual Hierarchy

Every screen has exactly one primary focus. One. Not two, not "a few important things."

Ask before laying out any screen: what is the ONE thing the user is here to see or do right now? That element gets maximum visual weight. Everything else steps down.

Three tiers:
1. **Hero** — one element. Largest, highest contrast, most prominent position.
2. **Supporting** — 2-5 elements. Clearly subordinate. Medium weight and size.
3. **Contextual** — metadata, labels, secondary actions. Muted, small, not competing.

If you find yourself making three things hero-sized, you have not made a hierarchy decision. Make it.

---

## Spacing and Layout

**Generous whitespace is never wasted.** The instinct to fill space with content or decoration is almost always wrong. Empty space communicates calm, confidence, and clarity.

**Consistent spatial rhythm.** Pick a base spacing unit (8px is standard). All padding, gaps, and margins should be multiples of it. Arbitrary values (13px, 22px, 37px) break visual rhythm.

**Card padding.** 20-28px. Never less than 16px. Cards with 12px padding feel like they're running out of room.

**Touch targets.** 44x44px minimum for anything interactive. This is not optional.

**Information density.** Match density to context:
- Dashboard/overview screens: lower density, breathing room, quick scanning
- Detail/data screens: higher density acceptable, but with clear grouping
- Never mix high-density and low-density sections on the same screen without clear visual separation

---

## Effects and Animation

**Glow effects are banned** unless used once, on the single most important interactive element, at low opacity. box-shadow: 0 0 24px rgba(color, 0.5) on cards, icons, buttons, and text simultaneously is the fastest way to produce AI slop.

**Gradients as backgrounds** are almost always wrong. If you are using a 3-8% opacity radial gradient to "add depth," remove it. Use a flat surface color. It will look better.

**Drop shadows.** Use them to communicate elevation, not decoration. One shadow value system for the whole interface. Shadows should be soft, dark, and directionally consistent — not colorful.

**Animation rules:**
- Zero animations is a valid and often correct choice
- One animation per screen maximum for anything non-interactive
- Permitted: single live indicator pulse, tab transition, hover state
- Forbidden: simultaneously pulsing badges, glowing cards, bouncing icons, gradient color shifts

---

## Originality

Before implementing any UI pattern, ask: have I seen this in dozens of AI-generated interfaces? If yes, design an alternative.

**Overused patterns to replace:**

| Cliche | Replace with |
|---|---|
| Three concentric activity rings | Arc gauge, single dial, heatmap grid, spark bars |
| Floating center button in bottom nav | Full-width action bar, gesture trigger, contextual FAB |
| Dark card + neon metric + muted unit label | Oversized stat layout, mixed-weight typography, editorial number display |
| Purple gradient hero section | Flat tinted surface, strong typography, photographic texture |
| Glassmorphism cards (blur + 20% white border) | Flat elevated cards with proper shadow |
| Rainbow icon colors in a grid | Single-color icons with shape differentiation |

The test: if you could find this exact pattern in a Dribbble search for "fitness app UI" or "fintech dashboard," redesign it.

---

## Domain Adaptation

Adjust tone and aesthetic based on what you are building:

**Finance / Banking** — Trust, precision, calm. Restrained palette (navy, warm gray, one accent). Dense but organized data. No rounded-everything. Subtle but present structure.

**Health / Medical** — Clarity over aesthetics. High contrast for readability. Semantic color use only. No decorative elements. Clean grid.

**Fitness / Sport** — Energy within restraint. One bold accent, everything else controlled. Performance data gets prominence. Avoid the energy-drink aesthetic.

**Productivity / Tools** — Neutral, quiet, fast. Interface disappears; content is king. Minimal color, maximum clarity. Monospace where appropriate.

**Creative / Consumer** — More expressive range acceptable. Typography can be distinctive. Color can do more work. Still needs hierarchy.

**E-commerce** — Product is the hero, always. Interface supports the product; never competes with it. Whitespace makes products feel premium.
