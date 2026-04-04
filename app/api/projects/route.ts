import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/db/helpers";
import { eq, desc } from "drizzle-orm";
import { PLAN_LIMITS, type PlanId } from "@/lib/payments/dodo";

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
    console.error("[GET /api/projects] Error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

/** POST /api/projects — create a project */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const internalId = await resolveUserId(clerkId);

    // Check if user has screen quota remaining
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    const planId = (user?.plan ?? "free") as PlanId;
    const limits = PLAN_LIMITS[planId] ?? PLAN_LIMITS.free;
    let screensUsed = user?.screensUsed ?? 0;

    // Monthly reset check
    if (user?.usageResetAt) {
      const resetAt = new Date(user.usageResetAt);
      const now = new Date();
      if (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
        screensUsed = 0;
      }
    }

    if (planId === "free" || screensUsed >= limits.screens) {
      return NextResponse.json(
        {
          error: "Screen limit reached. Upgrade your plan to create new projects.",
          code: "QUOTA_EXCEEDED",
          planId,
          screensUsed,
          limit: limits.screens,
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const [row] = await db
      .insert(projects)
      .values({
        userId: internalId,
        name: body.name,
        description: body.description ?? "",
        platform: body.platform ?? "web",
        designSystem: body.designSystem ?? null,
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("[POST /api/projects] Error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
