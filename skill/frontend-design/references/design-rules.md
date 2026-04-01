# Design Quality Rules

These rules override your defaults. Follow them exactly.

## Color

CHOOSE colors that feel grounded and intentional:
- Rich darks: #1A1A2E, #0F172A, #1C1917, #18181B — not pure #000000
- Warm lights: #FAFAF8, #F8F7F4, #F5F5F0 — not pure #FFFFFF
- Muted accents: desaturate brand colors 20-30% for UI use. A button at #3B82F6 is fine, but the same blue as a card background is too loud — use #3B82F610 instead
- Dark surfaces: add a subtle hue. #0C0C14 (blue-black), #0F0F0D (warm-black), #0A0F0A (green-black) all feel better than #09090B

AVOID these specific colors and combos:
- Pure saturated rainbow colors (#FF0000, #00FF00, #0000FF) anywhere in the UI
- Neon green (#00FF88, #39FF14) — instant "hacker" look
- Gradient backgrounds on cards or sections — use flat surfaces
- More than one bright accent on the same screen — pick ONE, mute the rest
- Purple-on-dark-gray (#7C3AED on #18181B) — the most overused AI design combination

ONE accent color per screen carries meaning (CTAs, active states, links). Everything else is neutral.

## Typography

SIZE HIERARCHY — enforce strict visual stepping:
- Page title: 28-36px, weight 700, letter-spacing -0.02em, line-height 1.15
- Section heading: 20-24px, weight 600, letter-spacing -0.01em, line-height 1.25
- Subheading: 16-18px, weight 600, line-height 1.35
- Body: 14-16px, weight 400, line-height 1.55-1.65
- Caption/label: 12-13px, weight 500, line-height 1.4
- Tiny metadata: 11px, weight 500, muted color

RULES:
- Two fonts max. One heading, one body. The ds-* classes handle this already.
- Never make two adjacent elements the same visual weight — one must clearly lead
- Body text line-height below 1.5 makes everything feel cramped. Use 1.55-1.65.
- ALL CAPS only for very short labels (3-5 chars): "NEW", "PRO", "USD". Never for sentences or headings.
- Numbers and metrics look better in the mono font from the design system

## Icons

USE Iconoir classes exclusively: <i class="iconoir-icon-name"></i>

SIZES — match icons to their context:
- Navigation icons: 20-24px (ds-icon or ds-nav-item defaults)
- Inline with text/buttons: 16-18px (ds-icon-sm)
- Feature/hero icons: 24-28px (ds-icon-lg)
- Never use icons larger than 32px — they become illustrations, not icons
- Never use icons smaller than 14px — they become illegible

STYLE:
- Icons in nav/sidebar: use text-muted color by default, primary color when active
- Icons in cards: subtle, same color as caption text. They support the label, not replace it.
- Never give icons colored backgrounds unless it's a status indicator (success dot, error badge)
- Always pair icons with a text label in navigation. Icon-only buttons need a title attribute.

## Layout and Spacing

SPACING rhythm — use 8px base unit:
- Card padding: 20-28px (never below 16px)
- Section gaps: 24-40px
- Element gaps within cards: 12-16px
- Button padding: 12-24px horizontal, height from ds-btn-height
- Touch targets: 44px minimum for anything clickable

DENSITY:
- Dashboards: generous whitespace, cards breathe, max 3-4 cards per row
- Lists/tables: tighter but still 12px row padding minimum
- Mobile: stack vertically, no horizontal scroll, full-width cards with 16px side margins
- Never fill empty space with decorative elements — whitespace is a design choice

GRID:
- Web dashboards: sidebar (260px) + main content area. Main content max-width 1200px.
- Mobile: single column, 16-20px padding on sides
- Cards in a grid: equal heights per row using CSS grid, not flexbox wrapping

## Visual Effects

SHADOWS — pick one system:
- Subtle: 0 1px 3px rgba(0,0,0,0.06) for cards, 0 4px 12px rgba(0,0,0,0.1) for elevated
- Dark mode: 0 1px 3px rgba(0,0,0,0.2) for cards, 0 4px 12px rgba(0,0,0,0.3) for elevated
- Shadows are for elevation, not decoration. One shadow value per card type.

BORDERS:
- 1px solid with border color from design system
- Avoid colored borders except for active/focus states where primary color is appropriate
- Border radius: stay consistent with ds-radius values. Don't mix sharp and rounded.

BANNED:
- Glow effects (box-shadow with bright spread colors)
- Gradient text
- Gradient card backgrounds
- Animated gradients
- Pulsing/glowing badges (a single subtle pulse on a notification dot is acceptable)
- Background blur on more than one element per screen
- Decorative SVG blobs or mesh gradients behind content

## Content

ALL content must be realistic and specific to the app's domain:
- Use real names: "Sarah Chen", "Marcus Johnson" — not "User 1"
- Use real numbers: "$4,280.50", "847 tasks" — not "XXX"
- Use real dates: "Mar 15, 2026" — not "Date"
- Use real descriptions: "Weekly standup with design team" — not "Description here"
- Dashboard metrics should tell a story — numbers should be plausible for the domain
- Avatar initials should match the name: "SC" for Sarah Chen

## Screen Structure

Every screen needs:
1. Clear navigation (topbar, sidebar, or bottom tabs — match the design system navStyle)
2. A page header with title and optional actions
3. Content area with clear visual hierarchy
4. Consistent padding from edges (match ds-card-padding for content margins)

HIERARCHY per screen:
- One hero element (the main metric, the primary content, the key action)
- 2-4 supporting elements (secondary info, related actions)
- Contextual elements (metadata, timestamps, labels) — small and muted
- If everything is the same size and weight, there is no hierarchy. Fix it.

## What NOT to Do

- Don't put 6+ cards of equal visual weight in a grid — it's a wall, not a dashboard
- Don't use colored backgrounds behind icon circles (the "rainbow feature grid" pattern)
- Don't center everything — left-align body text, data, and forms
- Don't use more than 2 font weights on a single card
- Don't stack more than 3 badges/pills in a row
- Don't put shadows on elements inside cards that already have shadows
- Don't use opacity below 0.4 for any text the user needs to read
