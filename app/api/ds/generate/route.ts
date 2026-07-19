import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generatePlan, generateScreenHtml } from "@/lib/agent";
import { liveLlm } from "@/lib/llm";
import {
  createDsProject,
  insertDsScreen,
  setDsProjectStatus,
} from "@/lib/db/ds-queries";

/**
 * v2 generation endpoint (plan Phase B). SSE events:
 *   project      { projectId }
 *   plan         { appName, screens[], source }
 *   theme        { theme }
 *   screen_start { index, name }
 *   screen_chunk { index, delta }      — raw stream for live preview only;
 *                                        the stored artifact is the
 *                                        sanitized html in screen_done
 *   screen_done  { index, screenId, name, html, source, warnings }
 *   done         { projectId }
 *   error        { message }
 *
 * NOTE: mounted at /api/ds/generate (not /api/generate) so the legacy
 * workspace keeps working until the Phase C/D cutover.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

const SCREEN_CONCURRENCY = 3;

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

      try {
        const { plan, source } = await generatePlan(prompt, liveLlm);

        const project = await createDsProject({
          clerkUserId: userId ?? null,
          name: plan.appName,
          prompt,
          theme: plan.theme,
        });

        send("project", { projectId: project.id });
        send("plan", { appName: plan.appName, screens: plan.screens, source });
        send("theme", { theme: plan.theme });

        // Concurrency-3 worker pool over the screen list (plan §6).
        let next = 0;
        const runOne = async (): Promise<void> => {
          while (next < plan.screens.length) {
            const index = next++;
            const screen = plan.screens[index];
            send("screen_start", { index, name: screen.name });

            const result = await generateScreenHtml({
              ctx: {
                appName: plan.appName,
                userPrompt: prompt,
                screens: plan.screens,
                screen,
              },
              llm: liveLlm,
              onChunk: (delta) => send("screen_chunk", { index, delta }),
              abortSignal: req.signal,
            });

            const row = await insertDsScreen({
              projectId: project.id,
              name: screen.name,
              purpose: screen.purpose,
              html: result.html,
              source: result.source,
              sortOrder: index,
            });

            if (result.warnings.length > 0) {
              console.warn(`[generate] "${screen.name}":`, result.warnings);
            }
            send("screen_done", {
              index,
              screenId: row.id,
              name: screen.name,
              html: result.html,
              source: result.source,
              warnings: result.warnings,
            });
          }
        };

        await Promise.all(
          Array.from(
            { length: Math.min(SCREEN_CONCURRENCY, plan.screens.length) },
            () => runOne(),
          ),
        );

        await setDsProjectStatus(project.id, "ready");
        send("done", { projectId: project.id });
      } catch (err) {
        console.error("[generate] fatal:", err);
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
