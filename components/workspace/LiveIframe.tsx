"use client";

import { useRef, useEffect, useCallback } from "react";
import { EDITOR_BRIDGE_SCRIPT } from "@/lib/editor-bridge";
import type { SelectedElement } from "@/lib/store/use-workspace";

interface LiveIframeProps {
  screenId: string;
  html: string;
  isStreaming: boolean;
  streamChunks: string[];
  width?: number;
  height?: number;
  onElementSelected?: (element: SelectedElement | null) => void;
  onHtmlUpdated?: (html: string) => void;
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
  const prevChunkCount = useRef(0);
  const isStreamingRef = useRef(isStreaming);
  const onIframeMountRef = useRef(onIframeMount);
  onIframeMountRef.current = onIframeMount;

  /**
   * Track whether the last html change came from an inline edit (APPLY_EDIT → HTML_UPDATED).
   * When true, the iframe DOM is already up-to-date — skip the srcdoc reload.
   */
  const selfEditHtmlRef = useRef<string | null>(null);

  // Notify parent of iframe mount/unmount
  useEffect(() => {
    onIframeMountRef.current?.(iframeRef.current);
    return () => { onIframeMountRef.current?.(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onContentHeightRef = useRef(onContentHeight);
  onContentHeightRef.current = onContentHeight;

  // Handle postMessage from iframe
  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (!e.data || typeof e.data.type !== "string") return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data.type === "ELEMENT_SELECTED") {
        onElementSelected?.(e.data.element);
      } else if (e.data.type === "HTML_UPDATED") {
        selfEditHtmlRef.current = e.data.html;
        onHtmlUpdated?.(e.data.html);
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

  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);

  // Streaming: write chunks via document.write
  // Inject a lightweight wheel forwarder at the start so canvas pan/zoom works during streaming
  const injectedWheelForwarder = useRef(false);
  useEffect(() => {
    if (!isStreaming) {
      injectedWheelForwarder.current = false;
      return;
    }
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    if (prevChunkCount.current === 0 && streamChunks.length > 0) {
      doc.open();
      // Inject wheel forwarder immediately so scroll works over streaming iframe
      if (!injectedWheelForwarder.current) {
        injectedWheelForwarder.current = true;
        try {
          doc.write(`<script>document.addEventListener('wheel',function(e){e.preventDefault();window.parent.postMessage({type:'IFRAME_WHEEL',deltaX:e.deltaX,deltaY:e.deltaY,deltaMode:e.deltaMode,shiftKey:e.shiftKey,ctrlKey:e.ctrlKey,altKey:e.altKey,metaKey:e.metaKey,clientX:e.clientX,clientY:e.clientY},'*');},{passive:false});<\/script>`);
        } catch { /* ignore */ }
      }
    }
    for (let i = prevChunkCount.current; i < streamChunks.length; i++) {
      try { doc.write(streamChunks[i]); } catch { /* ignore */ }
    }
    prevChunkCount.current = streamChunks.length;
  }, [isStreaming, streamChunks]);

  // Completed: set srcdoc (but skip if this was a self-edit)
  useEffect(() => {
    if (isStreaming) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (prevChunkCount.current > 0) {
      try { iframe.contentDocument?.close(); } catch { /* ignore */ }
      prevChunkCount.current = 0;
    }

    if (!html) return;

    // If this html update came from the iframe's own APPLY_EDIT, the DOM is already correct.
    // Skip the srcdoc reload to preserve selection, outline, scroll position, and editor bridge.
    if (selfEditHtmlRef.current === html) {
      selfEditHtmlRef.current = null;
      return;
    }
    selfEditHtmlRef.current = null;

    iframe.srcdoc = html;
  }, [isStreaming, html]);

  // Inject editor bridge on load
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    function onLoad() {
      if (isStreamingRef.current) return;
      try {
        const doc = iframe!.contentDocument;
        if (!doc?.body) return;
        const script = doc.createElement("script");
        script.textContent = EDITOR_BRIDGE_SCRIPT;
        doc.body.appendChild(script);
      } catch { /* cross-origin */ }
    }
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, []);

  return (
    <div style={{
      width, height, overflow: "hidden", display: "block",
      contain: "layout style paint",
      transform: "translateZ(0)",
    }}>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin"
        style={{
          width, height, border: "none", display: "block",
          backfaceVisibility: "hidden",
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
