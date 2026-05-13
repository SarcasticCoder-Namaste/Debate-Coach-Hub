import { useMemo, useState } from "react";
import { Link, Redirect } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  History as HistoryIcon, Calendar, Star, Trash2, ChevronDown, Loader2,
  Mic, ArrowLeft, Sparkles, Trophy,
} from "lucide-react";
import type { PracticeRound } from "@shared/schema";

function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function avgScore(round: PracticeRound): number | null {
  const f = round.feedback;
  if (!f) return null;
  if (typeof f.overallScore !== "number") return null;
  // overallScore is 0-100; History card UI displays out of 10.
  return Math.round((f.overallScore / 10) * 10) / 10;
}

export default function History() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const { data: rounds, isLoading } = useQuery<PracticeRound[]>({
    queryKey: ["/api/practice/rounds"],
    enabled: !!user,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/practice/rounds/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/rounds"] });
      toast({ title: "Round deleted", description: "The practice round was removed." });
    },
    onError: () =>
      toast({ title: "Couldn't delete", description: "Please try again.", variant: "destructive" }),
    onSettled: () => setPendingDelete(null),
  });

  const stats = useMemo(() => {
    if (!rounds || rounds.length === 0) return null;
    const scored = rounds.map(avgScore).filter((s): s is number => s !== null);
    const best = scored.length ? Math.max(...scored) : null;
    const avg = scored.length
      ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10
      : null;
    return { total: rounds.length, best, avg };
  }, [rounds]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Redirect to="/signin" />;

  return (
    <div className="min-h-screen bg-background font-body text-foreground" data-testid="page-history">
      <Navigation />

      <section className="relative pt-32 pb-10 px-4 overflow-hidden bg-primary">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb orb-delay-1 absolute -top-24 -right-24 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px]" />
        </div>
        <div className="container relative z-10 mx-auto max-w-5xl">
          <Link
            href="/practice"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors"
            data-testid="link-back-practice"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Practice Bot
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-medium mb-3">
            <HistoryIcon className="w-3.5 h-3.5 text-accent" /> Your Practice History
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight">
            Every round, <span className="gradient-text">in one place.</span>
          </h1>
          <p className="text-white/75 mt-3 max-w-2xl">
            Revisit transcripts, replay coach feedback, and track how your scores climb over time.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-10 space-y-6">
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5" data-testid="stat-total-rounds">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Mic className="w-5 h-5 text-primary" /></div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Rounds saved</div>
                </div>
              </div>
            </Card>
            <Card className="p-5" data-testid="stat-avg-score">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10"><Sparkles className="w-5 h-5 text-accent" /></div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.avg ?? "—"}{stats.avg !== null && <span className="text-sm font-normal text-muted-foreground">/10</span>}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Average score</div>
                </div>
              </div>
            </Card>
            <Card className="p-5" data-testid="stat-best-score">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10"><Trophy className="w-5 h-5 text-accent" /></div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.best ?? "—"}{stats.best !== null && <span className="text-sm font-normal text-muted-foreground">/10</span>}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Best round</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && rounds && rounds.length === 0 && (
          <Card className="p-10 text-center" data-testid="empty-history">
            <HistoryIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display text-xl font-bold text-primary mb-1">No saved rounds yet</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Run a practice round and request a coach feedback card — it'll be saved here automatically.
            </p>
            <Link href="/practice">
              <Button className="bg-accent text-white hover:bg-accent/90" data-testid="button-start-round">
                <Mic className="w-4 h-4 mr-2" /> Start a practice round
              </Button>
            </Link>
          </Card>
        )}

        {rounds && rounds.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {rounds.map((r) => {
                const isOpen = expanded === r.id;
                const score = avgScore(r);
                return (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="overflow-hidden" data-testid={`round-card-${r.id}`}>
                      <button
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                        data-testid={`button-toggle-round-${r.id}`}
                        className="w-full text-left p-5 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                {r.format}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-semibold">
                                {r.side === "Aff" ? "Affirmative" : "Negative"}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" /> {formatDate(r.createdAt)}
                              </span>
                            </div>
                            <p className="font-semibold text-foreground text-sm leading-snug" data-testid={`text-topic-${r.id}`}>
                              {r.topic}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {score !== null ? (
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10" data-testid={`score-${r.id}`}>
                                <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                                <span className="text-sm font-bold text-accent">{score}/10</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No feedback</span>
                            )}
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="body"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden border-t border-border"
                          >
                            <div className="p-5 space-y-5">
                              {r.feedback && (
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="text-xs uppercase tracking-wider font-bold text-accent">Coach Feedback</div>
                                    <span className="text-xs font-bold text-accent" data-testid={`fb-overall-${r.id}`}>
                                      Overall {r.feedback.overallScore}/100
                                    </span>
                                  </div>
                                  <div className="grid sm:grid-cols-2 gap-3">
                                    {(["clarity", "pace", "fillers", "structure", "rebuttal"] as const).map((k) => {
                                      const v = r.feedback?.subscores?.[k];
                                      if (!v) return null;
                                      return (
                                        <div key={k} className="p-3 rounded-lg bg-muted/40" data-testid={`fb-${k}-${r.id}`}>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-semibold capitalize text-foreground">{k}</span>
                                            <span className="text-xs font-bold text-accent">{v.score}/100</span>
                                          </div>
                                          <p className="text-xs text-muted-foreground">{v.comment}</p>
                                          {v.suggestion && (
                                            <p className="text-xs text-foreground/80 mt-1">
                                              <span className="font-semibold text-accent">Try:</span> {v.suggestion}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {(r.feedback.strengths?.length ?? 0) + (r.feedback.weaknesses?.length ?? 0) > 0 && (
                                    <div className="mt-3 grid sm:grid-cols-2 gap-3">
                                      {r.feedback.strengths?.length > 0 && (
                                        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                          <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 mb-1">Strengths</div>
                                          <ul className="text-xs text-foreground/90 space-y-1">
                                            {r.feedback.strengths.map((s, i) => (
                                              <li key={i} className="flex gap-1.5"><span className="text-emerald-500">✓</span><span>{s}</span></li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {r.feedback.weaknesses?.length > 0 && (
                                        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                          <div className="text-[10px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 mb-1">Areas to work on</div>
                                          <ul className="text-xs text-foreground/90 space-y-1">
                                            {r.feedback.weaknesses.map((w, i) => (
                                              <li key={i} className="flex gap-1.5"><span className="text-amber-500">→</span><span>{w}</span></li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div>
                                <div className="text-xs uppercase tracking-wider font-bold text-primary mb-2">Transcript</div>
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                  {r.transcript.map((t, i) => (
                                    <div
                                      key={i}
                                      data-testid={`transcript-${r.id}-${i}`}
                                      className={`p-3 rounded-lg text-sm leading-relaxed ${
                                        t.role === "user"
                                          ? "bg-primary/10 border-l-4 border-primary"
                                          : "bg-accent/10 border-l-4 border-accent"
                                      }`}
                                    >
                                      <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${
                                        t.role === "user" ? "text-primary" : "text-accent"
                                      }`}>
                                        {t.role === "user" ? "You" : "Opponent"}
                                      </div>
                                      <div className="text-foreground/90">{t.content}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                                <Link href="/practice">
                                  <Button variant="outline" size="sm" data-testid={`button-replay-${r.id}`}>
                                    <Mic className="w-3.5 h-3.5 mr-1.5" /> Run another round
                                  </Button>
                                </Link>
                                {pendingDelete === r.id ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Delete this round?</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setPendingDelete(null)}
                                      data-testid={`button-cancel-delete-${r.id}`}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => remove.mutate(r.id)}
                                      disabled={remove.isPending}
                                      className="bg-accent text-white hover:bg-accent/90"
                                      data-testid={`button-confirm-delete-${r.id}`}
                                    >
                                      {remove.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete"}
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setPendingDelete(r.id)}
                                    className="text-muted-foreground hover:text-accent"
                                    data-testid={`button-delete-${r.id}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                                  </Button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}
