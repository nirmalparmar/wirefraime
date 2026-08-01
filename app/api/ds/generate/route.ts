import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateDesign } from "@/lib/agent";
import { liveLlm } from "@/lib/llm";
import {
  createDsProject,
  insertDsScreen,
  setDsProjectStatus,
} from "@/lib/db/ds-queries";

/**
 * v2 generation endpoint (plan Phase B). Thin SSE adapter over the reasoning
 * agent (lib/agent/generateDesign): it maps the agent's typed events to SSE
 * frames and persists them. All generation logic lives in the agent.
 *
 * SSE events:
 *   project      { projectId }
 *   plan         { appName, screens[], source }
 *   theme        { theme }
 *   screen_start { index, name }
 *   screen_chunk { index, delta }      — raw stream for live preview only;
 *                                        the stored artifact is the sanitized
 *                                        html in screen_done
 *   screen_done  { index, screenId, name, html, source, warnings }
 *   done         { projectId }
 *   error        { message }
 *
 * NOTE: mounted at /api/ds/generate (not /api/generate) so the legacy
 * workspace keeps working until the Phase C/D cutover.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  let prompt = "";
  try {
    const body = await req.json();
    prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  } catch {
    // fall through to the length check
  }
  if (prompt.length < 3 || prompt.length > 2000) {
    return Response.json(
      { error: "prompt must be 3–2000 characters" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true; // client went away — keep generating & persisting
        }
      };

      let projectId: string | null = null;

      try {
        await generateDesign({
          prompt,
          llm: liveLlm,
          abortSignal: req.signal,
          onEvent: async (event) => {
            switch (event.type) {
              case "plan": {
                const project = await createDsProject({
                  clerkUserId: userId ?? null,
                  name: event.appName,
                  prompt,
                  theme: event.theme,
                });
                projectId = project.id;
                send("project", { projectId });
                send("plan", {
                  appName: event.appName,
                  screens: event.screens,
                  source: event.source,
                });
                send("theme", { theme: event.theme });
                break;
              }
              case "screen_start":
                send("screen_start", { index: event.index, name: event.screen.name });
                break;
              case "screen_chunk":
                send("screen_chunk", { index: event.index, delta: event.delta });
                break;
              case "screen_done": {
                if (!projectId) break; // unreachable: plan always fires first
                const row = await insertDsScreen({
                  projectId,
                  name: event.screen.name,
                  purpose: event.screen.purpose,
                  html: event.html,
                  source: event.source,
                  sortOrder: event.index,
                });
                if (event.warnings.length > 0) {
                  console.warn(`[generate] "${event.screen.name}":`, event.warnings);
                }
                send("screen_done", {
                  index: event.index,
                  screenId: row.id,
                  name: event.screen.name,
                  html: event.html,
                  source: event.source,
                  warnings: event.warnings,
                });
                break;
              }
            }
          },
        });

        if (projectId) await setDsProjectStatus(projectId, "ready");
        send("done", { projectId });
      } catch (err) {
        console.error("[generate] fatal:", err);
        if (projectId) {
          try {
            await setDsProjectStatus(projectId, "error");
          } catch {
            // best-effort status update
          }
        }
        send("error", {
          message: err instanceof Error ? err.message : "generation failed",
        });
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            // already closed by the runtime
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
