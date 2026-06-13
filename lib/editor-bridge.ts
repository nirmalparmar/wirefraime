/**
 * Editor bridge injected into iframes.
 *
 * Design rules:
 *  1. NEVER write inline styles to user elements for editor state (selection,
 *     hover). Use data attributes + scoped CSS so they don't contaminate the
 *     saved HTML.
 *  2. Before serializing, strip everything the bridge added:
 *     - the bridge <script> itself
 *     - all <style data-wf-bridge> blocks
 *     - all data-wf-* attributes on user elements
 *  3. Block selection of <html> and <body> — those are full-screen wrappers
 *     and editing opacity on them makes the whole canvas appear to vanish.
 *  4. Editing inline styles is OK (user opts into them via the panel), but
 *     selection rings must NEVER persist into serialized HTML.
 */
export const EDITOR_BRIDGE_SCRIPT = `
(function() {
  // v2 guard — independent of the v1 __editorBridge flag, so when an older
  // bridge script is baked into legacy saved HTML, our v2 still installs and
  // takes precedence. Both versions can briefly co-execute on legacy screens;
  // getCleanHtml() strips the legacy artifacts on the next save.
  if (window.__wf_bridge_v2) return;
  window.__wf_bridge_v2 = true;
  window.__editorBridge = true; // keep legacy listeners quiet where possible

  var SELECTED = 'data-wf-selected';
  var HOVERED  = 'data-wf-hovered';
  var WFID     = 'data-wf-id';

  /* Stable element identity. Server-side repair injects data-wf-id on every
     element; anything created later (user edits, legacy HTML) gets one here.
     wf-ids survive serialization on purpose — they are the durable address
     that keeps the property panel working across reloads and AI edits, where
     XPath alone goes stale. */
  var idSeed = Math.random().toString(36).slice(2, 6);
  var idCounter = 1;
  function ensureWfId(el) {
    var id = el.getAttribute(WFID);
    if (!id) {
      id = 'el-' + idSeed + 'b-' + (idCounter++);
      el.setAttribute(WFID, id);
    }
    return id;
  }
  function ensureAllIds() {
    if (!document.body) return;
    var all = document.body.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.namespaceURI !== 'http://www.w3.org/1999/xhtml') continue;
      var t = el.tagName.toLowerCase();
      if (t === 'script' || t === 'style' || t === 'br' || t === 'hr') continue;
      ensureWfId(el);
    }
  }
  ensureAllIds();

  /* Resolve an edit target: durable wf-id first, XPath as fallback. */
  function findTarget(d) {
    if (d.wfId) {
      try {
        var byId = document.querySelector('[' + WFID + '="' + d.wfId + '"]');
        if (byId) return byId;
      } catch(e) { /* malformed id */ }
    }
    return d.xpath ? findByXPath(d.xpath) : null;
  }

  function notifyTargetMissing(d) {
    window.parent.postMessage({
      type: 'EDIT_TARGET_MISSING',
      wfId: d.wfId || null,
      xpath: d.xpath || null
    }, '*');
  }

  // Scoped style: outlines via attribute selector. Tagged so we can strip on save.
  var bridgeStyle = document.createElement('style');
  bridgeStyle.setAttribute('data-wf-bridge', '');
  bridgeStyle.textContent =
    'html,body{overflow:hidden!important;height:auto!important;min-height:0!important;}' +
    '[data-wf-hovered]:not([data-wf-selected]){outline:2px solid rgba(13,153,255,.45)!important;outline-offset:-2px!important;cursor:pointer!important;}' +
    '[data-wf-name][data-wf-hovered]:not([data-wf-selected]){outline:2px dashed rgba(13,153,255,.6)!important;outline-offset:-2px!important;}' +
    '[data-wf-selected]{outline:2px solid rgba(13,153,255,.95)!important;outline-offset:-2px!important;}';
  (document.head || document.documentElement).appendChild(bridgeStyle);

  var hovered = null;
  var selected = null;
  var selectedXPath = null;

  function isRoot(el) {
    return !el || el === document.body || el === document.documentElement;
  }

  function getXPath(el) {
    if (el.id) return '//*[@id="' + el.id + '"]';
    if (el === document.body) return '/html/body';
    if (!el.parentNode) return '';
    var siblings = el.parentNode.children;
    var idx = 0;
    for (var i = 0; i < siblings.length; i++) {
      if (siblings[i].tagName === el.tagName) idx++;
      if (siblings[i] === el) break;
    }
    return getXPath(el.parentNode) + '/' + el.tagName.toLowerCase() + '[' + idx + ']';
  }

  function findByXPath(xpath) {
    try {
      var result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue;
    } catch(e) { return null; }
  }

  /* Direct text of an element: its own text nodes only, children excluded.
     This is what the panel's content editor reads AND what setDirectText
     writes back — so editing the label of a button never clobbers its icon. */
  function getDirectText(el) {
    var out = '';
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3) out += n.nodeValue;
    }
    return out.replace(/\\s+/g, ' ').trim();
  }

  function setDirectText(el, value) {
    var textNodes = [];
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.replace(/\\s+/g, '')) textNodes.push(n);
    }
    if (textNodes.length === 0) {
      if (el.children.length === 0) { el.textContent = value; return; }
      el.appendChild(document.createTextNode(value));
      return;
    }
    textNodes[0].nodeValue = value;
    for (var j = 1; j < textNodes.length; j++) textNodes[j].nodeValue = '';
  }

  function describe(el) {
    var cs = window.getComputedStyle(el);
    return {
      wfId: ensureWfId(el),
      xpath: getXPath(el),
      tagName: el.tagName.toLowerCase(),
      className: el.className || '',
      textContent: getDirectText(el),
      styles: {
        color: cs.color, backgroundColor: cs.backgroundColor,
        fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontFamily: cs.fontFamily,
        padding: cs.padding, paddingTop: cs.paddingTop, paddingRight: cs.paddingRight,
        paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft,
        margin: cs.margin, marginTop: cs.marginTop, marginRight: cs.marginRight,
        marginBottom: cs.marginBottom, marginLeft: cs.marginLeft,
        borderRadius: cs.borderRadius, borderWidth: cs.borderWidth,
        borderColor: cs.borderColor, borderStyle: cs.borderStyle,
        width: cs.width, height: cs.height, opacity: cs.opacity,
        textAlign: cs.textAlign, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing,
        textDecoration: cs.textDecoration, display: cs.display,
        flexDirection: cs.flexDirection, alignItems: cs.alignItems,
        justifyContent: cs.justifyContent, gap: cs.gap, boxShadow: cs.boxShadow
      }
    };
  }

  function applySelection(el) {
    if (selected && selected !== el) selected.removeAttribute(SELECTED);
    selected = el;
    selectedXPath = el ? getXPath(el) : null;
    if (el) el.setAttribute(SELECTED, '');
  }

  function clearSelection() {
    if (selected) selected.removeAttribute(SELECTED);
    selected = null;
    selectedXPath = null;
  }

  // Re-bind selection after self-edits (in case node was replaced)
  function reSelectFromXPath() {
    if (!selectedXPath) return;
    var el = findByXPath(selectedXPath);
    if (el && el !== selected) applySelection(el);
  }

  document.addEventListener('mouseover', function(e) {
    var el = e.target;
    if (isRoot(el)) return;
    if (hovered && hovered !== el) hovered.removeAttribute(HOVERED);
    hovered = el;
    if (el !== selected) el.setAttribute(HOVERED, '');
  }, true);

  document.addEventListener('mouseout', function() {
    if (hovered) {
      hovered.removeAttribute(HOVERED);
      hovered = null;
    }
  }, true);

  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    if (isRoot(el)) {
      // Clicking blank area / body deselects, but doesn't crash
      clearSelection();
      window.parent.postMessage({ type: 'ELEMENT_SELECTED', element: null }, '*');
      return;
    }
    applySelection(el);
    window.parent.postMessage({ type: 'ELEMENT_SELECTED', element: describe(el) }, '*');
  }, true);

  // Forward wheel events to parent for canvas pan/zoom.
  //   - window + CAPTURE: runs before any wheel handler in the generated
  //     screen (carousels, scroll areas, etc.). A bubble-phase listener can be
  //     silently bypassed if such content calls stopPropagation(), which lets
  //     ctrl/⌘+wheel escape to the browser as a full-page zoom.
  //   - preventDefault always: blocks that native page zoom from inside the
  //     iframe (the parent document can't reach wheel events fired in here).
  window.addEventListener('wheel', function(e) {
    e.preventDefault();
    window.parent.postMessage({
      type: 'IFRAME_WHEEL',
      deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode,
      shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey,
      clientX: e.clientX, clientY: e.clientY
    }, '*');
  }, { passive: false, capture: true });

  // Escape clears selection inside the iframe
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      clearSelection();
      window.parent.postMessage({ type: 'ELEMENT_SELECTED', element: null }, '*');
    }
  });

  /* Height reporter — also throttled. Mutations from rapid edits used to fire
     this dozens of times per second. */
  var lastReportedHeight = 0;
  var heightTimer = null;
  function doReportHeight() {
    var h = Math.max(
      document.documentElement.scrollHeight || 0,
      document.body ? document.body.scrollHeight : 0
    );
    if (h > 0 && Math.abs(h - lastReportedHeight) >= 4) {
      lastReportedHeight = h;
      window.parent.postMessage({ type: 'CONTENT_HEIGHT', height: h }, '*');
    }
  }
  function reportHeight() {
    if (heightTimer) return;
    heightTimer = setTimeout(function() {
      heightTimer = null;
      doReportHeight();
    }, 200);
  }
  setTimeout(doReportHeight, 100);
  setTimeout(doReportHeight, 500);
  setTimeout(doReportHeight, 1500);

  if (typeof ResizeObserver !== 'undefined' && document.body) {
    new ResizeObserver(function() { reportHeight(); }).observe(document.body);
  }
  if (typeof MutationObserver !== 'undefined' && document.body) {
    new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        // Skip our own selection-state attribute toggles
        if (m.type === 'attributes' && (m.attributeName === SELECTED || m.attributeName === HOVERED)) continue;
        reportHeight();
        return;
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true });
  }
  window.addEventListener('load', function() { setTimeout(doReportHeight, 200); });

  /**
   * Serialize the document with all editor state stripped.
   * Returns clean HTML matching what the user "sees as their design".
   *
   * Also self-heals legacy contamination: scripts/styles from earlier bridge
   * versions that may have leaked into saved HTML before this rewrite.
   */
  function getCleanHtml() {
    // 1. Strip selection/hover attributes
    var selEls = document.querySelectorAll('[' + SELECTED + ']');
    var hovEls = document.querySelectorAll('[' + HOVERED + ']');
    for (var a = 0; a < selEls.length; a++) selEls[a].removeAttribute(SELECTED);
    for (var b = 0; b < hovEls.length; b++) hovEls[b].removeAttribute(HOVERED);

    // 2. Detach v2 bridge artifacts
    var detached = [];
    var bridgeNodes = document.querySelectorAll('[data-wf-bridge],script[data-wf-bridge-script]');
    for (var c = 0; c < bridgeNodes.length; c++) {
      var node = bridgeNodes[c];
      detached.push({ node: node, parent: node.parentNode, next: node.nextSibling });
      node.parentNode && node.parentNode.removeChild(node);
    }

    // 3. Detach LEGACY contamination — any <script> that contains the old guard
    //    or any inline outline style left by the previous bridge version.
    var allScripts = document.querySelectorAll('script');
    for (var s = 0; s < allScripts.length; s++) {
      var sc = allScripts[s];
      var txt = sc.textContent || '';
      if (txt.indexOf('__editorBridge') !== -1 || txt.indexOf('EDITOR_BRIDGE') !== -1) {
        detached.push({ node: sc, parent: sc.parentNode, next: sc.nextSibling });
        sc.parentNode && sc.parentNode.removeChild(sc);
      }
    }
    // Clear baked-in outline styles from legacy selection
    var inlineOutlined = document.querySelectorAll('[style*="outline"]');
    var styleSaves = [];
    for (var o = 0; o < inlineOutlined.length; o++) {
      var oe = inlineOutlined[o];
      var origStyle = oe.getAttribute('style') || '';
      var cleaned = origStyle
        .replace(/outline\\s*:[^;]*;?/gi, '')
        .replace(/outline-offset\\s*:[^;]*;?/gi, '')
        .replace(/\\s+/g, ' ')
        .trim();
      styleSaves.push({ el: oe, orig: origStyle });
      if (cleaned) oe.setAttribute('style', cleaned);
      else oe.removeAttribute('style');
    }

    var html = '<!DOCTYPE html>' + document.documentElement.outerHTML;

    // 4. Restore everything
    for (var d = 0; d < detached.length; d++) {
      var item = detached[d];
      if (item.parent) item.parent.insertBefore(item.node, item.next || null);
    }
    for (var ss = 0; ss < styleSaves.length; ss++) {
      styleSaves[ss].el.setAttribute('style', styleSaves[ss].orig);
    }
    if (selected) selected.setAttribute(SELECTED, '');
    if (hovered && hovered !== selected) hovered.setAttribute(HOVERED, '');
    return html;
  }

  /**
   * Emit an HTML_UPDATED message. The seq lets the parent skip its own echoes
   * via id (not fragile string-equality).
   *
   * Throttled: outerHTML serialization on a large screen is expensive (10-50ms).
   * Rapid edits (color picker drag, slider drag) used to fire 30+ per second,
   * which blew up React render time AND piled up echo entries that desynced the
   * iframe state. Throttle to ~120ms with leading + trailing edge so user sees
   * immediate visual feedback (style is set on DOM live) while serialization
   * stays bounded.
   */
  var seq = 0;
  var THROTTLE_MS = 120;
  var pendingKey = null;
  var pendingTimer = null;
  var lastEmitAt = 0;

  function doEmit(editKey) {
    seq++;
    lastEmitAt = Date.now();
    window.parent.postMessage({
      type: 'HTML_UPDATED',
      html: getCleanHtml(),
      seq: seq,
      editKey: editKey || null
    }, '*');
  }

  /* After an edit settles, re-describe the selected element so the panel
     shows REAL computed values (not its optimistic guesses). Debounced to the
     trailing edge so slider drags don't flood the parent. */
  var refreshTimer = null;
  function scheduleSelectionRefresh(el) {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function() {
      refreshTimer = null;
      var target = selected || el;
      if (target && target.isConnected) {
        window.parent.postMessage({ type: 'ELEMENT_SELECTED', element: describe(target) }, '*');
      }
    }, 180);
  }

  function emitHtmlUpdated(editKey) {
    var now = Date.now();
    var since = now - lastEmitAt;
    if (since >= THROTTLE_MS && pendingTimer === null) {
      // Leading edge — emit immediately
      doEmit(editKey);
      return;
    }
    // Coalesce: remember the latest editKey, emit on the trailing edge
    pendingKey = editKey;
    if (pendingTimer === null) {
      pendingTimer = setTimeout(function() {
        pendingTimer = null;
        var key = pendingKey;
        pendingKey = null;
        doEmit(key);
      }, Math.max(THROTTLE_MS - since, 16));
    }
  }

  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;

    // Live design-system CSS variable update. We write to BOTH:
    //   1. documentElement.style (instant — wins specificity battles)
    //   2. A persistent <style id="ds-live-override"> that survives serialization
    //      so getCleanHtml() captures the latest state without HTML rewrites.
    if (e.data.type === 'UPDATE_CSS_VARS') {
      var vars = e.data.vars;
      for (var key in vars) document.documentElement.style.setProperty(key, vars[key]);

      // Build a persistent <style> tag — NOT marked data-wf-bridge so it's kept on save.
      var persisted = document.getElementById('ds-live-override');
      if (!persisted) {
        persisted = document.createElement('style');
        persisted.id = 'ds-live-override';
        (document.head || document.documentElement).appendChild(persisted);
      }
      var rootCss = ':root{';
      for (var k in vars) rootCss += k + ':' + vars[k] + ';';
      rootCss += '}';
      var fontCss = '';
      if (e.data.bodyFont) {
        fontCss = 'body,html{font-family:' + e.data.bodyFont + ' !important;}*:not(code):not(pre):not(.mono){font-family:' + e.data.bodyFont + ' !important;}';
      }
      persisted.textContent = rootCss + fontCss;

      if (e.data.bodyFont) {
        var fontName = e.data.bodyFont.split(',')[0].trim();
        var encoded = encodeURIComponent(fontName);
        var fontUrl = 'https://fonts.googleapis.com/css2?family=' + encoded + ':wght@300;400;500;600;700&display=swap';
        var existing = document.getElementById('ds-live-font-link');
        if (existing) {
          existing.setAttribute('href', fontUrl);
        } else {
          var link = document.createElement('link');
          link.id = 'ds-live-font-link';
          link.rel = 'stylesheet';
          link.href = fontUrl;
          (document.head || document.documentElement).appendChild(link);
        }
      }
      return;
    }

    // Re-apply visual selection after iframe srcdoc reload — wf-id is the
    // durable key, xpath the fallback.
    if (e.data.type === 'RESTORE_SELECTION') {
      selectedXPath = e.data.xpath || null;
      var restored = findTarget(e.data);
      if (restored) applySelection(restored);
      else reSelectFromXPath();
      return;
    }

    // Capture current HTML (with live CSS-var/font state applied). Used by the
    // Design System panel close so we persist the latest visual state without
    // having to rewrite HTML in the reducer (which would reload the iframe).
    if (e.data.type === 'EMIT_HTML') {
      emitHtmlUpdated(e.data.editKey || 'ds-sync');
      return;
    }

    // Climb to parent of current selection (skipping html/body)
    if (e.data.type === 'SELECT_PARENT') {
      if (!selected) return;
      var p = selected.parentElement;
      if (!p || isRoot(p)) return;
      applySelection(p);
      window.parent.postMessage({ type: 'ELEMENT_SELECTED', element: describe(p) }, '*');
      return;
    }

    // Delete the addressed element entirely (undo restores it parent-side).
    if (e.data.type === 'DELETE_ELEMENT') {
      var del = findTarget(e.data);
      if (!del || isRoot(del)) { notifyTargetMissing(e.data); return; }
      if (del === selected || (selected && del.contains(selected))) {
        selected = null;
        selectedXPath = null;
      }
      if (hovered && (del === hovered || del.contains(hovered))) hovered = null;
      del.parentNode && del.parentNode.removeChild(del);
      window.parent.postMessage({ type: 'ELEMENT_SELECTED', element: null }, '*');
      emitHtmlUpdated('delete');
      return;
    }

    // Class operations
    if (e.data.type === 'SET_CLASSES') {
      var ne = findTarget(e.data); if (!ne) { notifyTargetMissing(e.data); return; }
      ne.className = e.data.className;
      emitHtmlUpdated((e.data.wfId || e.data.xpath) + ':class');
      scheduleSelectionRefresh(ne);
      return;
    }
    if (e.data.type === 'TOGGLE_CLASS') {
      var te = findTarget(e.data); if (!te) { notifyTargetMissing(e.data); return; }
      var cls = (e.data.className || '').trim(); if (!cls) return;
      var list = cls.split(/\\s+/);
      var mode = e.data.mode || 'toggle';
      for (var i = 0; i < list.length; i++) {
        if (mode === 'add') te.classList.add(list[i]);
        else if (mode === 'remove') te.classList.remove(list[i]);
        else te.classList.toggle(list[i]);
      }
      emitHtmlUpdated((e.data.wfId || e.data.xpath) + ':class');
      scheduleSelectionRefresh(te);
      return;
    }
    if (e.data.type === 'REPLACE_CLASS_GROUP') {
      var re = findTarget(e.data); if (!re) { notifyTargetMissing(e.data); return; }
      var prefixes = e.data.prefixes || [];
      var newCls = e.data.newClass || '';
      var current = (re.className || '').split(/\\s+/).filter(function(c) {
        for (var p = 0; p < prefixes.length; p++) {
          if (c === prefixes[p] || c.indexOf(prefixes[p]) === 0) return false;
        }
        return !!c;
      });
      if (newCls) current.push(newCls);
      re.className = current.join(' ');
      emitHtmlUpdated((e.data.wfId || e.data.xpath) + ':class');
      scheduleSelectionRefresh(re);
      return;
    }

    if (e.data.type === 'APPLY_EDIT') {
      var d = e.data;
      var el = findTarget(d); if (!el) { notifyTargetMissing(d); return; }
      var editKey = (d.wfId || d.xpath) + ':' + d.property;

      if (d.property === 'textContent') {
        setDirectText(el, d.value);
        emitHtmlUpdated(editKey);
        scheduleSelectionRefresh(el);
        return;
      }

      if (d.property === 'opacity' && (d.value === '' || d.value === '1' || d.value === '1.0')) {
        var cls = (el.className || '').split(/\\s+/).filter(function(c) { return c.indexOf('opacity-') !== 0; });
        el.className = cls.join(' ');
        el.style.removeProperty('opacity');
        emitHtmlUpdated(editKey);
        scheduleSelectionRefresh(el);
        return;
      }

      // Map to Tailwind classes
      var tw = '';
      var p = d.property;
      var v = d.value;

      var SIZE_CLASS = /^text-(xs|sm|base|lg|xl|[2-9]xl)$/;
      var SIZE_ARB = /^text-\\[[0-9.]+(px|em|rem)\\]$/;
      var ALIGN_CLASS = /^text-(left|center|right|justify)$/;
      var WEIGHT_CLASS = /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/;
      var WEIGHT_ARB = /^font-\\[[0-9]+\\]$/;
      var BORDER_WIDTH_CLASS = /^border(-[0248])?$/;
      var BORDER_WIDTH_ARB = /^border-\\[[0-9.]+(px|rem)\\]$/;
      var BORDER_STYLE_CLASS = /^border-(solid|dashed|dotted|double|none|hidden)$/;
      var BORDER_SIDE_CLASS = /^border-(t|r|b|l|x|y)(-|$)/;

      var toRemove = function(c) {
        if (p === 'backgroundColor') return c.indexOf('bg-') === 0;
        if (p === 'color') return c.indexOf('text-') === 0 && !SIZE_CLASS.test(c) && !SIZE_ARB.test(c) && !ALIGN_CLASS.test(c);
        if (p === 'fontSize') return SIZE_CLASS.test(c) || SIZE_ARB.test(c);
        if (p === 'fontWeight') return WEIGHT_CLASS.test(c) || WEIGHT_ARB.test(c);
        if (p === 'textAlign') return ALIGN_CLASS.test(c);
        if (p === 'lineHeight') return c.indexOf('leading-') === 0;
        if (p === 'letterSpacing') return c.indexOf('tracking-') === 0;
        if (p === 'borderRadius') return c === 'rounded' || c.indexOf('rounded-') === 0;
        if (p === 'borderWidth') return BORDER_WIDTH_CLASS.test(c) || BORDER_WIDTH_ARB.test(c);
        if (p === 'borderStyle') return BORDER_STYLE_CLASS.test(c);
        if (p === 'borderColor') return c.indexOf('border-') === 0 && !BORDER_WIDTH_CLASS.test(c) && !BORDER_WIDTH_ARB.test(c) && !BORDER_STYLE_CLASS.test(c) && !BORDER_SIDE_CLASS.test(c);
        if (p === 'width') return c === 'w' || c.indexOf('w-') === 0;
        if (p === 'height') return c === 'h' || c.indexOf('h-') === 0;
        if (p === 'display') return c === 'block' || c === 'flex' || c === 'inline-flex' || c === 'grid' || c === 'hidden' || c === 'inline-block';
        if (p === 'flexDirection') return c === 'flex-row' || c === 'flex-col' || c === 'flex-row-reverse' || c === 'flex-col-reverse';
        if (p === 'alignItems') return c.indexOf('items-') === 0;
        if (p === 'justifyContent') return c.indexOf('justify-') === 0;
        if (p === 'gap') return c.indexOf('gap-') === 0;
        if (p === 'opacity') return c.indexOf('opacity-') === 0;
        if (p.indexOf('padding') === 0 || p.indexOf('margin') === 0) {
          var prefix = p.indexOf('padding') === 0 ? 'p' : 'm';
          if (p.indexOf('Top') > 0) prefix += 't';
          else if (p.indexOf('Right') > 0) prefix += 'r';
          else if (p.indexOf('Bottom') > 0) prefix += 'b';
          else if (p.indexOf('Left') > 0) prefix += 'l';
          return c === prefix || c.indexOf(prefix + '-') === 0;
        }
        return false;
      };

      if (p === 'backgroundColor') tw = 'bg-[' + v + ']';
      else if (p === 'color') tw = 'text-[' + v + ']';
      else if (p === 'fontSize') tw = 'text-[' + v + ']';
      else if (p === 'fontWeight') tw = 'font-[' + v + ']';
      else if (p === 'textAlign') tw = 'text-' + v;
      else if (p === 'lineHeight') tw = v === 'normal' ? 'leading-normal' : 'leading-[' + v + ']';
      else if (p === 'letterSpacing') tw = v === 'normal' ? 'tracking-normal' : 'tracking-[' + v + ']';
      else if (p === 'borderRadius') tw = 'rounded-[' + v + ']';
      else if (p === 'borderWidth') tw = 'border-[' + v + ']';
      else if (p === 'borderStyle') tw = 'border-' + v;
      else if (p === 'borderColor') tw = 'border-[' + v + ']';
      else if (p === 'width') tw = v === 'auto' ? 'w-auto' : 'w-[' + v + ']';
      else if (p === 'height') tw = v === 'auto' ? 'h-auto' : 'h-[' + v + ']';
      else if (p === 'display') tw = v;
      else if (p === 'flexDirection') tw = 'flex-' + v;
      else if (p === 'alignItems') tw = 'items-' + v.replace('flex-', '');
      else if (p === 'justifyContent') tw = 'justify-' + v.replace('flex-', '');
      else if (p === 'gap') tw = 'gap-[' + v + ']';
      else if (p === 'opacity') tw = 'opacity-[' + v + ']';
      else if (p.indexOf('padding') === 0 || p.indexOf('margin') === 0) {
        var pfx = p.indexOf('padding') === 0 ? 'p' : 'm';
        if (p.indexOf('Top') > 0) pfx += 't';
        else if (p.indexOf('Right') > 0) pfx += 'r';
        else if (p.indexOf('Bottom') > 0) pfx += 'b';
        else if (p.indexOf('Left') > 0) pfx += 'l';
        tw = pfx + '-[' + v + ']';
      }

      if (tw) {
        var classes = (el.className || '').split(/\\s+/);
        var next = [];
        for (var i = 0; i < classes.length; i++) {
          if (classes[i] && !toRemove(classes[i])) next.push(classes[i]);
        }
        next.push(tw);
        el.className = next.join(' ');
        // A width without a style renders nothing — make new borders visible.
        if (p === 'borderWidth' && parseFloat(v) > 0 && window.getComputedStyle(el).borderStyle === 'none') {
          el.classList.add('border-solid');
        }
      } else {
        el.style[p] = v;
      }

      emitHtmlUpdated(editKey);
      scheduleSelectionRefresh(el);
      return;
    }

    if (e.data.type === 'REMOVE_INLINE_STYLE') {
      var rmEl = findTarget(e.data); if (!rmEl) { notifyTargetMissing(e.data); return; }
      var props = e.data.properties || [];
      for (var p = 0; p < props.length; p++) rmEl.style.removeProperty(props[p]);
      if (!rmEl.getAttribute('style')) rmEl.removeAttribute('style');
      emitHtmlUpdated((e.data.wfId || e.data.xpath) + ':reset');
      scheduleSelectionRefresh(rmEl);
      return;
    }
  });
})();
`;
