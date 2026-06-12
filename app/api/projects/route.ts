import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/db/helpers";
import { eq, desc } from "drizzle-orm";
import { getPlanState } from "@/lib/payments/usage";

/** GET /api/projects — list user's projects (metadata only) */
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const internalId = await resolveUserId(clerkId);

    const rows = await db.query.projects.findMany({
      where: eq(projects.userId, internalId),
      orderBy: [desc(projects.updatedAt)],
      with: {
        screens: {
          columns: { id: true, name: true, sortOrder: true, htmlSize: true },
          orderBy: (s, { asc }) => [asc(s.sortOrder)],
        },
      },
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[GET /api/projects]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

/** POST /api/projects — create a project (gated by plan quota) */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const state = await getPlanState(clerkId);
    if (!state) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (state.planId === "free" || state.screensRemaining <= 0) {
      return NextResponse.json(
        {
          error: "Screen limit reached. Upgrade your plan to create new projects.",
          code: "QUOTA_EXCEEDED",
          planId: state.planId,
          screensUsed: state.screensUsed,
          limit: state.limits.screens,
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const [row] = await db
      .insert(projects)
      .values({
        userId: state.userId,
        name: body.name,
        description: body.description ?? "",
        platform: body.platform ?? "web",
        designSystem: body.designSystem ?? null,
        designSystemId: typeof body.designSystemId === "string" ? body.designSystemId : null,
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("[POST /api/projects]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
