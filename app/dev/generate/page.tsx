"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildPreviewDoc, DEFAULT_THEME, type Theme } from "@/lib/ds";

/**
 * Phase B minimal generation UI: prompt box → tabs appear from the plan
 * → previews fill in as screens stream. The real workspace ships in
 * Phase C; this page exists to exercise /api/ds/generate end to end.
 */

type ScreenState = {
  name: string;
  status: "pending" | "streaming" | "done";
  raw: string; // accumulated stream (unsanitized, preview only)
  html: string; // final sanitized fragment
  source?: string;
  warnings?: string[];
};

export default function DevGeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appName, setAppName] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [screens, setScreens] = useState<ScreenState[]>([]);
  const [active, setActive] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Throttle iframe re-renders while streaming.
  const [tick, setTick] = useState(0);
  const dirty = useRef(false);
  useEffect(() => {
    const t = setInterval(() => {
      if (dirty.current) {
        dirty.current = false;
        setTick((n) => n + 1);
      }
    }, 300);
    return () => clearInterval(t);
  }, []);

  const run = useCallback(async () => {
    if (running || prompt.trim().length < 3) return;
    setRunning(true);
    setError(null);
    setAppName(null);
    setScreens([]);
    setProjectId(null);
    setActive(0);

    try {
      const res = await fetch("/api/ds/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handle = (event: string, data: any) => {
        switch (event) {
          case "project":
            setProjectId(data.projectId);
            break;
          case "plan":
            setAppName(data.appName);
            setScreens(
              data.screens.map((s: { name: string }) => ({
                name: s.name,
                status: "pending",
                raw: "",
                html: "",
              })),
            );
            break;
          case "theme":
            setTheme(data.theme);
            break;
          case "screen_start":
            setScreens((prev) =>
              prev.map((s, i) => (i === data.index ? { ...s, status: "streaming" } : s)),
            );
            break;
          case "screen_chunk":
            setScreens((prev) =>
              prev.map((s, i) =>
                i === data.index ? { ...s, raw: s.raw + data.delta } : s,
              ),
            );
            dirty.current = true;
            break;
          case "screen_done":
            setScreens((prev) =>
              prev.map((s, i) =>
                i === data.index
                  ? {
                      ...s,
                      status: "done",
                      html: data.html,
                      source: data.source,
                      warnings: data.warnings,
                    }
                  : s,
              ),
            );
            dirty.current = true;
            break;
          case "error":
            setError(data.message);
            break;
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const eventMatch = /^event: (.+)$/m.exec(block);
          const dataMatch = /^data: (.+)$/m.exec(block);
          if (eventMatch && dataMatch) {
            try {
              handle(eventMatch[1], JSON.parse(dataMatch[1]));
            } catch {
              // skip malformed frame
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "generation failed");
    } finally {
      setRunning(false);
    }
  }, [prompt, running]);

  const current = screens[active];
  const previewFragment = current
    ? current.status === "done"
      ? current.html
      : current.raw
    : "";

  return (
    <div className="flex h-screen flex-col bg-neutral-100">
      <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3">
        <span className="text-sm font-semibold">ds generate</span>
        <input
          className="w-[480px] rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          placeholder="Describe an app… e.g. a CRM for a small law firm"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          disabled={running}
        />
        <button
          onClick={run}
          disabled={running || prompt.trim().length < 3}
          className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm text-white disabled:opacity-40"
        >
          {running ? "Generating…" : "Generate"}
        </button>
        {appName && <span className="text-sm text-neutral-500">→ {appName}</span>}
        {projectId && (
          <span className="font-mono text-xs text-neutral-400">{projectId}</span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {screens.length > 0 && (
        <div className="flex gap-1 border-b border-neutral-200 bg-white px-4 py-2">
          {screens.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`rounded-md px-3 py-1 text-sm ${
                i === active
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {s.name}
              {s.status === "pending" && " ·"}
              {s.status === "streaming" && " ⋯"}
              {s.status === "done" && (s.source === "placeholder" ? " ⚠" : " ✓")}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {current ? (
          <iframe
            key={`${active}-${tick}`}
            title={current.name}
            sandbox=""
            srcDoc={buildPreviewDoc(previewFragment, theme)}
            className="mx-auto h-full min-h-[800px] w-[1280px] max-w-full rounded-lg border border-neutral-300 bg-white shadow-sm"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            {running ? "Planning screens…" : "Enter a prompt to generate an app."}
          </div>
        )}
      </div>

      {current?.warnings && current.warnings.length > 0 && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 font-mono text-xs text-amber-800">
          {current.warnings.join(" — ")}
        </div>
      )}
    </div>
  );
}
