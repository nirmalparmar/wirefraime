import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, projects, screens } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/db/helpers";
import { eq, sql, and } from "drizzle-orm";
import { generateDesignSystem, generateScreenHtml } from "@/lib/agents/design-agent";
import { uploadScreenHtml } from "@/lib/storage";
import { PLAN_LIMITS, type PlanId } from "@/lib/payments/dodo";
import type { DesignSystem, Platform } from "@/lib/types";

/** Check if user has remaining screen quota. Returns { allowed, planId, screensUsed, limit } */
async function checkScreenQuota(clerkId: string) {
  const row = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  const planId = (row?.plan ?? "free") as PlanId;
  const limits = PLAN_LIMITS[planId] ?? PLAN_LIMITS.free;

  if (planId === "free") {
    return { allowed: false, planId, screensUsed: 0, limit: 0 };
  }

  let screensUsed = row?.screensUsed ?? 0;

  // Monthly reset check
  if (row?.usageResetAt) {
    const resetAt = new Date(row.usageResetAt);
    const now = new Date();
    if (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
      screensUsed = 0;
      await db
        .update(users)
        .set({ screensUsed: 0, usageResetAt: now, updatedAt: now })
        .where(eq(users.clerkId, clerkId));
    }
  }

  return {
    allowed: screensUsed < limits.screens,
    planId,
    screensUsed,
    limit: limits.screens,
  };
}

/** Increment the user's screen usage counter */
async function incrementScreenUsage(clerkId: string, count: number) {
  await db
    .update(users)
    .set({
      screensUsed: sql`${users.screensUsed} + ${count}`,
      updatedAt: new Date(),
    })
    .where(eq(users.clerkId, clerkId));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check subscription & quota
  const quota = await checkScreenQuota(userId);
  if (!quota.allowed) {
    return new Response(
      JSON.stringify({
        error: "Screen limit reached",
        planId: quota.planId,
        screensUsed: quota.screensUsed,
        limit: quota.limit,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const { name, description, projectId } = await req.json();
  const encoder = new TextEncoder();

  // Resolve internal user ID for storage
  let internalUserId: string | null = null;
  try {
    internalUserId = await resolveUserId(userId);
  } catch {
    // User may not exist in DB yet — persist disabled
  }

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      function send(event: string, data: Record<string, unknown> = {}) {
        if (closed) return;
        try {
          const payload = `data: ${JSON.stringify({ event, ...data })}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          closed = true;
        }
      }

      try {
        send("step", { label: "Analyzing requirements", detail: `Understanding "${name}" — ${description.slice(0, 80)}${description.length > 80 ? "…" : ""}` });
        send("step", { label: "Choosing design direction", detail: "Selecting color palette, typography, layout patterns" });

        const plan = await generateDesignSystem(name, description);
        const designSystem: DesignSystem = plan.designSystem;
        const plannedScreens = plan.screens;
        const platform: Platform = plan.platform;

        // Check if planned screens would exceed remaining quota
        const remaining = quota.limit - quota.screensUsed;
        // Replace Gemini's slug IDs with real UUIDs for DB compatibility
        const screensToGenerate = plannedScreens.slice(0, remaining).map((s) => ({
          ...s,
          id: randomUUID(),
        }));

        const fontName = designSystem.fonts.primary.split(",")[0].trim();
        const dsDetail = `${fontName} · ${designSystem.colors.primary} · ${platform} · ${designSystem.layout?.navStyle ?? "topbar"} nav`;
        send("step", { label: "Design system ready", detail: dsDetail });
        send("design_system", { designSystem, platform });

        // Persist design system to project
        if (projectId && internalUserId) {
          try {
            await db
              .update(projects)
              .set({ designSystem, platform, updatedAt: new Date() })
              .where(and(eq(projects.id, projectId), eq(projects.userId, internalUserId)));
          } catch (e) {
            console.warn("Failed to persist design system:", e);
          }
        }

        const screenNames = screensToGenerate.map((s: { name: string }) => s.name).join(", ");
        send("step", { label: `Planning ${screensToGenerate.length} screens`, detail: screenNames });
        send("screen_plan", { total: screensToGenerate.length });

        if (screensToGenerate.length < plannedScreens.length) {
          send("step", {
            label: "Screen limit applied",
            detail: `Generating ${screensToGenerate.length} of ${plannedScreens.length} planned screens (${remaining} remaining in your plan)`,
          });
        }

        let referenceHtml: string | undefined;

        for (let i = 0; i < screensToGenerate.length; i++) {
          const screen = screensToGenerate[i];
          send("screen_start", {
            id: screen.id,
            name: screen.name,
            index: i + 1,
            total: screensToGenerate.length,
          });

          send("step", {
            label: `Designing "${screen.name}"`,
            detail: screen.description.slice(0, 100) + (screen.description.length > 100 ? "…" : ""),
          });

          const html = await generateScreenHtml(
            screen.id,
            screen.name,
            screen.description,
            name,
            description,
            designSystem,
            platform,
            (screenId, chunk) => {
              send("html_chunk", { screenId, chunk });
            },
            referenceHtml
          );

          if (i === 0) {
            referenceHtml = html;
          }

          // Persist screen to Postgres + S3
          if (projectId && internalUserId) {
            try {
              const storageKey = await uploadScreenHtml(internalUserId, projectId, screen.id, html);
              await db.insert(screens).values({
                id: screen.id,
                projectId,
                name: screen.name,
                sortOrder: i,
                storageKey,
                htmlSize: Buffer.byteLength(html, "utf8"),
              }).onConflictDoUpdate({
                target: screens.id,
                set: {
                  storageKey,
                  htmlSize: Buffer.byteLength(html, "utf8"),
                  updatedAt: new Date(),
                },
              });
            } catch (e) {
              console.warn(`Failed to persist screen ${screen.id}:`, e);
            }
          }

          send("step", { label: `"${screen.name}" complete`, detail: `${Math.round(html.length / 1024)}KB HTML` });
          send("screen_done", { screenId: screen.id, html });
        }

        // Increment usage after successful generation
        await incrementScreenUsage(userId, screensToGenerate.length);

        send("done", {});
      } catch (err) {
        console.error("[POST /api/generate] Generate error:", err);
        send("error", { message: "Something went wrong. Please try again." });
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
