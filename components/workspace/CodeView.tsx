"use client";

import { useState, useMemo } from "react";
import { useWorkspace } from "@/lib/store/use-workspace";
import { Button } from "@/components/ui/button";

/* ── Simple HTML pretty-printer (no external deps) ── */

function prettyPrintHtml(raw: string): string {
  if (!raw) return "";

  let result = "";
  let indent = 0;
  const tab = "  ";

  // Normalize: collapse whitespace between tags
  const html = raw.replace(/>\s+</g, ">\n<").replace(/\r\n/g, "\n");
  const lines = html.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Self-closing or void tags
    const isSelfClosing = /^<[^>]+\/>$/.test(line) || /^<(meta|link|br|hr|img|input|source|area|base|col|embed|wbr)\b[^>]*>$/i.test(line);
    const isClosing = /^<\//.test(line);
    const isOpening = /^<[a-zA-Z!]/.test(line) && !isClosing && !isSelfClosing;
    const isDoctype = /^<!DOCTYPE/i.test(line);

    if (isClosing) indent = Math.max(0, indent - 1);

    result += tab.repeat(indent) + line + "\n";

    if (isOpening && !isDoctype) indent++;
    // Don't indent after self-closing
  }

  return result.trimEnd();
}

/* ── Basic syntax highlighting via token spans ── */

interface Token {
  type: "tag" | "attr-name" | "attr-value" | "comment" | "text" | "doctype";
  text: string;
}

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Comment
    if (line.startsWith("<!--", i)) {
      const end = line.indexOf("-->", i);
      const closeIdx = end >= 0 ? end + 3 : line.length;
      tokens.push({ type: "comment", text: line.slice(i, closeIdx) });
      i = closeIdx;
      continue;
    }

    // DOCTYPE
    if (line.startsWith("<!DOCTYPE", i) || line.startsWith("<!doctype", i)) {
      const end = line.indexOf(">", i);
      const closeIdx = end >= 0 ? end + 1 : line.length;
      tokens.push({ type: "doctype", text: line.slice(i, closeIdx) });
      i = closeIdx;
      continue;
    }

    // Tag (opening or closing)
    if (line[i] === "<") {
      // Find the tag name portion
      const isClosing = line[i + 1] === "/";
      const nameStart = isClosing ? i + 2 : i + 1;
      let nameEnd = nameStart;
      while (nameEnd < line.length && /[a-zA-Z0-9-]/.test(line[nameEnd])) nameEnd++;

      // Output < or </  + tagName
      tokens.push({ type: "tag", text: line.slice(i, nameEnd) });
      i = nameEnd;

      // Parse attributes until >
      while (i < line.length && line[i] !== ">") {
        // Skip whitespace
        if (/\s/.test(line[i])) {
          tokens.push({ type: "text", text: line[i] });
          i++;
          continue;
        }

        // Attribute name
        let attrStart = i;
        while (i < line.length && line[i] !== "=" && line[i] !== ">" && !/\s/.test(line[i]) && line[i] !== "/") i++;
        if (i > attrStart) {
          tokens.push({ type: "attr-name", text: line.slice(attrStart, i) });
        }

        // = and value
        if (line[i] === "=") {
          tokens.push({ type: "text", text: "=" });
          i++;
          if (line[i] === '"' || line[i] === "'") {
            const quote = line[i];
            const valStart = i;
            i++;
            while (i < line.length && line[i] !== quote) i++;
            if (i < line.length) i++; // close quote
            tokens.push({ type: "attr-value", text: line.slice(valStart, i) });
          }
        }

        // Handle self-closing /
        if (line[i] === "/") {
          tokens.push({ type: "tag", text: "/" });
          i++;
        }
      }

      // Close >
      if (i < line.length && line[i] === ">") {
        tokens.push({ type: "tag", text: ">" });
        i++;
      }
      continue;
    }

    // Plain text
    let textStart = i;
    while (i < line.length && line[i] !== "<") i++;
    if (i > textStart) {
      tokens.push({ type: "text", text: line.slice(textStart, i) });
    }
  }

  return tokens;
}

const tokenColors: Record<Token["type"], string> = {
  tag: "text-rose-600 dark:text-rose-400",
  "attr-name": "text-amber-600 dark:text-amber-300",
  "attr-value": "text-emerald-600 dark:text-emerald-400",
  comment: "text-muted-foreground/50 italic",
  text: "text-foreground/80",
  doctype: "text-muted-foreground/50",
};

/* ── CodeView Component ── */

export function CodeView({ onClose }: { onClose: () => void }) {
  const { state } = useWorkspace();
  const [copied, setCopied] = useState(false);

  const activeScreen = state.app.screens.find((s) => s.id === state.activeScreenId) ?? state.app.screens[0] ?? null;

  const formatted = useMemo(() => {
    if (!activeScreen?.html) return "";
    return prettyPrintHtml(activeScreen.html);
  }, [activeScreen?.html]);

  const lines = useMemo(() => formatted.split("\n"), [formatted]);

  const tokenizedLines = useMemo(() => lines.map(tokenizeLine), [lines]);

  async function handleCopy() {
    if (!activeScreen?.html) return;
    try {
      await navigator.clipboard.writeText(activeScreen.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  if (!activeScreen) {
    return (
      <div className="absolute inset-y-0 right-0 z-40 flex w-1/2 items-center justify-center border-l border-border bg-muted">
        <span className="text-sm text-muted-foreground">No screen selected</span>
      </div>
    );
  }

  return (
    <div className="absolute inset-y-0 right-0 z-40 flex w-1/2 flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
            <path d="M9 3.5L12 7l-3 3.5" />
            <path d="M5 3.5L2 7l3 3.5" />
          </svg>
          <span className="text-xs font-medium text-foreground/80">{activeScreen.name}</span>
          <span className="text-[10px] text-muted-foreground/50">HTML</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7.5l3 3 5-6.5" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="5" width="7" height="7" rx="1" />
                  <path d="M9 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2" />
                </svg>
                Copy
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Code area */}
      <div className="flex-1 overflow-auto">
        <pre className="min-w-0 p-4 text-[12px] leading-5 font-mono">
          <code>
            {tokenizedLines.map((tokens, lineIdx) => (
              <div key={lineIdx} className="flex">
                <span className="mr-6 inline-block w-8 shrink-0 select-none text-right text-muted-foreground/40">
                  {lineIdx + 1}
                </span>
                <span className="flex-1 whitespace-pre-wrap break-all">
                  {tokens.map((token, tIdx) => (
                    <span key={tIdx} className={tokenColors[token.type]}>
                      {token.text}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
