import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  Sparkles,
  Timer,
  Target,
  Zap,
  MessageSquareWarning,
  Scale,
  Compass,
  ListOrdered,
  Mic,
} from "lucide-react";
import type { DrillType } from "@shared/drills";

type DrillSummary = {
  id: DrillType;
  name: string;
  tagline: string;
  skill: string;
  durationSec: number;
  instructions: string;
  promptCount: number;
};

type DailyDrill = {
  drillId: DrillType;
  name: string;
  tagline: string;
  skill: string;
  durationSec: number;
  prompt: string;
  promptIndex: number;
};

const ICONS: Record<DrillType, React.ComponentType<{ className?: string }>> = {
  "rebuttal-sprint": MessageSquareWarning,
  "cross-examination": Target,
  "impact-calculus": Scale,
  framing: Compass,
  signposting: ListOrdered,
  "extemp-speaking": Mic,
};

const STREAK_KEY = "dm:drill-streak";

type StreakState = {
  count: number;
  lastDate: string; // YYYY-MM-DD
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readStreak(): StreakState {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { count: 0, lastDate: "" };
    const parsed = JSON.parse(raw) as StreakState;
    if (typeof parsed.count !== "number" || typeof parsed.lastDate !== "string") {
      return { count: 0, lastDate: "" };
    }
    // If user missed >1 day, streak is broken (display 0).
    if (parsed.lastDate) {
      const last = new Date(parsed.lastDate + "T00:00:00");
      const today = new Date(todayKey() + "T00:00:00");
      const diffDays = Math.round(
        (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays > 1) return { count: 0, lastDate: "" };
    }
    return parsed;
  } catch {
    return { count: 0, lastDate: "" };
  }
}

export default function Drills() {
  const { data: drillsResp, isLoading } = useQuery<{ drills: DrillSummary[] }>({
    queryKey: ["/api/drills"],
  });
  const { data: daily } = useQuery<DailyDrill>({
    queryKey: ["/api/drills/daily"],
  });
  const { data: session } = useQuery<{ signedIn: boolean; email: string | null }>({
    queryKey: ["/api/auth/session"],
  });

  const [streak, setStreak] = useState<StreakState>({ count: 0, lastDate: "" });
  useEffect(() => {
    setStreak(readStreak());
    const onChange = () => setStreak(readStreak());
    window.addEventListener("dm:drill-completed", onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener("dm:drill-completed", onChange);
      window.removeEventListener("focus", onChange);
    };
  }, []);

  const signedIn = !!session?.signedIn;
  const completedToday = streak.lastDate === todayKey();

  return (
    <div
      className="min-h-screen bg-background font-body text-foreground"
      data-testid="page-drills"
    >
      <Navigation />

      <section className="relative pt-32 pb-10 px-4 overflow-hidden bg-primary">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb orb-delay-1 absolute -top-24 -right-24 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px]" />
          <div className="orb orb-delay-2 absolute -bottom-20 left-1/4 w-[400px] h-[400px] bg-white/[0.05] rounded-full blur-[90px]" />
        </div>
        <div className="container relative z-10 mx-auto max-w-6xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors"
            data-testid="link-back-home"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-medium mb-3">
            <Zap className="w-3.5 h-3.5 text-accent" /> Drill Mode
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight">
            One Minute. <span className="gradient-text">One Skill.</span> Every Day.
          </h1>
          <p className="text-white/75 mt-3 max-w-2xl">
            Short, focused reps to sharpen rebuttals, cross-ex, weighing, framing,
            signposting, and extemp speaking. Lower friction than a full round —
            built for daily habit.
          </p>
          {signedIn && (
            <div
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20"
              data-testid="badge-streak"
            >
              <Flame
                className={`w-4 h-4 ${
                  streak.count > 0 ? "text-accent" : "text-white/50"
                }`}
              />
              <span className="text-sm text-white">
                <span className="font-bold" data-testid="text-streak-count">
                  {streak.count}
                </span>{" "}
                day streak
                {completedToday && (
                  <span className="ml-2 text-white/70 text-xs">
                    · today's drill done
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-10 space-y-10">
        {/* Daily drill highlight */}
        {daily && (
          <Card className="p-6 md:p-8 border-2 border-accent/40 bg-gradient-to-br from-accent/5 to-transparent">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent/15 text-accent text-[10px] font-bold uppercase tracking-wider mb-3">
                  <Sparkles className="w-3 h-3" /> Today's Drill
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-primary">
                  {daily.name}
                </h2>
                <p className="text-muted-foreground mt-1">{daily.tagline}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" /> {daily.durationSec}s
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> {daily.skill}
                  </span>
                </div>
                <blockquote
                  className="mt-4 text-foreground border-l-2 border-accent/60 pl-4 italic"
                  data-testid="text-daily-prompt"
                >
                  {daily.prompt}
                </blockquote>
              </div>
              <Link
                href={`/drills/${daily.drillId}?daily=1`}
                data-testid="button-start-daily"
              >
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-white"
                >
                  Start daily drill <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Catalog */}
        <div>
          <h2 className="font-display text-xl md:text-2xl font-bold text-primary mb-1">
            All drills
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            Pick a skill. You'll get a fresh prompt and a short timer — your reps,
            your call.
          </p>

          {isLoading && (
            <div className="text-muted-foreground text-sm">Loading drills…</div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {drillsResp?.drills.map((d) => {
              const Icon = ICONS[d.id] ?? Zap;
              return (
                <Link
                  key={d.id}
                  href={`/drills/${d.id}`}
                  data-testid={`card-drill-${d.id}`}
                >
                  <Card className="p-5 h-full hover-elevate active-elevate-2 cursor-pointer flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground inline-flex items-center gap-1">
                        <Timer className="w-3 h-3" /> {d.durationSec}s
                      </span>
                    </div>
                    <h3 className="font-display text-base font-bold text-foreground mt-3">
                      {d.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 flex-1">
                      {d.tagline}
                    </p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                      <span className="text-[11px] text-muted-foreground">
                        {d.promptCount} prompts
                      </span>
                      <span className="text-xs font-semibold text-accent inline-flex items-center gap-1">
                        Start <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {!signedIn && (
          <Card className="p-5 bg-muted/40 border-dashed">
            <div className="flex items-start gap-3">
              <Flame className="w-5 h-5 text-accent mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium">
                  Sign in to track your daily drill streak.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your streak counts each day you finish at least one drill.
                </p>
              </div>
              <Link href="/signin">
                <Button size="sm" variant="outline" data-testid="button-streak-signin">
                  Sign in
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

export function recordDrillCompletion() {
  const today = todayKey();
  const current = readStreak();
  if (current.lastDate === today) return current;
  let newCount = 1;
  if (current.lastDate) {
    const last = new Date(current.lastDate + "T00:00:00");
    const todayDate = new Date(today + "T00:00:00");
    const diff = Math.round(
      (todayDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff === 1) newCount = current.count + 1;
  }
  const next = { count: newCount, lastDate: today };
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("dm:drill-completed"));
  return next;
}
