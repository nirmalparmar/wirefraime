import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { dodo } from "@/lib/payments/client";

/**
 * GET /api/customer-portal
 * Returns `{ url }` with a Dodo-hosted portal session link.
 *
 * Source of truth is `users.dodoCustomerId`, written by the Dodo webhook.
 * No URL params, no Dodo API calls beyond portal session creation.
 */
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json(
      { error: "Please sign in to manage billing.", code: "unauthenticated" },
      { status: 401 }
    );
  }

  if (!dodo) {
    return NextResponse.json(
      { error: "Payments aren't configured for this environment.", code: "not_configured" },
      { status: 500 }
    );
  }

  try {
    const row = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
      columns: { plan: true, dodoCustomerId: true },
    });

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
      // Webhook hasn't synced the customer id yet. Caller retries.
      return NextResponse.json(
        {
          error:
            "Your billing account is still being set up. Please refresh in a few seconds.",
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
      {
        error: "We couldn't open the billing portal. Please try again.",
        code: "portal_unavailable",
      },
      { status: 500 }
    );
  }
}
