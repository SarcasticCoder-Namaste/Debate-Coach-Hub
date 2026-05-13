import { Link } from "wouter";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEntitlements } from "@/lib/plan";
import type { PlanFeatureKey } from "@shared/schema";

type Props = {
  feature: PlanFeatureKey;
  title: string;
  description?: string;
  requiredPlan?: "pro" | "team";
  children?: React.ReactNode;
  testId?: string;
};

const FEATURE_GATE: Record<PlanFeatureKey, (e: ReturnType<typeof useEntitlements>["entitlements"]) => boolean> = {
  practiceMinutes: (e) => e.practiceMinutesPerMonth === "unlimited",
  judgeMode: (e) => e.judgeMode,
  drillMode: (e) => e.drillMode,
  history: (e) => e.history,
  highlightClips: (e) => e.highlightClips,
  teamSeats: (e) => e.teamSeats > 0,
  prioritySupport: (e) => e.prioritySupport,
};

export function useFeatureAccess(feature: PlanFeatureKey): boolean {
  const { entitlements } = useEntitlements();
  return FEATURE_GATE[feature](entitlements);
}

export function Paywall({
  feature,
  title,
  description,
  requiredPlan = "pro",
  children,
  testId,
}: Props) {
  const allowed = useFeatureAccess(feature);
  if (allowed) return <>{children}</>;

  const planName = requiredPlan === "team" ? "Team" : "Pro";

  return (
    <div
      data-testid={testId ?? `paywall-${feature}`}
      className="relative rounded-2xl border border-border bg-card p-6 sm:p-8 overflow-hidden"
    >
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-semibold uppercase tracking-wide mb-2">
            <Sparkles className="w-3 h-3" />
            {planName} feature
          </div>
          <h3 className="text-lg sm:text-xl font-display font-bold text-foreground mb-1">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Link href="/pricing" data-testid={`paywall-cta-${feature}`}>
          <Button className="bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20 whitespace-nowrap">
            Upgrade to {planName}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
