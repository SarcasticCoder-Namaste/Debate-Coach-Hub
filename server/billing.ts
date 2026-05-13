import type { Express, Request } from "express";
import express from "express";
import type Stripe from "stripe";
import {
  PLANS,
  PLAN_TIERS,
  TEAM_MIN_SEATS,
  checkoutRequestSchema,
  getPlan,
  type PlanTier,
  type BillingInterval,
  type SubStatus,
  type Subscription,
} from "@shared/schema";
import { storage } from "./storage";
import {
  getUncachableStripeClient,
  getStripeWebhookSecret,
} from "./stripeClient";

declare module "express-session" {
  interface SessionData {
    subscriberId?: string;
  }
}

function nextPeriodEnd(from: Date, interval: BillingInterval): Date {
  const end = new Date(from);
  if (interval === "annual") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

/** Server-issued, cookie-bound subscriber id. Never trust client headers. */
export function subscriberIdFor(req: Request): string {
  if (!req.session) {
    throw new Error("Session middleware not installed");
  }
  if (!req.session.subscriberId) {
    req.session.subscriberId =
      "sub_" +
      Math.random().toString(36).slice(2, 12) +
      Date.now().toString(36);
  }
  return req.session.subscriberId;
}

function priceFor(planId: PlanTier, interval: BillingInterval, seats: number) {
  const plan = getPlan(planId);
  const unit = interval === "annual" ? plan.annualPrice : plan.monthlyPrice;
  const qty = plan.perSeat ? Math.max(seats, plan.minSeats ?? 1) : 1;
  const monthly = unit * qty;
  const billed = interval === "annual" ? monthly * 12 : monthly;
  return { unit, monthly, billed, seats: qty };
}

function origin(req: Request): string {
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost ?? req.header("host") ?? "localhost:5000";
  const proto =
    req.header("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function planFromMetadata(meta: Stripe.Metadata | undefined | null): {
  planId: PlanTier;
  interval: BillingInterval;
  seats: number;
  subscriberId?: string;
} {
  const planId = (meta?.planId as PlanTier) || "pro";
  const interval = (meta?.interval as BillingInterval) || "monthly";
  const seats = Number(meta?.seats || 1);
  return {
    planId: PLAN_TIERS.includes(planId) ? planId : "pro",
    interval: interval === "annual" ? "annual" : "monthly",
    seats: Number.isFinite(seats) && seats > 0 ? seats : 1,
    subscriberId: meta?.subscriberId,
  };
}

function publicShape(sub: Subscription) {
  return {
    planId: sub.planId as PlanTier,
    interval: sub.interval as BillingInterval,
    seats: sub.seats,
    status: sub.status as SubStatus,
    startedAt: sub.startedAt.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    practiceMinutesUsed: sub.practiceMinutesUsed,
    minutesPeriodStart: sub.minutesPeriodStart.toISOString(),
  };
}

async function ensureSubscription(subscriberId: string): Promise<Subscription> {
  const existing = await storage.getSubscription(subscriberId);
  if (existing) return existing;
  const now = new Date();
  return storage.upsertSubscription(subscriberId, {
    planId: "free",
    interval: "monthly",
    seats: 1,
    status: "active",
    startedAt: now,
    currentPeriodEnd: nextPeriodEnd(now, "monthly"),
    practiceMinutesUsed: 0,
    minutesPeriodStart: now,
  });
}

function statusFromStripe(s: Stripe.Subscription): SubStatus {
  if (s.status === "canceled" || s.status === "unpaid") return "canceled";
  if (s.status === "past_due" || s.status === "incomplete") return "past_due";
  return "active";
}

async function applyCheckoutSession(s: Stripe.Checkout.Session): Promise<void> {
  const meta = planFromMetadata(s.metadata);
  const subscriberId = meta.subscriberId;
  if (!subscriberId) return;

  const customerId =
    typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
  const subId =
    typeof s.subscription === "string"
      ? s.subscription
      : s.subscription?.id ?? null;

  const now = new Date();
  await storage.upsertSubscription(subscriberId, {
    planId: meta.planId,
    interval: meta.interval,
    seats: meta.seats,
    status: "active",
    startedAt: now,
    currentPeriodEnd: nextPeriodEnd(now, meta.interval),
    stripeCustomerId: customerId,
    stripeSubscriptionId: subId,
    practiceMinutesUsed: 0,
    minutesPeriodStart: now,
  });
}

/**
 * Webhook route — must be registered with express.raw() BEFORE express.json().
 */
export function registerStripeWebhook(app: Express) {
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const stripe = await getUncachableStripeClient();
      const secret = await getStripeWebhookSecret();
      if (!stripe || !secret) {
        return res.status(202).json({ received: true, mode: "demo" });
      }
      const sig = req.header("stripe-signature");
      if (!sig) return res.status(400).json({ error: "Missing signature" });

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        return res
          .status(400)
          .json({ error: `Webhook signature failed: ${msg}` });
      }

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            await applyCheckoutSession(event.data.object);
            break;
          }
          case "customer.subscription.updated":
          case "customer.subscription.deleted": {
            const s = event.data.object;
            const customerId =
              typeof s.customer === "string" ? s.customer : s.customer.id;
            const meta = planFromMetadata(s.metadata);
            const status =
              event.type === "customer.subscription.deleted"
                ? "canceled"
                : statusFromStripe(s);
            await storage.setSubscriptionByCustomerId(customerId, {
              planId: status === "canceled" ? "free" : meta.planId,
              interval: meta.interval,
              seats: meta.seats,
              status,
              currentPeriodEnd: new Date(
                (s.items.data[0]?.current_period_end ?? Date.now() / 1000) *
                  1000,
              ),
              stripeSubscriptionId: s.id,
            });
            break;
          }
          case "invoice.payment_failed": {
            const inv = event.data.object;
            const customerId =
              typeof inv.customer === "string"
                ? inv.customer
                : inv.customer?.id;
            if (customerId) {
              await storage.setSubscriptionByCustomerId(customerId, {
                status: "past_due",
              });
            }
            break;
          }
        }
      } catch (err) {
        console.error("[stripe webhook] handler error", err);
      }

      res.json({ received: true });
    },
  );
}

export function registerBillingRoutes(app: Express) {
  app.get("/api/billing/plans", (_req, res) => {
    res.json({ plans: PLANS });
  });

  app.get("/api/billing/subscription", async (req, res) => {
    const id = subscriberIdFor(req);
    const sub = await ensureSubscription(id);
    const rolled = await storage.rolloverMinutesIfNeeded(id);
    const plan = getPlan(rolled.planId as PlanTier);
    res.json({ subscription: publicShape(rolled || sub), plan });
  });

  app.post("/api/billing/checkout", async (req, res) => {
    const parsed = checkoutRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({
          message: "Invalid checkout request",
          issues: parsed.error.flatten(),
        });
    }
    const { planId, interval, seats = 1 } = parsed.data;
    const price = priceFor(planId, interval, seats);
    const subscriberId = subscriberIdFor(req);

    if (planId === "free") {
      const now = new Date();
      await storage.upsertSubscription(subscriberId, {
        planId: "free",
        interval: "monthly",
        seats: 1,
        status: "active",
        startedAt: now,
        currentPeriodEnd: nextPeriodEnd(now, "monthly"),
        practiceMinutesUsed: 0,
        minutesPeriodStart: now,
      });
      return res.json({
        mode: "free",
        message: "You're on the Free plan.",
        redirectUrl: "/pricing?status=demo-activated",
      });
    }

    const stripe = await getUncachableStripeClient();

    if (stripe) {
      try {
        const planName = getPlan(planId).name;
        const intervalUnit: "month" | "year" =
          interval === "annual" ? "year" : "month";
        const monthlyCents =
          (interval === "annual"
            ? getPlan(planId).annualPrice
            : getPlan(planId).monthlyPrice) * 100;
        const unitAmount =
          interval === "annual" ? monthlyCents * 12 : monthlyCents;

        const metadata: Stripe.Metadata = {
          planId,
          interval,
          seats: String(price.seats),
          subscriberId,
        };

        const checkoutSession = await stripe.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          allow_promotion_codes: true,
          line_items: [
            {
              quantity: price.seats,
              price_data: {
                currency: "usd",
                unit_amount: unitAmount,
                recurring: { interval: intervalUnit },
                product_data: {
                  name: `DebateMastery ${planName}`,
                  description:
                    interval === "annual"
                      ? `${planName} plan — billed annually`
                      : `${planName} plan — billed monthly`,
                },
              },
            },
          ],
          metadata,
          subscription_data: { metadata },
          success_url: `${origin(req)}/pricing?status=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin(req)}/pricing?status=canceled`,
        });

        return res.json({
          mode: "stripe",
          sessionUrl: checkoutSession.url,
          redirectUrl: checkoutSession.url,
          checkoutSessionId: checkoutSession.id,
          price,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        console.error("[stripe checkout] failed", err);
        return res
          .status(502)
          .json({ message: `Stripe checkout failed: ${msg}` });
      }
    }

    // Stripe not configured — soft-activate so the rest of the experience can
    // be exercised end-to-end.
    const now = new Date();
    await storage.upsertSubscription(subscriberId, {
      planId,
      interval,
      seats: price.seats,
      status: "active",
      startedAt: now,
      currentPeriodEnd: nextPeriodEnd(now, interval),
      practiceMinutesUsed: 0,
      minutesPeriodStart: now,
    });
    return res.json({
      mode: "demo",
      message:
        "Stripe is not yet connected — the plan was activated in demo mode so you can preview the full experience. Connect Stripe to process real payments.",
      redirectUrl: "/pricing?status=demo-activated",
      price,
    });
  });

  /**
   * Verifies a Stripe checkout session ID after the success redirect, so the
   * local subscription is activated immediately even if the webhook is
   * delayed. Idempotent — safe to call multiple times.
   */
  app.post("/api/billing/verify", async (req, res) => {
    const subscriberId = subscriberIdFor(req);
    const id = String(req.body?.sessionId ?? "");
    if (!/^cs_[A-Za-z0-9_]+$/.test(id)) {
      return res.status(400).json({ message: "Invalid session id" });
    }
    const stripe = await getUncachableStripeClient();
    if (!stripe) {
      return res.json({
        ok: true,
        mode: "demo",
        message: "Stripe not connected; skipping verification.",
      });
    }
    try {
      const session = await stripe.checkout.sessions.retrieve(id);
      if (session.payment_status !== "paid" && session.status !== "complete") {
        return res
          .status(409)
          .json({ ok: false, message: "Checkout not complete." });
      }
      const meta = planFromMetadata(session.metadata);
      // Verify the session belongs to this caller (defense-in-depth against
      // session-id sharing).
      if (meta.subscriberId && meta.subscriberId !== subscriberId) {
        return res
          .status(403)
          .json({ ok: false, message: "Session belongs to a different user." });
      }
      await applyCheckoutSession(session);
      return res.json({ ok: true, mode: "stripe" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      console.error("[stripe verify] failed", err);
      return res.status(502).json({ ok: false, message: msg });
    }
  });

  app.post("/api/billing/portal", async (req, res) => {
    const subscriberId = subscriberIdFor(req);
    const sub = await storage.getSubscription(subscriberId);
    const stripe = await getUncachableStripeClient();
    if (stripe && sub?.stripeCustomerId) {
      try {
        const portal = await stripe.billingPortal.sessions.create({
          customer: sub.stripeCustomerId,
          return_url: `${origin(req)}/pricing`,
        });
        return res.json({
          mode: "stripe",
          sessionUrl: portal.url,
          redirectUrl: portal.url,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        console.error("[stripe portal] failed", err);
        return res
          .status(502)
          .json({ message: `Portal session failed: ${msg}` });
      }
    }
    return res.json({
      mode: "demo",
      message:
        "Subscription management opens in the Stripe customer portal once billing is connected.",
      redirectUrl: "/pricing?status=portal-demo",
    });
  });

  app.post("/api/billing/cancel", async (req, res) => {
    const subscriberId = subscriberIdFor(req);
    const sub = await storage.getSubscription(subscriberId);
    if (!sub || sub.planId === "free") {
      return res.status(404).json({ message: "No active paid subscription." });
    }

    if (sub.stripeSubscriptionId) {
      const stripe = await getUncachableStripeClient();
      if (stripe) {
        try {
          await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
        } catch (err) {
          console.error("[stripe cancel] failed", err);
        }
      }
    }

    const now = new Date();
    await storage.upsertSubscription(subscriberId, {
      planId: "free",
      interval: "monthly",
      seats: 1,
      status: "canceled",
      currentPeriodEnd: nextPeriodEnd(now, "monthly"),
    });
    res.json({ ok: true });
  });
}

/* ------------------------------------------------------------------ */
/*  Server-side entitlement helpers — for use by other route modules.  */
/* ------------------------------------------------------------------ */

export type EntitlementCheck =
  | { ok: true; subscription: Subscription }
  | { ok: false; status: number; code: string; message: string };

export async function checkPracticeMinutes(
  req: Request,
  minutes: number,
): Promise<EntitlementCheck> {
  const subscriberId = subscriberIdFor(req);
  const sub = await storage.rolloverMinutesIfNeeded(subscriberId);
  const plan = getPlan(sub.planId as PlanTier);
  const limit = plan.entitlements.practiceMinutesPerMonth;
  if (limit !== "unlimited") {
    if (sub.practiceMinutesUsed + minutes > limit) {
      return {
        ok: false,
        status: 402,
        code: "practice_minutes_exhausted",
        message: `You've used your ${limit} free practice minutes this month. Upgrade to Pro for unlimited practice.`,
      };
    }
  }
  return { ok: true, subscription: sub };
}

export async function recordPracticeMinutes(
  req: Request,
  minutes: number,
): Promise<void> {
  if (minutes <= 0) return;
  const subscriberId = subscriberIdFor(req);
  await storage.incrementPracticeMinutes(subscriberId, minutes);
}

export async function requireFeature(
  req: Request,
  feature: keyof Subscription extends never ? never : "judgeMode" | "drillMode" | "history" | "highlightClips",
): Promise<EntitlementCheck> {
  const subscriberId = subscriberIdFor(req);
  const sub = await ensureSubscription(subscriberId);
  const plan = getPlan(sub.planId as PlanTier);
  if (!plan.entitlements[feature]) {
    return {
      ok: false,
      status: 403,
      code: `feature_locked:${feature}`,
      message: `Your current plan doesn't include this feature. Upgrade to unlock it.`,
    };
  }
  return { ok: true, subscription: sub };
}

export { TEAM_MIN_SEATS };
