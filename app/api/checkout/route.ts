import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireDodo } from "@/lib/payments/client";
import { getProductId } from "@/lib/payments/dodo";

const Body = z.object({
  plan: z.enum(["pro", "ultra"]),
  annual: z.boolean(),
});

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan or billing cycle" }, { status: 400 });
  }
  const { plan, annual } = parsed.data;

  const productId = getProductId(plan, annual);
  if (!productId) {
    console.error("[checkout] product id not configured", { plan, annual });
    return NextResponse.json(
      { error: "Payments aren't configured for this plan yet." },
      { status: 500 }
    );
  }

  const returnUrl = process.env.DODO_PAYMENTS_RETURN_URL;
  if (!returnUrl) {
    console.error("[checkout] DODO_PAYMENTS_RETURN_URL not set");
    return NextResponse.json(
      { error: "Payments aren't configured for this environment." },
      { status: 500 }
    );
  }

  // One query: Clerk for email/name; DB for an existing Dodo customer id.
  const [user, row] = await Promise.all([
    currentUser(),
    db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
      columns: { dodoCustomerId: true },
    }),
  ]);

  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "No email on account" }, { status: 400 });
  }

  // Attach existing Dodo customer when we have one — keeps payment methods,
  // history, and address on file across subscriptions.
  const customer = row?.dodoCustomerId
    ? { customer_id: row.dodoCustomerId }
    : {
        email,
        name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || email,
      };

  try {
    const session = await requireDodo().checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer,
      metadata: {
        clerk_user_id: clerkId,
        plan,
        billing_cycle: annual ? "annual" : "monthly",
      },
      return_url: returnUrl,
    });

    return NextResponse.json({
      checkout_url: session.checkout_url,
      session_id: session.session_id,
    });
  } catch (error) {
    console.error("[checkout]", error);
    return NextResponse.json(
      { error: "We couldn't start checkout. Please try again." },
      { status: 500 }
    );
  }
}
