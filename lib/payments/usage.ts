import "server-only";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { PLAN_LIMITS, type PlanId, type SubscriptionStatus } from "./dodo";

export type UserPlanState = {
  /** Internal Postgres user UUID (for FK references). */
  userId: string;
  planId: PlanId;
  subscriptionId: string | null;
  dodoCustomerId: string | null;
  subscriptionStatus: SubscriptionStatus;
  limits: { screens: number };
  screensUsed: number;
  screensRemaining: number;
};

function isSameMonth(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

/**
 * Single-query lookup for plan + quota state.
 *
 * Resets the monthly counter inline when the stored `usage_reset_at` is in
 * a previous calendar month. The reset is idempotent and conditional so it
 * only writes when an actual rollover is needed.
 *
 * Returns `null` if no user row exists for the given Clerk ID — callers
 * decide whether that's a 401, 404, or seed-on-demand.
 */
export async function getPlanState(clerkId: string): Promise<UserPlanState | null> {
  const row = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
    columns: {
      id: true,
      plan: true,
      subscriptionId: true,
      dodoCustomerId: true,
      subscriptionStatus: true,
      screensUsed: true,
      usageResetAt: true,
    },
  });

  if (!row) return null;

  const planId = (row.plan as PlanId) in PLAN_LIMITS ? (row.plan as PlanId) : "free";
  const limits = PLAN_LIMITS[planId];
  const now = new Date();

  let screensUsed = row.screensUsed;
  if (row.usageResetAt && !isSameMonth(row.usageResetAt, now)) {
    screensUsed = 0;
    await db
      .update(users)
      .set({ screensUsed: 0, usageResetAt: now, updatedAt: now })
      .where(eq(users.id, row.id));
  }

  return {
    userId: row.id,
    planId,
    subscriptionId: row.subscriptionId ?? null,
    dodoCustomerId: row.dodoCustomerId ?? null,
    subscriptionStatus: (row.subscriptionStatus as SubscriptionStatus) ?? "inactive",
    limits,
    screensUsed,
    screensRemaining: planId === "free" ? 0 : Math.max(0, limits.screens - screensUsed),
  };
}

/**
 * Atomic counter bump. Uses SQL expression so concurrent generations from the
 * same user don't lose increments.
 */
export async function incrementScreenUsage(userId: string, count: number): Promise<void> {
  if (count <= 0) return;
  await db
    .update(users)
    .set({ screensUsed: sql`${users.screensUsed} + ${count}`, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
