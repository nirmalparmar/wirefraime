/**
 * Editor bridge script injected into iframes.
 * Handles hover outlines, click selection, and edit commands via postMessage.
 */
export const EDITOR_BRIDGE_SCRIPT = `
(function() {
  if (window.__editorBridge) return;
  window.__editorBridge = true;

  // Prevent internal scroll — design tool shows full content length
  var noScrollStyle = document.createElement('style');
  noScrollStyle.textContent = 'html, body { overflow: hidden !important; height: auto !important; min-height: 0 !important; }';
  (document.head || document.documentElement).appendChild(noScrollStyle);

  var hovered = null;
  var selected = null;

  function getXPath(el) {
    if (el.id) return '//*[@id="' + el.id + '"]';
    if (el === document.body) return '/html/body';
    if (!el.parentNode) return '';
    var siblings = el.parentNode.children;
    var tag = el.tagName.toLowerCase();
    var idx = 0;
    for (var i = 0; i < siblings.length; i++) {
      if (siblings[i].tagName === el.tagName) idx++;
      if (siblings[i] === el) break;
    }
    return getXPath(el.parentNode) + '/' + tag + '[' + idx + ']';
  }

  function findByXPath(xpath) {
    try {
      var result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue;
    } catch(e) { return null; }
  }

  function setOutline(el, color, width) {
    if (!el) return;
    el.style.outline = width + 'px solid ' + color;
    el.style.outlineOffset = '-' + width + 'px';
  }

  function clearOutline(el) {
    if (!el) return;
    el.style.outline = '';
    el.style.outlineOffset = '';
  }

  document.addEventListener('mouseover', function(e) {
    var el = e.target;
    if (el === document.body || el === document.documentElement) return;
    if (el === selected) return;
    if (hovered && hovered !== el) clearOutline(hovered);
    hovered = el;
    setOutline(el, 'rgba(99,102,241,0.5)', 2);
  }, true);

  document.addEventListener('mouseout', function(e) {
    if (hovered && hovered !== selected) {
      clearOutline(hovered);
      hovered = null;
    }
  }, true);

  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    var el = e.target;
    if (el === document.body || el === document.documentElement) {
      if (selected) clearOutline(selected);
      selected = null;
      window.parent.postMessage({ type: 'ELEMENT_SELECTED', element: null }, '*');
      return;
    }

    if (selected && selected !== el) clearOutline(selected);
    selected = el;
    setOutline(el, 'rgba(99,102,241,0.8)', 2);

    var cs = window.getComputedStyle(el);
    window.parent.postMessage({
      type: 'ELEMENT_SELECTED',
      element: {
        xpath: getXPath(el),
        tagName: el.tagName.toLowerCase(),
        textContent: el.childNodes.length === 1 && el.childNodes[0].nodeType === 3
          ? el.textContent || ''
          : '',
        styles: {
          color: cs.color,
          backgroundColor: cs.backgroundColor,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          fontFamily: cs.fontFamily,
          padding: cs.padding,
          paddingTop: cs.paddingTop,
          paddingRight: cs.paddingRight,
          paddingBottom: cs.paddingBottom,
          paddingLeft: cs.paddingLeft,
          margin: cs.margin,
          marginTop: cs.marginTop,
          marginRight: cs.marginRight,
          marginBottom: cs.marginBottom,
          marginLeft: cs.marginLeft,
          borderRadius: cs.borderRadius,
          borderWidth: cs.borderWidth,
          borderColor: cs.borderColor,
          borderStyle: cs.borderStyle,
          width: cs.width,
          height: cs.height,
          opacity: cs.opacity,
          textAlign: cs.textAlign,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
          textDecoration: cs.textDecoration,
          display: cs.display,
          flexDirection: cs.flexDirection,
          alignItems: cs.alignItems,
          justifyContent: cs.justifyContent,
          gap: cs.gap,
          boxShadow: cs.boxShadow
        }
      }
    }, '*');
  }, true);

  // Forward ALL wheel events to parent for canvas pan/zoom (screens are full-height, no internal scroll)
  document.addEventListener('wheel', function(e) {
    e.preventDefault();
    window.parent.postMessage({
      type: 'IFRAME_WHEEL',
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      deltaMode: e.deltaMode,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      clientX: e.clientX,
      clientY: e.clientY
    }, '*');
  }, { passive: false });

  // Report content height to parent
  function reportHeight() {
    var h = Math.max(
      document.documentElement.scrollHeight || 0,
      document.body ? document.body.scrollHeight : 0
    );
    if (h > 0) {
      window.parent.postMessage({ type: 'CONTENT_HEIGHT', height: h }, '*');
    }
  }

  // Report after layout settles
  setTimeout(reportHeight, 100);
  setTimeout(reportHeight, 500);
  setTimeout(reportHeight, 1500);

  // Report on any resize / DOM mutation
  if (typeof ResizeObserver !== 'undefined' && document.body) {
    new ResizeObserver(function() {
      setTimeout(reportHeight, 50);
    }).observe(document.body);
  }
  if (typeof MutationObserver !== 'undefined' && document.body) {
    new MutationObserver(function() {
      setTimeout(reportHeight, 100);
    }).observe(document.body, { childList: true, subtree: true });
  }

  // Also report when images/fonts load
  window.addEventListener('load', function() { setTimeout(reportHeight, 200); });

  window.addEventListener('message', function(e) {
    if (!e.data) return;

    // Live design system update — set CSS vars on :root + body font
    if (e.data.type === 'UPDATE_CSS_VARS') {
      var vars = e.data.vars;
      for (var key in vars) {
        document.documentElement.style.setProperty(key, vars[key]);
      }
      if (e.data.bodyFont) {
        // Force font override on ALL elements so inline font-family gets overridden
        var fontOverride = document.getElementById('__ds_font_override');
        if (!fontOverride) {
          fontOverride = document.createElement('style');
          fontOverride.id = '__ds_font_override';
          (document.head || document.documentElement).appendChild(fontOverride);
        }
        fontOverride.textContent = '*:not(code):not(pre):not(.mono){font-family:' + e.data.bodyFont + ' !important;}';

        // Update or add Google Fonts <link> for the new font
        var fontName = e.data.bodyFont.split(',')[0].trim();
        var encoded = encodeURIComponent(fontName);
        var fontUrl = 'https://fonts.googleapis.com/css2?family=' + encoded + ':wght@300;400;500;600;700&display=swap';
        var existing = document.getElementById('__ds_font_link');
        if (existing) {
          existing.setAttribute('href', fontUrl);
        } else {
          var link = document.createElement('link');
          link.id = '__ds_font_link';
          link.rel = 'stylesheet';
          link.href = fontUrl;
          (document.head || document.documentElement).appendChild(link);
        }
      }
      return;
    }

    if (e.data.type !== 'APPLY_EDIT') return;
    var d = e.data;
    var el = findByXPath(d.xpath);
    if (!el) return;

    if (d.property === 'textContent') {
      el.textContent = d.value;
    } else {
      el.style[d.property] = d.value;
    }

    // Serialize and send back
    var html = '<!DOCTYPE html>' + document.documentElement.outerHTML;
    window.parent.postMessage({ type: 'HTML_UPDATED', html: html }, '*');
  });
})();
`;
