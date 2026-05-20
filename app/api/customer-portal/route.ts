import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import DodoPayments from "dodopayments";

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY ?? "",
  environment:
    (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ?? "test_mode",
});

/**
 * GET /api/customer-portal
 * Returns JSON `{ url }` with a Dodo-hosted portal session link. The client
 * decides whether to redirect.
 *
 * Source of truth is `users.dodoCustomerId`, captured by the Dodo webhook
 * (see app/api/webhooks/dodo/route.ts). No URL params, no lookups.
 *
 * Error codes:
 *   unauthenticated      — no signed-in user
 *   not_configured       — DODO_PAYMENTS_API_KEY missing
 *   not_subscribed       — free plan, nothing to manage
 *   webhook_pending      — paid plan in DB but customer_id not synced yet
 *                          (rare race: webhook still in flight)
 *   portal_unavailable   — Dodo unreachable / unexpected error
 */
export async function GET(_req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json(
      { error: "Please sign in to manage billing.", code: "unauthenticated" },
      { status: 401 }
    );
  }

  if (!process.env.DODO_PAYMENTS_API_KEY) {
    return NextResponse.json(
      { error: "Payments aren't configured for this environment.", code: "not_configured" },
      { status: 500 }
    );
  }

  try {
    const row = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });

    if (!row || (row.plan === "free" && !row.dodoCustomerId)) {
      return NextResponse.json(
        {
          error: "You're on the Free plan. Subscribe to a plan to access the billing portal.",
          code: "not_subscribed",
        },
        { status: 400 }
      );
    }

    if (!row.dodoCustomerId) {
      // Webhook hasn't synced yet, or this account predates customer_id capture.
      // Caller can retry shortly; the webhook is the canonical writer.
      return NextResponse.json(
        {
          error:
            "Your billing account is still being set up. Please refresh in a few seconds, or contact support if this persists.",
          code: "webhook_pending",
        },
        { status: 409 }
      );
    }

    const session = await dodo.customers.customerPortal.create(row.dodoCustomerId);
    return NextResponse.json({ url: session.link });
  } catch (error) {
    console.error("[customer-portal]", error);
    return NextResponse.json(
      { error: "We couldn't open the billing portal. Please try again.", code: "portal_unavailable" },
      { status: 500 }
    );
  }
}
