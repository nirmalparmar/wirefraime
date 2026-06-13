"use client";

import { useRef, useEffect, useCallback } from "react";
import { EDITOR_BRIDGE_SCRIPT } from "@/lib/editor-bridge";
import type { SelectedElement } from "@/lib/store/use-workspace";

/* Lightweight script injected at the start of streaming. Forwards wheel
   events AND reports content height as the iframe fills in — so the parent
   knows when real content has started rendering and can hide the shimmer. */
const WHEEL_FORWARDER_SCRIPT = `<script>
(function(){
  // window + capture + preventDefault: see editor-bridge.ts. Runs before any
  // content wheel handler can stopPropagation() and let ctrl/⌘+wheel slip
  // through to the browser as a full-page zoom.
  window.addEventListener('wheel', function(e) {
    e.preventDefault();
    window.parent.postMessage({
      type: 'IFRAME_WHEEL',
      deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode,
      shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey,
      clientX: e.clientX, clientY: e.clientY,
    }, '*');
  }, { passive: false, capture: true });

  var lastH = 0;
  function reportH(){
    var h = Math.max(
      document.documentElement && document.documentElement.scrollHeight || 0,
      document.body && document.body.scrollHeight || 0
    );
    if (h > 0 && Math.abs(h - lastH) >= 8) {
      lastH = h;
      window.parent.postMessage({ type: 'CONTENT_HEIGHT', height: h }, '*');
    }
  }
  // Poll a few times per second during stream — cheap, bounded, and our
  // sole height signal until the full editor bridge takes over.
  setInterval(reportH, 250);
})();
<\/script>`;

/* Strip legacy bridge artifacts that may have been baked into screen HTML
   by earlier versions of the bridge. The cleaned doc is what we load into
   the iframe — the new bridge will be injected fresh on load. */
function stripLegacyBridge(html: string): string {
  return html
    // Any inline <script> containing the old guard string
    .replace(/<script\b[^>]*>[\s\S]*?__editorBridge[\s\S]*?<\/script>/gi, "")
    // Inline outline styles left by legacy selection (style="...outline: ...")
    .replace(/(\sstyle="[^"]*?)\s*outline\s*:[^;"]*;?/gi, "$1")
    .replace(/(\sstyle="[^"]*?)\s*outline-offset\s*:[^;"]*;?/gi, "$1")
    // Empty style attributes after cleanup
    .replace(/\sstyle="\s*"/gi, "");
}

interface LiveIframeProps {
  screenId: string;
  html: string;
  isStreaming: boolean;
  streamChunks: string[];
  width?: number;
  height?: number;
  onElementSelected?: (element: SelectedElement | null) => void;
  onHtmlUpdated?: (html: string, editKey?: string | null) => void;
  onIframeMount?: (el: HTMLIFrameElement | null) => void;
  onContentHeight?: (height: number) => void;
}

export function LiveIframe({
  screenId,
  html,
  isStreaming,
  streamChunks,
  width = 1440,
  height = 900,
  onElementSelected,
  onHtmlUpdated,
  onIframeMount,
  onContentHeight,
}: LiveIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isStreamingRef = useRef(isStreaming);
  const writtenChunksRef = useRef(0);
  const docOpenedRef = useRef(false);

  /* When the iframe emits HTML_UPDATED, the parent dispatches the same HTML
     back through props. We track the EXACT html strings we self-emitted in a
     small ring buffer; if the incoming html prop matches one, skip srcdoc
     reload (preserves scroll/selection). String match avoids stale-entry bugs
     that count-based tracking suffered from when React batched renders. */
  const recentSelfEditsRef = useRef<string[]>([]);
  const SELF_EDIT_CACHE = 6;
  const lastSelectedRef = useRef<{ xpath: string | null; wfId: string | null }>({
    xpath: null,
    wfId: null,
  });

  const onIframeMountRef = useRef(onIframeMount);
  const onContentHeightRef = useRef(onContentHeight);
  onIframeMountRef.current = onIframeMount;
  onContentHeightRef.current = onContentHeight;

  useEffect(() => {
    onIframeMountRef.current?.(iframeRef.current);
    return () => { onIframeMountRef.current?.(null); };
  }, []);

  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (!e.data || typeof e.data.type !== "string") return;
      if (e.source !== iframeRef.current?.contentWindow) return;

      if (e.data.type === "ELEMENT_SELECTED") {
        lastSelectedRef.current = {
          xpath: e.data.element?.xpath ?? null,
          wfId: e.data.element?.wfId ?? null,
        };
        onElementSelected?.(e.data.element);
      } else if (e.data.type === "HTML_UPDATED") {
        const html = e.data.html as string;
        const cache = recentSelfEditsRef.current;
        cache.push(html);
        if (cache.length > SELF_EDIT_CACHE) cache.shift();
        onHtmlUpdated?.(html, e.data.editKey ?? null);
      } else if (e.data.type === "CONTENT_HEIGHT") {
        const h = e.data.height as number;
        if (h > 0) onContentHeightRef.current?.(h);
      }
    },
    [onElementSelected, onHtmlUpdated]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  /* Streaming writer: append new chunks via document.write */
  useEffect(() => {
    if (!isStreaming) return;
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    if (!docOpenedRef.current && streamChunks.length > 0) {
      try {
        doc.open();
        doc.write(WHEEL_FORWARDER_SCRIPT);
        docOpenedRef.current = true;
      } catch { /* ignored */ }
    }
    for (let i = writtenChunksRef.current; i < streamChunks.length; i++) {
      try { doc.write(streamChunks[i]); } catch { /* ignored */ }
    }
    writtenChunksRef.current = streamChunks.length;
  }, [isStreaming, streamChunks]);

  /* Completion: close streaming doc, set srcdoc — skip if this is a self-edit echo */
  useEffect(() => {
    if (isStreaming) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (docOpenedRef.current) {
      try { iframe.contentDocument?.close(); } catch { /* ignored */ }
      docOpenedRef.current = false;
      writtenChunksRef.current = 0;
    }

    if (!html) return;

    // If this html exactly matches one we recently self-emitted, skip the
    // srcdoc reload to preserve scroll/selection. Otherwise it's a real
    // external update (chat edit, undo, etc.) — reload.
    const cache = recentSelfEditsRef.current;
    const idx = cache.indexOf(html);
    if (idx !== -1) {
      cache.splice(idx, 1);
      return;
    }

    iframe.srcdoc = stripLegacyBridge(html);
  }, [isStreaming, html]);

  /* Inject the full editor bridge once each iframe load completes. We tag the
     script with data-wf-bridge-script so getCleanHtml() can strip it later. */
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function onLoad() {
      if (isStreamingRef.current) return;
      try {
        const doc = iframe!.contentDocument;
        if (!doc?.body) return;
        // Don't double-inject (e.g. when re-binding selection after reload)
        if (doc.querySelector("script[data-wf-bridge-script]")) return;
        const script = doc.createElement("script");
        script.setAttribute("data-wf-bridge-script", "");
        script.textContent = EDITOR_BRIDGE_SCRIPT;
        doc.body.appendChild(script);

        // Restore selection visually if we had one before reload
        if (lastSelectedRef.current.xpath || lastSelectedRef.current.wfId) {
          requestAnimationFrame(() => {
            iframe?.contentWindow?.postMessage(
              {
                type: "RESTORE_SELECTION",
                xpath: lastSelectedRef.current.xpath,
                wfId: lastSelectedRef.current.wfId,
              },
              "*"
            );
          });
        }
      } catch { /* cross-origin / closed */ }
    }
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, []);

  return (
    <div
      style={{
        width,
        height,
        overflow: "hidden",
        display: "block",
        // Clipping kept (paint containment); no translateZ here — the parent
        // card is the single promoted clip layer. Fewer stacked layers = no
        // border flicker, and clipping prevents a streaming screen from
        // painting over its neighbours.
        contain: "layout style paint",
      }}
    >
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin"
        style={{
          width,
          height,
          border: "none",
          display: "block",
        }}
        title={`Screen ${screenId}`}
      />
    </div>
  );
}

export function sendEditToIframe(
  iframe: HTMLIFrameElement | null,
  xpath: string,
  property: string,
  value: string
) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage({ type: "APPLY_EDIT", xpath, property, value }, "*");
}
