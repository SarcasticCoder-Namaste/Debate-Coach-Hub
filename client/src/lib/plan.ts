import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPlan,
  type PlanDefinition,
  type PlanTier,
  type Entitlements,
  type BillingInterval,
} from "@shared/schema";

type SubscriptionState = {
  planId: PlanTier;
  interval: BillingInterval;
  seats: number;
  status: "active" | "canceled" | "past_due";
  startedAt: string;
  currentPeriodEnd: string;
  practiceMinutesUsed: number;
  minutesPeriodStart: string;
};

type SubscriptionResponse = {
  subscription: SubscriptionState;
  plan: PlanDefinition;
};

export function useCurrentSubscription() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const onStorage = () => setTick((n) => n + 1);
    window.addEventListener("dm:plan-changed", onStorage);
    return () => {
      window.removeEventListener("dm:plan-changed", onStorage);
    };
  }, []);

  const query = useQuery<SubscriptionResponse>({
    queryKey: ["/api/billing/subscription"],
    queryFn: async () => {
      const res = await fetch("/api/billing/subscription", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load subscription");
      return res.json();
    },
  });

  const refresh = useCallback(() => {
    query.refetch();
  }, [query]);

  return {
    isLoading: query.isLoading,
    subscription: query.data?.subscription,
    plan: query.data?.plan ?? getPlan("free"),
    refresh,
  };
}

export function useEntitlements(): {
  isLoading: boolean;
  plan: PlanDefinition;
  entitlements: Entitlements;
} {
  const { isLoading, plan } = useCurrentSubscription();
  return { isLoading, plan, entitlements: plan.entitlements };
}

export function announcePlanChange() {
  window.dispatchEvent(new Event("dm:plan-changed"));
}
