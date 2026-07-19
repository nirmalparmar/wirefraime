"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const WIDTHS = { desktop: 1440, mobile: 390 } as const;

export function PreviewClient({
  examples,
  themes,
  example,
  themeId,
  doc,
}: {
  examples: string[];
  themes: { id: string; name: string }[];
  example: string;
  themeId: string;
  doc: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [width, setWidth] = useState<keyof typeof WIDTHS>("desktop");

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(search.toString());
    next.set(key, value);
    router.replace(`/dev/preview?${next.toString()}`);
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-100">
      <div className="flex flex-wrap items-center gap-4 border-b border-neutral-200 bg-white px-4 py-2 text-sm">
        <span className="font-semibold">ds preview</span>
        <label className="flex items-center gap-2">
          Example
          <select
            className="rounded border border-neutral-300 px-2 py-1"
            value={example}
            onChange={(e) => setParam("example", e.target.value)}
          >
            {examples.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Theme
          <select
            className="rounded border border-neutral-300 px-2 py-1"
            value={themeId}
            onChange={(e) => setParam("theme", e.target.value)}
          >
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex gap-1">
          {(Object.keys(WIDTHS) as (keyof typeof WIDTHS)[]).map((w) => (
            <button
              key={w}
              onClick={() => setWidth(w)}
              className={`rounded px-2 py-1 ${
                width === w ? "bg-neutral-900 text-white" : "bg-neutral-100"
              }`}
            >
              {w} · {WIDTHS[w]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <iframe
          title="ds preview"
          sandbox=""
          srcDoc={doc}
          style={{ width: WIDTHS[width] }}
          className="mx-auto h-full min-h-[900px] rounded-lg border border-neutral-300 bg-white shadow-sm"
        />
      </div>
    </div>
  );
}
