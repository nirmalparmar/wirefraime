import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPlanState } from "@/lib/payments/usage";

/**
 * GET /api/subscription
 *
 * Returns the plan + quota snapshot we own. Billing details (renewal date,
 * invoices, payment method, cancellation) live in Dodo's customer portal —
 * see /api/customer-portal.
 */
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = await getPlanState(clerkId);
    if (!state) {
      // User row not seeded yet (Clerk webhook hasn't fired) — treat as free.
      return NextResponse.json({
        planId: "free",
        subscriptionId: null,
        subscriptionStatus: "inactive",
        limits: { screens: 0 },
        screensUsed: 0,
        screensRemaining: 0,
      });
    }

    return NextResponse.json({
      planId: state.planId,
      subscriptionId: state.subscriptionId,
      subscriptionStatus: state.subscriptionStatus,
      limits: state.limits,
      screensUsed: state.screensUsed,
      screensRemaining: state.screensRemaining,
    });
  } catch (error) {
    console.error("[GET /api/subscription]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
