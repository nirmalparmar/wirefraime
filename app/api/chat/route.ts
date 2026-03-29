import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { streamChatEdit } from "@/lib/agents/design-agent";
import type { SelectedElementContext } from "@/lib/agents/design-agent";
import type { Screen, DesignSystem, Platform } from "@/lib/types";
import { resolveUserId } from "@/lib/db/helpers";
import { uploadScreenHtml } from "@/lib/storage";
import { db } from "@/lib/db";
import { screens as screensTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { message, screens, designSystem, messages, image, selectedElement, platform, appName, appDescription, activeScreenId, projectId } =
    (await req.json()) as {
      message: string;
      screens: Screen[];
      designSystem: DesignSystem;
      messages: { role: string; content: string }[];
      image?: string;
      selectedElement?: SelectedElementContext | null;
      platform?: Platform;
      appName?: string;
      appDescription?: string;
      activeScreenId?: string | null;
      projectId?: string;
    };

  // Resolve internal user for S3 persistence
  let internalUserId: string | null = null;
  try {
    internalUserId = await resolveUserId(userId);
  } catch {
    // persist disabled
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      function send(event: string, data: Record<string, unknown> = {}) {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ event, ...data })}\n\n`)
          );
        } catch {
          closed = true;
        }
      }

      try {
        send("step", { label: "Planning..." });

        for await (const evt of streamChatEdit(message, screens, designSystem, messages, platform ?? "web", image, selectedElement, appName, appDescription, activeScreenId)) {
          if (evt.type === "plan") {
            send("plan", {
              reply: evt.reply,
              targetScreenId: evt.targetScreenId,
              targetScreenName: evt.targetScreenName,
              multiScreen: evt.multiScreen,
              screenCount: evt.screenCount,
            });
          } else if (evt.type === "screen_start") {
            send("screen_start", {
              screenId: evt.screenId,
              screenName: evt.screenName,
              index: evt.index,
              total: evt.total,
            });
          } else if (evt.type === "apply_op") {
            send("apply_op", {
              screenId: evt.screenId,
              index: evt.index,
              total: evt.total,
              description: evt.description,
            });
          } else if (evt.type === "apply_failed") {
            send("apply_failed", {
              screenId: evt.screenId,
              failedOps: evt.failedOps,
              fallback: evt.fallback,
            });
          } else if (evt.type === "html_chunk") {
            send("html_chunk", { screenId: evt.screenId, chunk: evt.chunk });
          } else if (evt.type === "screen_done") {
            send("screen_done", { screenId: evt.screenId, html: evt.html });
            // Persist updated HTML to S3
            if (projectId && internalUserId && evt.html) {
              try {
                const storageKey = await uploadScreenHtml(internalUserId, projectId, evt.screenId, evt.html);
                await db.update(screensTable).set({
                  storageKey,
                  htmlSize: Buffer.byteLength(evt.html, "utf8"),
                  updatedAt: new Date(),
                }).where(eq(screensTable.id, evt.screenId));
              } catch (e) {
                console.warn(`Failed to persist chat edit for screen ${evt.screenId}:`, e);
              }
            }
          } else if (evt.type === "screen_created") {
            send("screen_created", { screenId: evt.screenId, screenName: evt.screenName, html: evt.html });
            // Persist new screen to S3 + DB
            if (projectId && internalUserId && evt.html) {
              try {
                const storageKey = await uploadScreenHtml(internalUserId, projectId, evt.screenId, evt.html);
                await db.insert(screensTable).values({
                  id: evt.screenId,
                  projectId,
                  name: evt.screenName ?? "New Screen",
                  sortOrder: 99,
                  storageKey,
                  htmlSize: Buffer.byteLength(evt.html, "utf8"),
                }).onConflictDoUpdate({
                  target: screensTable.id,
                  set: { storageKey, htmlSize: Buffer.byteLength(evt.html, "utf8"), updatedAt: new Date() },
                });
              } catch (e) {
                console.warn(`Failed to persist new screen ${evt.screenId}:`, e);
              }
            }
          }
        }

        send("done", {});
      } catch (err) {
        console.error("Chat error:", err);
        send("error", { message: String(err) });
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
        closed = true;
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
