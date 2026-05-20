import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
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
 *
 * Returns JSON `{ url }` with a Dodo-hosted portal session link. The client
 * decides whether to redirect.
 *
 * Customer resolution order:
 *   1. row.subscriptionId in our DB → look up customer via subscription
 *   2. Clerk user email → look up customer in Dodo by email
 * This handles the legacy case where a user upgraded but subscriptionId
 * wasn't captured (webhook miss / manual DB edit).
 *
 * Error codes:
 *   unauthenticated      — no signed-in user
 *   no_subscription      — paid plan in DB but no Dodo record found
 *   not_subscribed       — user is on the free plan
 *   not_configured       — DODO_PAYMENTS_API_KEY missing
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

    // Free users have nothing to manage
    if (row && row.plan === "free" && !row.subscriptionId) {
      return NextResponse.json(
        {
          error: "You're on the Free plan. Subscribe to a plan to access the billing portal.",
          code: "not_subscribed",
        },
        { status: 400 }
      );
    }

    // 1. Try via subscription ID
    let customerId: string | null = null;
    if (row?.subscriptionId) {
      try {
        const sub = await dodo.subscriptions.retrieve(row.subscriptionId);
        customerId = sub.customer?.customer_id ?? null;
      } catch (err) {
        console.warn("[customer-portal] subscription lookup failed:", err);
      }
    }

    // 2. Fallback: look up customer by email
    if (!customerId) {
      const clerkUser = await currentUser();
      const email =
        clerkUser?.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)
          ?.emailAddress ?? clerkUser?.emailAddresses?.[0]?.emailAddress ?? row?.email ?? null;

      if (email) {
        try {
          const list = await dodo.customers.list({ email });
          // PagePromise — read first page items
          const first = (list as { data?: Array<{ customer_id: string }> }).data?.[0];
          if (first?.customer_id) customerId = first.customer_id;
        } catch (err) {
          console.warn("[customer-portal] email lookup failed:", err);
        }
      }
    }

    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "We couldn't find your billing account. If you recently subscribed, please contact support.",
          code: "no_subscription",
        },
        { status: 404 }
      );
    }

    const session = await dodo.customers.customerPortal.create(customerId);
    return NextResponse.json({ url: session.link });
  } catch (error) {
    console.error("[GET /api/customer-portal] Error:", error);
    return NextResponse.json(
      { error: "We couldn't open the billing portal. Please try again.", code: "portal_unavailable" },
      { status: 500 }
    );
  }
}
