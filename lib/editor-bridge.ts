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

  // Scoped style: outlines via attribute selector. Tagged so we can strip on save.
  var bridgeStyle = document.createElement('style');
  bridgeStyle.setAttribute('data-wf-bridge', '');
  bridgeStyle.textContent =
    'html,body{overflow:hidden!important;height:auto!important;min-height:0!important;}' +
    '[data-wf-hovered]:not([data-wf-selected]){outline:2px solid rgba(13,153,255,.45)!important;outline-offset:-2px!important;cursor:pointer!important;}' +
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

  function describe(el) {
    var cs = window.getComputedStyle(el);
    return {
      xpath: getXPath(el),
      tagName: el.tagName.toLowerCase(),
      className: el.className || '',
      textContent: el.childNodes.length === 1 && el.childNodes[0].nodeType === 3
        ? (el.textContent || '')
        : '',
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

  // Forward wheel events to parent for canvas pan/zoom
  document.addEventListener('wheel', function(e) {
    e.preventDefault();
    window.parent.postMessage({
      type: 'IFRAME_WHEEL',
      deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode,
      shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey,
      clientX: e.clientX, clientY: e.clientY
    }, '*');
  }, { passive: false });

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

    // Re-apply visual selection from xpath (used after iframe srcdoc reload)
    if (e.data.type === 'RESTORE_SELECTION') {
      selectedXPath = e.data.xpath || null;
      reSelectFromXPath();
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

    // Class operations
    if (e.data.type === 'SET_CLASSES') {
      var ne = findByXPath(e.data.xpath); if (!ne) return;
      ne.className = e.data.className;
      emitHtmlUpdated(e.data.xpath + ':class'); return;
    }
    if (e.data.type === 'TOGGLE_CLASS') {
      var te = findByXPath(e.data.xpath); if (!te) return;
      var cls = (e.data.className || '').trim(); if (!cls) return;
      var list = cls.split(/\\s+/);
      var mode = e.data.mode || 'toggle';
      for (var i = 0; i < list.length; i++) {
        if (mode === 'add') te.classList.add(list[i]);
        else if (mode === 'remove') te.classList.remove(list[i]);
        else te.classList.toggle(list[i]);
      }
      emitHtmlUpdated(e.data.xpath + ':class'); return;
    }
    if (e.data.type === 'REPLACE_CLASS_GROUP') {
      var re = findByXPath(e.data.xpath); if (!re) return;
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
      emitHtmlUpdated(e.data.xpath + ':class'); return;
    }

    if (e.data.type === 'APPLY_EDIT') {
      var d = e.data;
      var el = findByXPath(d.xpath); if (!el) return;

      if (d.property === 'textContent') {
        el.textContent = d.value;
      } else if (d.property === 'opacity' && (d.value === '' || d.value === '1' || d.value === '1.0')) {
        el.style.removeProperty('opacity');
      } else {
        el.style[d.property] = d.value;
      }
      emitHtmlUpdated(d.xpath + ':' + d.property);
      return;
    }

    if (e.data.type === 'REMOVE_INLINE_STYLE') {
      var rmEl = findByXPath(e.data.xpath); if (!rmEl) return;
      var props = e.data.properties || [];
      for (var p = 0; p < props.length; p++) rmEl.style.removeProperty(props[p]);
      if (!rmEl.getAttribute('style')) rmEl.removeAttribute('style');
      emitHtmlUpdated(e.data.xpath + ':reset'); return;
    }
  });
})();
`;
