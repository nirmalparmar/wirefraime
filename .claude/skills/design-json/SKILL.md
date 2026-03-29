---
name: figma-design-json
description: >
  Generates structured, LLM-friendly design JSON for Figma-like UI editors — editable, renderable, and patchable.
  Use this skill whenever the user wants to:
  - Generate a UI design, screen, or component as structured JSON
  - Create a design system, layout, landing page, dashboard, or app screen using JSON
  - Build or extend an editable design canvas (like Figma) powered by an LLM
  - Produce design tokens, component specs, or patch operations for a visual editor
  - Ask for "design JSON", "UI JSON", "component JSON", "scene graph", or anything about
    rendering designs from structured data
  Also trigger this skill when the user asks about what JSON format to use for UI generation,
  how to make LLM-generated designs editable, or how to structure nodes for a design tool.
---

# Figma-like Design JSON Generator

This skill helps you generate, edit, and patch structured design JSON for a Figma-like visual editor
powered by an LLM. The JSON schema is designed to be:

- **LLM-friendly**: semantic, human-readable keys with clear intent
- **Renderable**: maps directly to CSS flexbox and canvas primitives
- **Editable**: flat node registry with addressable IDs for surgical patches
- **Extensible**: supports design tokens, components, and interactions

---

## Core JSON Schema

### Top-Level Document

```json
{
  "version": "1.0",
  "name": "My Design",
  "canvas": {
    "width": 1440,
    "height": 900,
    "background": "#F5F5F5",
    "grid": { "enabled": true, "size": 8, "color": "#E0E0E0" }
  },
  "tokens": { ... },
  "nodes": [ ... ],
  "rootIds": ["node_001"]
}
```

- `canvas` — the viewport/artboard dimensions
- `tokens` — global design tokens (colors, typography, spacing)
- `nodes` — flat array of ALL nodes (referenced by ID)
- `rootIds` — top-level node IDs (no parent)

---

### Node Structure (Universal)

Every node shares this base shape:

```json
{
  "id": "node_001",
  "name": "Hero Section",
  "type": "frame",
  "parentId": null,
  "visible": true,
  "locked": false,
  "layout": { ... },
  "style": { ... },
  "children": ["node_002", "node_003"]
}
```

**Rules:**
- `id` must be unique — use format `node_XXX` (incrementing)
- `parentId` is `null` for root nodes
- `children` lists IDs of direct child nodes
- The `nodes` array is always flat — never nested

---

### Node Types

| Type | Purpose |
|------|---------|
| `frame` | Container / group / section (maps to a div with flexbox) |
| `text` | Text block (heading, paragraph, label, caption) |
| `image` | Image placeholder or real image |
| `button` | Interactive button element |
| `input` | Text field, textarea, select |
| `icon` | Icon (from Lucide, Material, etc.) |
| `rectangle` | Shape / divider / colored block |
| `card` | Pre-composed card (frame with shadow + padding) |
| `navbar` | Navigation bar container |
| `list` | Repeating list of items |
| `component` | Reference to a reusable component |

---

### Layout Object

Controls position and flex behavior:

```json
"layout": {
  "x": 0,
  "y": 0,
  "width": 1440,
  "height": 600,
  "widthMode": "fixed",
  "heightMode": "hug",
  "direction": "column",
  "align": "center",
  "justify": "space-between",
  "gap": 24,
  "padding": { "top": 80, "right": 120, "bottom": 80, "left": 120 },
  "position": "auto"
}
```

- `widthMode` / `heightMode`: `"fixed"`, `"fill"`, `"hug"` (hug = shrink to content)
- `direction`: `"row"` | `"column"` | `"none"` (none = absolute positioning)
- `align`: cross-axis alignment (`"start"`, `"center"`, `"end"`, `"stretch"`)
- `justify`: main-axis alignment (`"start"`, `"center"`, `"end"`, `"space-between"`, `"space-around"`)
- `position`: `"auto"` (in flow) | `"absolute"` (ignore flow, use x/y)

---

### Style Object

Appearance properties:

```json
"style": {
  "background": {
    "type": "solid",
    "color": "#1A1A2E"
  },
  "border": {
    "width": 1,
    "color": "#E2E8F0",
    "style": "solid",
    "radius": 12
  },
  "shadow": {
    "x": 0, "y": 4, "blur": 24, "spread": 0,
    "color": "#00000020"
  },
  "opacity": 1,
  "overflow": "hidden"
}
```

Background types:
- `{ "type": "solid", "color": "#hex" }`
- `{ "type": "gradient", "angle": 135, "stops": [{ "color": "#hex", "position": 0 }, { "color": "#hex", "position": 1 }] }`
- `{ "type": "none" }`

---

### Type-Specific Fields

**Text node:**
```json
{
  "type": "text",
  "content": "Build faster with AI",
  "textStyle": {
    "color": "#FFFFFF",
    "fontFamily": "Inter",
    "fontSize": 64,
    "fontWeight": 700,
    "lineHeight": 1.2,
    "letterSpacing": -1,
    "textAlign": "center",
    "textDecoration": "none"
  }
}
```

**Image node:**
```json
{
  "type": "image",
  "src": "https://...",
  "alt": "Dashboard screenshot",
  "objectFit": "cover"
}
```

**Button node:**
```json
{
  "type": "button",
  "label": "Get Started",
  "variant": "primary",
  "interaction": {
    "onClick": "navigate",
    "target": "/signup"
  }
}
```

**Input node:**
```json
{
  "type": "input",
  "inputType": "text",
  "placeholder": "Enter your email",
  "label": "Email"
}
```

**Icon node:**
```json
{
  "type": "icon",
  "iconName": "ArrowRight",
  "iconSet": "lucide",
  "size": 24,
  "color": "#6C63FF"
}
```

---

### Design Tokens

Define tokens once, reference them throughout:

```json
"tokens": {
  "colors": {
    "primary": "#6C63FF",
    "secondary": "#FF6584",
    "background": "#FAFAFA",
    "surface": "#FFFFFF",
    "text": "#1A1A2E",
    "textMuted": "#6B7280",
    "border": "#E5E7EB",
    "success": "#10B981",
    "error": "#EF4444"
  },
  "typography": {
    "fontPrimary": "Inter",
    "fontMono": "JetBrains Mono",
    "sizeXs": 12,
    "sizeSm": 14,
    "sizeMd": 16,
    "sizeLg": 20,
    "sizeXl": 24,
    "size2xl": 32,
    "size3xl": 48,
    "size4xl": 64
  },
  "spacing": {
    "xs": 4,
    "sm": 8,
    "md": 16,
    "lg": 24,
    "xl": 32,
    "2xl": 48,
    "3xl": 64,
    "4xl": 96
  },
  "radii": {
    "sm": 4,
    "md": 8,
    "lg": 12,
    "xl": 16,
    "full": 9999
  }
}
```

---

## Patch / Edit Operations

For edits (rather than full regeneration), output a patch array:

```json
{
  "op": "patch",
  "patches": [
    {
      "op": "update",
      "nodeId": "node_004",
      "path": "style.background.color",
      "value": "#FF5733"
    },
    {
      "op": "insert",
      "parentId": "node_001",
      "afterId": "node_003",
      "node": { ... full new node ... }
    },
    {
      "op": "delete",
      "nodeId": "node_007"
    },
    {
      "op": "move",
      "nodeId": "node_005",
      "newParentId": "node_002",
      "index": 0
    },
    {
      "op": "reorder",
      "parentId": "node_001",
      "childIds": ["node_003", "node_002", "node_004"]
    }
  ]
}
```

Use patches when the user says things like "change the color", "add a button", "move this section", "delete the image".
Use full JSON generation when starting fresh or redesigning a screen.

---

## LLM Prompting Strategy

### System Prompt Guidance (for your app)

When calling an LLM to generate design JSON, include:

1. The full schema reference (this document)
2. Available design tokens
3. Current canvas dimensions and existing nodes (if editing)
4. Whether to output full JSON or a patch

### Generation Template

Instruct the model:

```
Generate a design JSON document for: [user description]

Canvas: 1440x900px desktop layout
Output: Full document JSON (not a patch)
Constraints:
- Use only node types from the schema
- All IDs must be unique (node_001, node_002, ...)
- Flat nodes array — never nest node objects
- Use design tokens where applicable
- Ensure all parentId/children references are consistent
```

### Edit Template

```
Here is the current design JSON:
[current JSON]

User request: [user edit instruction]

Output: A patch array only. Do not regenerate the full document.
```

---

## Renderer Architecture (Reference)

See `references/renderer.md` for how to map this JSON to:
- React + CSS (recommended for web)
- Konva.js (canvas-based)
- Absolute-positioned divs (simpler, less flexible)

---

## Common Patterns

### Landing Page Structure
```
frame (page)
├── frame (navbar) → direction: row, position: fixed
├── frame (hero) → direction: column, align: center
│   ├── text (headline)
│   ├── text (subheading)
│   └── frame (cta-group) → direction: row
│       ├── button (primary)
│       └── button (secondary)
├── frame (features) → direction: row, wrap: true
│   └── card[] (feature cards)
└── frame (footer)
```

### Dashboard Structure
```
frame (app)
├── frame (sidebar) → direction: column, width: 240, height: fill
│   ├── frame (logo)
│   └── list (nav-items)
└── frame (main) → direction: column, width: fill
    ├── frame (topbar) → direction: row
    └── frame (content) → direction: row, wrap: true
        └── card[] (metric cards, charts, tables)
```

---

## Output Format Rules

Always output valid, parseable JSON. When generating full documents:
1. Start with `version`, `name`, `canvas`, `tokens`
2. List ALL nodes in `nodes` array (flat)
3. List root node IDs in `rootIds`
4. Verify every child ID in `children` arrays exists in `nodes`
5. Verify every `parentId` matches an actual parent's `children` list

When outputting patches, only emit changed/added/deleted nodes — never the full document.