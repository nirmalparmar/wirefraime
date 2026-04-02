import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, screens } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/db/helpers";
import { eq, and } from "drizzle-orm";
import { getScreenHtml, uploadScreenHtml } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string; screenId: string }> };

/** GET /api/projects/[id]/screens/[screenId]/html — read HTML from S3 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new Response("Unauthorized", { status: 401 });

  const internalId = await resolveUserId(clerkId);
  const { id: projectId, screenId } = await ctx.params;

  // Verify ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, internalId)),
    columns: { id: true },
  });
  if (!project) return new Response("Not found", { status: 404 });

  const screen = await db.query.screens.findFirst({
    where: and(eq(screens.id, screenId), eq(screens.projectId, projectId)),
    columns: { storageKey: true },
  });
  if (!screen?.storageKey) {
    console.warn(`[HTML GET] Screen ${screenId} has no storageKey`);
    return new Response("", { status: 200 });
  }

  try {
    const html = await getScreenHtml(screen.storageKey);
    console.log(`[HTML GET] Screen ${screenId}: ${html.length} chars from ${screen.storageKey}`);
    return new Response(html, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error(`[HTML GET] S3 download failed for ${screen.storageKey}:`, err);
    return new Response("", { status: 500 });
  }
}

/** PUT /api/projects/[id]/screens/[screenId]/html — write HTML to S3 */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const internalId = await resolveUserId(clerkId);
  const { id: projectId, screenId } = await ctx.params;

  // Verify ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, internalId)),
    columns: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const html = await req.text();
  const storageKey = await uploadScreenHtml(internalId, projectId, screenId, html);

  // Update screen metadata
  await db
    .update(screens)
    .set({
      storageKey,
      htmlSize: Buffer.byteLength(html, "utf8"),
      updatedAt: new Date(),
    })
    .where(and(eq(screens.id, screenId), eq(screens.projectId, projectId)));

  // Touch project updatedAt
  await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId));

  return NextResponse.json({ storageKey, size: Buffer.byteLength(html, "utf8") });
}
