import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import DodoPayments from "dodopayments";

const client = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  environment: (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ?? "test_mode",
});

const PRODUCT_IDS: Record<string, string | undefined> = {
  pro_monthly: process.env.DODO_PRO_MONTHLY_PRODUCT_ID,
  pro_annual: process.env.DODO_PRO_ANNUAL_PRODUCT_ID,
  ultra_monthly: process.env.DODO_ULTRA_MONTHLY_PRODUCT_ID,
  ultra_annual: process.env.DODO_ULTRA_ANNUAL_PRODUCT_ID,
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "No email found on account" }, { status: 400 });
  }

  const { plan, annual } = (await req.json()) as {
    plan: "pro" | "ultra";
    annual: boolean;
  };

  if (!["pro", "ultra"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const key = `${plan}_${annual ? "annual" : "monthly"}`;
  const productId = PRODUCT_IDS[key];
  if (!productId) {
    return NextResponse.json({ error: "Product not configured" }, { status: 500 });
  }

  try {
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        email,
        name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || undefined,
      },
      metadata: {
        clerk_user_id: userId,
        plan,
        billing_cycle: annual ? "annual" : "monthly",
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"}/dashboard/billing`,
    });

    return NextResponse.json({
      checkout_url: session.checkout_url,
      session_id: session.session_id,
    });
  } catch (error: unknown) {
    console.error("[POST /api/checkout] Checkout error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
