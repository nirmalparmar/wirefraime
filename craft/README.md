# Craft references

Brand-agnostic craft knowledge — dense rulebooks on one dimension of UI
craft each (typography, color, motion, …). These are **universal**: true
regardless of which design system is active. The design system says *which*
colors and fonts a brand uses; `craft/` says the rules a competent designer
applies on top.

## How it's used

`lib/design/craft.ts` `loadCraftSections([...])` reads the requested files,
concatenates them under `### <slug>` headers, and the design agent injects
them into the generation/edit system prompt. Only the requested sections
are injected, so callers pay token cost only for what they need.

```ts
import { loadCraftSections } from "@/lib/design/craft";
const craft = loadCraftSections(["anti-ai-slop", "typography", "color"]);
```

Several rules in `anti-ai-slop.md` are additionally **auto-enforced** by
`lib/design/lint-artifact.ts`, which scans generated HTML for the seven
cardinal sins and can trigger a targeted fix pass.

## The three axes (target architecture — see `docs/architecture-plan.md`)

| Axis | Scope | Lives in |
|---|---|---|
| Shape | artifact type (landing page, app UI) | `skills/` (Phase 3) |
| Brand | visual language (Apple, Linear, …) | `design-systems/` (Phase 2) |
| **Craft** | universal craft rules | **`craft/` (this dir)** |

## Files

- `anti-ai-slop.md` — the seven cardinal sins (several linted) + soul.
- `typography.md` — scale, leading, letter-spacing, weight discipline.
- `color.md` — palette structure, accent discipline, contrast, anti-defaults.
- `state-coverage.md` — the five required states, forms, loading thresholds.
- `accessibility-baseline.md` — WCAG 2.2 AA floor.
- `animation-discipline.md` — when motion earns its place + durations.
- `laws-of-ux.md` — composition heuristics (Hick, proximity, anchoring…).
- `copy-honesty.md` — honest, specific copy; landing-page voice.

> Adapted for Wirefraime (Tailwind semantic tokens + Iconoir) from
> Open Design's craft layer (MIT, refero_skill lineage).
