# Renderer Reference

How to map the design JSON schema to actual UI.

## React + CSS Renderer (Recommended)

### Node Resolver

```tsx
function RenderNode({ nodeId, nodes }) {
  const node = nodes[nodeId];
  if (!node || !node.visible) return null;

  switch (node.type) {
    case 'frame': return <FrameNode node={node} nodes={nodes} />;
    case 'text':  return <TextNode node={node} />;
    case 'image': return <ImageNode node={node} />;
    case 'button': return <ButtonNode node={node} />;
    case 'icon':  return <IconNode node={node} />;
    case 'input': return <InputNode node={node} />;
    case 'rectangle': return <RectangleNode node={node} />;
    default: return null;
  }
}
```

### Layout → CSS Mapping

```tsx
function layoutToCSS(layout) {
  const css = {
    position: layout.position === 'absolute' ? 'absolute' : 'relative',
    left: layout.x,
    top: layout.y,
    width: layout.widthMode === 'fill' ? '100%'
         : layout.widthMode === 'hug' ? 'fit-content'
         : layout.width,
    height: layout.heightMode === 'fill' ? '100%'
          : layout.heightMode === 'hug' ? 'fit-content'
          : layout.height,
  };

  if (layout.direction !== 'none') {
    css.display = 'flex';
    css.flexDirection = layout.direction === 'row' ? 'row' : 'column';
    css.alignItems = layout.align;
    css.justifyContent = layout.justify;
    css.gap = layout.gap;
    css.paddingTop = layout.padding?.top;
    css.paddingRight = layout.padding?.right;
    css.paddingBottom = layout.padding?.bottom;
    css.paddingLeft = layout.padding?.left;
  }

  return css;
}
```

### Style → CSS Mapping

```tsx
function styleToCSS(style) {
  const css = { opacity: style.opacity ?? 1 };

  if (style.background?.type === 'solid') {
    css.backgroundColor = style.background.color;
  } else if (style.background?.type === 'gradient') {
    const stops = style.background.stops
      .map(s => `${s.color} ${s.position * 100}%`).join(', ');
    css.background = `linear-gradient(${style.background.angle}deg, ${stops})`;
  }

  if (style.border) {
    css.border = `${style.border.width}px ${style.border.style} ${style.border.color}`;
    css.borderRadius = style.border.radius;
  }

  if (style.shadow) {
    const s = style.shadow;
    css.boxShadow = `${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`;
  }

  if (style.overflow) css.overflow = style.overflow;

  return css;
}
```

### Text Node

```tsx
function TextNode({ node }) {
  const ts = node.textStyle;
  const css = {
    color: ts.color,
    fontFamily: ts.fontFamily,
    fontSize: ts.fontSize,
    fontWeight: ts.fontWeight,
    lineHeight: ts.lineHeight,
    letterSpacing: ts.letterSpacing,
    textAlign: ts.textAlign,
    textDecoration: ts.textDecoration,
    ...layoutToCSS(node.layout),
  };
  return <div style={css}>{node.content}</div>;
}
```

---

## Patch Application

Apply patches to your JSON state:

```ts
function applyPatches(nodes, patches) {
  const map = Object.fromEntries(nodes.map(n => [n.id, { ...n }]));

  for (const patch of patches) {
    if (patch.op === 'update') {
      const node = map[patch.nodeId];
      setNestedValue(node, patch.path, patch.value);
    }
    if (patch.op === 'insert') {
      map[patch.node.id] = patch.node;
      const parent = map[patch.parentId];
      const idx = patch.afterId
        ? parent.children.indexOf(patch.afterId) + 1
        : parent.children.length;
      parent.children.splice(idx, 0, patch.node.id);
    }
    if (patch.op === 'delete') {
      const node = map[patch.nodeId];
      if (node.parentId) {
        const parent = map[node.parentId];
        parent.children = parent.children.filter(id => id !== patch.nodeId);
      }
      delete map[patch.nodeId];
    }
    if (patch.op === 'move') {
      const node = map[patch.nodeId];
      // remove from old parent
      if (node.parentId) {
        map[node.parentId].children = map[node.parentId].children.filter(id => id !== patch.nodeId);
      }
      // add to new parent
      const newParent = map[patch.newParentId];
      newParent.children.splice(patch.index ?? newParent.children.length, 0, patch.nodeId);
      node.parentId = patch.newParentId;
    }
    if (patch.op === 'reorder') {
      map[patch.parentId].children = patch.childIds;
    }
  }

  return Object.values(map);
}

function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}
```

---

## Canvas Editor Additions

For an editable canvas (like Figma), you need to layer on:

1. **Selection state** — track `selectedNodeId`, show handles on selected node
2. **Drag to move** — update `layout.x`, `layout.y` on mouseup → emit `update` patch
3. **Resize handles** — 8-point handles update `layout.width`, `layout.height`
4. **Click to edit text** — inline `contentEditable` on text nodes
5. **Context menu** — right-click to delete, duplicate, group
6. **History** — maintain undo/redo stack of patch arrays

Libraries that help:
- `react-draggable` — for drag move
- `re-resizable` — for resize handles
- `immer` — for immutable state patches
- `zustand` — simple state management for the design store