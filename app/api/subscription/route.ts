import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLAN_LIMITS, type PlanId } from "@/lib/payments/dodo";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const row = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    const planId = (row?.plan ?? "free") as PlanId;
    const limits = PLAN_LIMITS[planId] ?? PLAN_LIMITS.free;

    // Check if usage needs monthly reset
    let screensUsed = row?.screensUsed ?? 0;
    if (row?.usageResetAt) {
      const resetAt = new Date(row.usageResetAt);
      const now = new Date();
      // If we've crossed into a new month since last reset, zero the counter
      if (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
        screensUsed = 0;
        await db
          .update(users)
          .set({ screensUsed: 0, usageResetAt: now, updatedAt: now })
          .where(eq(users.clerkId, userId));
      }
    }

    return NextResponse.json({
      planId,
      subscriptionId: row?.subscriptionId ?? null,
      subscriptionStatus: row?.subscriptionStatus ?? "inactive",
      limits,
      screensUsed,
      screensRemaining: planId === "free" ? 0 : Math.max(0, limits.screens - screensUsed),
    });
  } catch (error) {
    console.error("[GET /api/subscription] Error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
