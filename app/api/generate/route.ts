import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, screens } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateDesignSystem, generateScreen, parseDataUrl } from "@/lib/agents/design-agent";
import { selectDesignSkill, loadSelectedSkillBody } from "@/lib/agents/skill-selector";
import { loadBrandPackage, mergeBrandIntoDesignSystem } from "@/lib/design/design-systems";
import { uploadScreenHtml } from "@/lib/storage";
import { getPlanState, incrementScreenUsage } from "@/lib/payments/usage";
import type { DesignSystem, Platform } from "@/lib/types";
import type { ArtifactType } from "@/lib/design/types";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Single lookup: plan, quota, monthly reset, and internal user id for FK use.
  const state = await getPlanState(clerkId);
  if (!state || state.planId === "free" || state.screensRemaining <= 0) {
    return new Response(
      JSON.stringify({
        error: "Screen limit reached",
        planId: state?.planId ?? "free",
        screensUsed: state?.screensUsed ?? 0,
        limit: state?.limits.screens ?? 0,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const { name, description, projectId, image, designSystemId, artifactType: requestedArtifactType } = await req.json();
  const referenceImage = typeof image === "string" ? parseDataUrl(image) ?? undefined : undefined;
  const encoder = new TextEncoder();
  const internalUserId = state.userId;

  // Resolve the chosen brand: explicit body override, else the project's stored
  // brand. null = "Custom (AI-generated)".
  let brandId: string | null = typeof designSystemId === "string" ? designSystemId : null;
  if (!brandId && projectId) {
    try {
      const proj = await db.query.projects.findFirst({
        where: and(eq(projects.id, projectId), eq(projects.userId, internalUserId)),
        columns: { designSystemId: true },
      });
      brandId = proj?.designSystemId ?? null;
    } catch { /* ignore — fall back to custom */ }
  }
  const brandPkg = brandId ? loadBrandPackage(brandId) : null;

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

        // Step 1 — pick the design skill BEFORE building the design system, so
        // both the planner and the screen generators read from the same skill.
        send("step", { label: "Selecting design skill", detail: "Matching the brief to the best design playbook" });
        const selectedSkill = await selectDesignSkill(name, description, referenceImage);
        send("step", { label: `Skill selected — ${selectedSkill.name}`, detail: selectedSkill.reasoning });
        const selectedSkillBody = await loadSelectedSkillBody(selectedSkill.slug);

        send("step", { label: "Choosing design direction", detail: "Selecting color palette, typography, layout patterns" });

        const plan = await generateDesignSystem(name, description, referenceImage, selectedSkill.slug);
        // Brand selected → adopt its colors/fonts/layout, keep the planner's
        // app-specific structure (screens, nav, components).
        const designSystem: DesignSystem = brandPkg
          ? mergeBrandIntoDesignSystem(plan.designSystem, brandPkg.designSystem)
          : plan.designSystem;
        const plannedScreens = plan.screens;
        const platform: Platform = plan.platform;
        // Artifact shape: explicit request wins, else the planner's classification.
        const artifactType: ArtifactType =
          requestedArtifactType === "landing-page" || requestedArtifactType === "app-ui"
            ? requestedArtifactType
            : plan.artifactType;

        // Check if planned screens would exceed remaining quota
        const remaining = state.screensRemaining;
        // Replace Gemini's slug IDs with real UUIDs for DB compatibility
        const screensToGenerate = plannedScreens.slice(0, remaining).map((s) => ({
          ...s,
          id: randomUUID(),
        }));

        const fontName = designSystem.fonts.primary.split(",")[0].trim();
        const brandLabel = brandPkg ? `${brandPkg.manifest.name} · ` : "";
        const shapeLabel = artifactType === "landing-page" ? "landing page" : `${designSystem.layout?.navStyle ?? "topbar"} app`;
        const dsDetail = `${brandLabel}${fontName} · ${designSystem.colors.primary} · ${platform} · ${shapeLabel}`;
        send("step", { label: brandPkg ? `Design system ready — ${brandPkg.manifest.name}` : "Design system ready", detail: dsDetail });
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

        // Grow a list of reference screens as we go — screens 2+ see multiple prior
        // patterns, not just screen 1. Caps at 3 refs to keep context bounded.
        const referenceHtmls: string[] = [];
        const MAX_REFS = 3;

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

          // Per-screen reasoning buffer: forward a rolling tail of the model's
          // thinking, throttled to ~every 120 new chars to bound SSE traffic.
          let reasoningBuf = "";
          let lastReasoningSent = 0;
          const html = await generateScreen(
            artifactType,
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
            referenceHtmls,
            referenceImage,
            (screenId, findings) => {
              if (findings.length) {
                send("lint", {
                  screenId,
                  findings: findings.map((f) => ({
                    rule: f.rule,
                    severity: f.severity,
                    count: f.count,
                  })),
                });
              }
            },
            brandPkg?.brandContext,
            (sid, text) => {
              reasoningBuf += text;
              if (reasoningBuf.length - lastReasoningSent >= 120) {
                lastReasoningSent = reasoningBuf.length;
                send("reasoning", { screenId: sid, text: reasoningBuf.slice(-600) });
              }
            },
            selectedSkillBody
          );

          // Keep the first screen as a permanent reference + rotate the rest.
          if (referenceHtmls.length < MAX_REFS) {
            referenceHtmls.push(html);
          } else {
            // Keep slot 0 (first screen) stable, rotate the remaining slots.
            referenceHtmls[1 + ((i - 1) % (MAX_REFS - 1))] = html;
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
        await incrementScreenUsage(internalUserId, screensToGenerate.length);

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
