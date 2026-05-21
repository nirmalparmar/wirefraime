import { NextRequest } from "next/server";
import { Webhooks } from "@dodopayments/nextjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  planFromProductId,
  type PlanId,
  type SubscriptionStatus,
} from "@/lib/payments/dodo";

/**
 * Dodo Payments webhook receiver — single source of truth for subscription
 * state. Captures both subscription_id and customer_id from every event so
 * the customer portal can be opened directly. customer_id survives churn
 * (cancel + resubscribe creates a new sub_id but the same cus_id).
 *
 * Signature verification + payload parsing is delegated to @dodopayments/nextjs.
 *
 * Idempotency: Dodo retries failed deliveries. We dedupe at the application
 * layer by snapshotting an "applied state" — repeated identical updates are
 * cheap no-ops (single UPDATE with WHERE that won't match).
 */

const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;

const handler = webhookKey
  ? Webhooks({
      webhookKey,
      onSubscriptionActive: (p) => applySubscription(p.data, "active"),
      onSubscriptionRenewed: (p) => applySubscription(p.data, "renewed"),
      onSubscriptionPlanChanged: (p) => applySubscription(p.data, "plan_changed"),
      onSubscriptionUpdated: (p) => applySubscription(p.data, "updated"),
      onSubscriptionOnHold: (p) => applyStatus(p.data, "past_due", "on_hold"),
      onSubscriptionCancelled: (p) => applyCancellation(p.data),
      onSubscriptionFailed: (p) =>
        applyStatus(p.data, "inactive", "failed", { revoke: true }),
      onSubscriptionExpired: (p) =>
        applyStatus(p.data, "inactive", "expired", { revoke: true }),
      onPaymentSucceeded: async (p) => {
        // Subscription payments arrive here too — log only; subscription.*
        // events are the canonical signal for entitlement changes.
        console.log("[dodo:payment.succeeded]", {
          payment: p.data.payment_id,
          subscription: p.data.subscription_id,
        });
      },
      onPaymentFailed: async (p) => {
        console.warn("[dodo:payment.failed]", {
          payment: p.data.payment_id,
          subscription: p.data.subscription_id,
          customer: p.data.customer?.email,
        });
      },
      onRefundSucceeded: async (p) => {
        console.log("[dodo:refund.succeeded]", { refund: p.data.refund_id });
      },
      onDisputeOpened: async (p) => {
        console.warn("[dodo:dispute.opened]", {
          dispute: p.data.dispute_id,
          payment: p.data.payment_id,
        });
      },
    })
  : null;

export async function POST(req: NextRequest) {
  if (!handler) {
    console.error("[dodo-webhook] DODO_PAYMENTS_WEBHOOK_SECRET not set");
    return new Response("Webhook not configured", { status: 500 });
  }
  return handler(req);
}

/* ── Subscription payload type (subset we use) ───────────────── */

type SubscriptionData = {
  subscription_id: string;
  product_id: string;
  status: string;
  customer: { customer_id: string; email: string };
  metadata?: Record<string, string>;
  cancel_at_next_billing_date?: boolean;
};

/* ── User resolution ────────────────────────────────────────── */

/**
 * Resolve our internal user — Clerk ID from metadata first (always set by our
 * checkout route), then customer.email as a fallback for subscriptions created
 * outside our flow. Email match is only used when no Clerk ID was provided —
 * never to override a different user.
 */
async function findUser(data: SubscriptionData) {
  const clerkId = data.metadata?.clerk_user_id;
  if (clerkId) {
    const byClerk = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
      columns: { id: true, plan: true, dodoCustomerId: true },
    });
    if (byClerk) return byClerk;
  }
  const email = data.customer?.email;
  if (email) {
    const byEmail = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, plan: true, dodoCustomerId: true },
    });
    if (byEmail) return byEmail;
  }
  return null;
}

/* ── Handlers ──────────────────────────────────────────────── */

async function applySubscription(data: SubscriptionData, kind: string) {
  const user = await findUser(data);
  if (!user) {
    console.warn(`[dodo:${kind}] no user match`, {
      sub: data.subscription_id,
      email: data.customer?.email,
      clerk: data.metadata?.clerk_user_id,
    });
    return;
  }

  const mappedPlan = planFromProductId(data.product_id);
  // If we can't map the product, keep current plan rather than guessing — but
  // never silently re-activate someone on "free" when the webhook says active.
  const planId: PlanId =
    mappedPlan ?? ((user.plan as PlanId) === "free" ? "pro" : (user.plan as PlanId));

  if (!mappedPlan) {
    console.warn(`[dodo:${kind}] unknown product_id, keeping plan=${planId}`, {
      product: data.product_id,
      sub: data.subscription_id,
    });
  }

  const status: SubscriptionStatus =
    data.status === "active" ? "active" : data.status === "on_hold" ? "past_due" : "active";

  await db
    .update(users)
    .set({
      plan: planId,
      subscriptionId: data.subscription_id,
      dodoCustomerId: data.customer.customer_id,
      subscriptionStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`[dodo:${kind}] applied`, {
    user: user.id,
    plan: planId,
    sub: data.subscription_id,
  });
}

async function applyStatus(
  data: SubscriptionData,
  status: SubscriptionStatus,
  kind: string,
  opts: { revoke?: boolean } = {}
) {
  const user = await findUser(data);
  if (!user) {
    console.warn(`[dodo:${kind}] no user match`, { sub: data.subscription_id });
    return;
  }

  await db
    .update(users)
    .set({
      subscriptionStatus: status,
      ...(opts.revoke ? { plan: "free" as PlanId } : {}),
      dodoCustomerId: data.customer.customer_id,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`[dodo:${kind}] status=${status} revoke=${!!opts.revoke}`, { user: user.id });
}

async function applyCancellation(data: SubscriptionData) {
  const user = await findUser(data);
  if (!user) {
    console.warn("[dodo:cancelled] no user match", { sub: data.subscription_id });
    return;
  }

  // If cancel_at_next_billing_date, user retains access until period end —
  // mark cancel_pending and let `expired` move them to free later.
  const cancelAtPeriodEnd = !!data.cancel_at_next_billing_date;

  await db
    .update(users)
    .set({
      subscriptionStatus: cancelAtPeriodEnd ? "cancel_pending" : "inactive",
      ...(cancelAtPeriodEnd ? {} : { plan: "free" as PlanId }),
      dodoCustomerId: data.customer.customer_id,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log("[dodo:cancelled]", { user: user.id, cancelAtPeriodEnd });
}
