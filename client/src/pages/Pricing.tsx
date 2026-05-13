import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Check, Sparkles, Users, Zap, Crown, ArrowRight,
  ShieldCheck, Star, ExternalLink, Loader2,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import {
  PLANS,
  type BillingInterval,
  type PlanDefinition,
  type PlanTier,
} from "@shared/schema";
import {
  useCurrentSubscription,
  announcePlanChange,
} from "@/lib/plan";

const PLAN_ICONS: Record<PlanTier, React.ComponentType<{ className?: string }>> = {
  free: Zap,
  pro: Sparkles,
  team: Users,
};

function formatPrice(plan: PlanDefinition, interval: BillingInterval) {
  const price = interval === "annual" ? plan.annualPrice : plan.monthlyPrice;
  return price === 0 ? "$0" : `$${price}`;
}

export default function Pricing() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [seats, setSeats] = useState(5);
  const [activatingPlan, setActivatingPlan] = useState<PlanTier | null>(null);
  const { toast } = useToast();
  const [location] = useLocation();
  const { plan: currentPlan, subscription, refresh } = useCurrentSubscription();

  useEffect(() => {
    if (location.includes("status=demo-activated")) {
      toast({
        title: "Plan activated",
        description:
          "Your plan is active. Stripe will handle real billing once it's connected.",
      });
    }
    // After Stripe redirects back with a session_id, immediately verify the
    // checkout server-side so the local subscription is active without
    // waiting on the webhook.
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (params.get("status") === "success" && sessionId) {
      fetch("/api/billing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      })
        .then((r) => r.json())
        .then(() => {
          queryClient.invalidateQueries({
            queryKey: ["/api/billing/subscription"],
          });
          announcePlanChange();
          refresh();
          toast({
            title: "Subscription active",
            description:
              "Your payment was confirmed and your plan is now active.",
          });
          window.history.replaceState({}, "", "/pricing");
        })
        .catch(() => {
          toast({
            title: "Verification pending",
            description:
              "Your payment is processing — your plan will activate momentarily.",
          });
        });
    } else if (params.get("status") === "canceled") {
      toast({
        title: "Checkout canceled",
        description: "No charge was made. You can try again anytime.",
      });
      window.history.replaceState({}, "", "/pricing");
    }
  }, [location, toast, refresh]);

  const checkoutMutation = useMutation({
    mutationFn: async (vars: { planId: PlanTier; interval: BillingInterval; seats?: number }) => {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(vars),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Checkout failed");
      }
      return res.json() as Promise<{
        mode: string;
        message?: string;
        redirectUrl?: string;
        sessionUrl?: string;
      }>;
    },
    onSuccess: (data, vars) => {
      // Real Stripe checkout — redirect to hosted checkout page.
      if (data.mode === "stripe" && data.sessionUrl) {
        window.location.href = data.sessionUrl;
        return;
      }
      // Demo / free path — refresh local state, show toast, optionally
      // navigate to a same-origin status URL.
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      announcePlanChange();
      refresh();
      setActivatingPlan(null);
      toast({
        title:
          vars.planId === "free"
            ? "Switched to Free"
            : `Welcome to ${vars.planId.toUpperCase()}`,
        description:
          data.message ?? "Your plan is active. Manage it anytime from this page.",
      });
    },
    onError: (err: Error) => {
      setActivatingPlan(null);
      toast({
        title: "Checkout failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Portal failed");
      return res.json() as Promise<{
        mode: string;
        message?: string;
        sessionUrl?: string;
        redirectUrl?: string;
      }>;
    },
    onSuccess: (data) => {
      if (data.mode === "stripe" && data.sessionUrl) {
        window.location.href = data.sessionUrl;
        return;
      }
      toast({
        title: "Manage subscription",
        description:
          data.message ?? "The Stripe customer portal will open here once Stripe is connected.",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Cancel failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      announcePlanChange();
      refresh();
      toast({
        title: "Subscription canceled",
        description: "You're back on the Free plan. You can resubscribe anytime.",
      });
    },
  });

  const handleSelect = (plan: PlanDefinition) => {
    if (plan.id === currentPlan.id && subscription?.status === "active") return;
    setActivatingPlan(plan.id);
    checkoutMutation.mutate({
      planId: plan.id,
      interval,
      seats: plan.perSeat ? seats : undefined,
    });
  };

  const annualSavingPct = useMemo(() => {
    const pro = PLANS.find((p) => p.id === "pro")!;
    return Math.round((1 - pro.annualPrice / pro.monthlyPrice) * 100);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Navigation />

      <main className="pt-32 pb-24">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
          </div>
          <div className="relative container mx-auto px-4 md:px-6 text-center max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent mb-6">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Pricing</span>
              </div>
              <h1
                data-testid="text-pricing-heading"
                className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary mb-5 leading-tight"
              >
                Practice more. <span className="gradient-text">Win more.</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                Start free. Upgrade when you need unlimited rounds, AI judging, and
                tools built for teams. Cancel anytime.
              </p>

              {/* Interval toggle */}
              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted border border-border">
                <button
                  data-testid="toggle-monthly"
                  onClick={() => setInterval("monthly")}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    interval === "monthly"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  data-testid="toggle-annual"
                  onClick={() => setInterval("annual")}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                    interval === "annual"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Annual
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent text-white">
                    SAVE {annualSavingPct}%
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Current plan banner */}
        {subscription && (
          <section className="container mx-auto px-4 md:px-6 mt-12">
            <div
              data-testid="banner-current-plan"
              className="max-w-4xl mx-auto rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 shadow-sm"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Current plan
                </p>
                <p className="text-foreground font-semibold">
                  <span data-testid="text-current-plan">{currentPlan.name}</span>
                  {subscription.planId !== "free" && (
                    <span className="text-muted-foreground font-normal ml-2">
                      · {subscription.interval} · renews{" "}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  )}
                  {subscription.status === "canceled" && (
                    <span className="ml-2 text-xs text-accent font-semibold">CANCELED</span>
                  )}
                </p>
              </div>
              {subscription.planId !== "free" && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    data-testid="button-manage-subscription"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                  >
                    Manage subscription
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    data-testid="button-cancel-subscription"
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tier cards */}
        <section className="container mx-auto px-4 md:px-6 mt-10">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {PLANS.map((plan, idx) => {
              const Icon = PLAN_ICONS[plan.id];
              const isCurrent = plan.id === currentPlan.id && subscription?.status === "active";
              const price = formatPrice(plan, interval);
              const isFree = plan.id === "free";
              const isLoading = activatingPlan === plan.id && checkoutMutation.isPending;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className={`relative rounded-2xl border bg-card p-6 sm:p-8 flex flex-col ${
                    plan.highlight
                      ? "border-accent shadow-2xl shadow-accent/10 md:-translate-y-3"
                      : "border-border shadow-sm"
                  }`}
                  data-testid={`card-plan-${plan.id}`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-white text-[11px] font-bold uppercase tracking-wider">
                      Most popular
                    </div>
                  )}
                  {isCurrent && (
                    <div
                      data-testid={`badge-current-${plan.id}`}
                      className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider"
                    >
                      Current
                    </div>
                  )}

                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5" />
                  </div>

                  <h3 className="text-2xl font-display font-bold text-primary mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 min-h-[2.5rem]">
                    {plan.tagline}
                  </p>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        data-testid={`text-price-${plan.id}`}
                        className="text-4xl sm:text-5xl font-bold font-display text-foreground"
                      >
                        {price}
                      </span>
                      {!isFree && (
                        <span className="text-muted-foreground text-sm">
                          /{plan.perSeat ? "seat·" : ""}month
                        </span>
                      )}
                    </div>
                    {!isFree && interval === "annual" && (
                      <p className="text-xs text-accent font-semibold mt-1">
                        Billed annually · save {annualSavingPct}%
                      </p>
                    )}
                    {!isFree && interval === "monthly" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Billed monthly · cancel anytime
                      </p>
                    )}
                    {isFree && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Forever free · no card required
                      </p>
                    )}
                  </div>

                  {plan.perSeat && (
                    <div className="mb-6">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Seats
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          data-testid="button-seats-decrement"
                          onClick={() => setSeats((s) => Math.max(5, s - 1))}
                          className="w-8 h-8 rounded-md border border-border bg-background text-foreground hover:bg-muted"
                        >
                          –
                        </button>
                        <input
                          data-testid="input-seats"
                          type="number"
                          min={5}
                          value={seats}
                          onChange={(e) =>
                            setSeats(Math.max(5, Number(e.target.value) || 5))
                          }
                          className="w-16 h-8 rounded-md border border-border bg-background text-center text-sm"
                        />
                        <button
                          data-testid="button-seats-increment"
                          onClick={() => setSeats((s) => s + 1)}
                          className="w-8 h-8 rounded-md border border-border bg-background text-foreground hover:bg-muted"
                        >
                          +
                        </button>
                        <span className="text-xs text-muted-foreground ml-2">
                          {seats} × ${interval === "annual" ? plan.annualPrice : plan.monthlyPrice}/mo
                        </span>
                      </div>
                    </div>
                  )}

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2.5 text-sm text-foreground"
                      >
                        <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    data-testid={`button-select-${plan.id}`}
                    onClick={() => handleSelect(plan)}
                    disabled={isCurrent || isLoading}
                    className={`w-full h-11 rounded-xl font-semibold ${
                      plan.highlight
                        ? "bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20"
                        : isCurrent
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary text-white hover:bg-primary/90"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Activating…
                      </>
                    ) : isCurrent ? (
                      "Your current plan"
                    ) : (
                      <>
                        {plan.cta}
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8 max-w-2xl mx-auto">
            Prices in USD. Taxes calculated at checkout. By subscribing you agree
            to our Terms of Service and Privacy Policy.
          </p>
        </section>

        {/* Comparison + trust */}
        <section className="container mx-auto px-4 md:px-6 mt-24">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: ShieldCheck,
                title: "30-day refund",
                body: "Not happy? Email us within 30 days for a full refund. No questions asked.",
              },
              {
                icon: Star,
                title: "Built with coaches",
                body: "Designed alongside national-circuit coaches and competitive debaters.",
              },
              {
                icon: Sparkles,
                title: "Always improving",
                body: "New formats, drills, and judge personas ship every few weeks.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-3">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-foreground mb-1.5">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto px-4 md:px-6 mt-24 max-w-3xl">
          <h2 className="text-3xl font-display font-bold text-primary text-center mb-10">
            Pricing questions
          </h2>
          <div className="space-y-3">
            {[
              {
                q: "Can I switch plans later?",
                a: "Yes — upgrade, downgrade, or cancel anytime from the Manage subscription button. Changes take effect at the next billing cycle.",
              },
              {
                q: "What counts as a 'practice minute'?",
                a: "Time spent in an active AI debate round. Reviewing transcripts, reading feedback, and browsing topics don't count.",
              },
              {
                q: "Do you offer school or district pricing?",
                a: "Yes. Team plans start at 5 seats. For 25+ seats or district contracts, contact us for a custom quote.",
              },
              {
                q: "Is there a student discount?",
                a: "Pro is already priced for students. Verified team purchases through a school get an automatic 20% off.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-card p-5"
              >
                <summary className="cursor-pointer font-semibold text-foreground flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-accent text-xl group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
