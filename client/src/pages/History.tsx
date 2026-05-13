import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Loader2,
  Trophy,
  Flame,
  Sparkles,
  ChartLine,
  Star,
  Trash2,
  Pencil,
  Mic,
  Calendar,
  ArrowRight,
  LogIn,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import type { FeedbackReport, PracticeTurn } from "@shared/schema";

type SessionListItem = {
  id: string;
  title: string | null;
  topic: string;
  side: "Aff" | "Neg";
  format: string;
  durationSec: number;
  hasMedia: boolean;
  mimeType: string | null;
  overallScore: number | null;
  isFavorite: boolean;
  createdAt: string;
};

type SessionDetail = SessionListItem & {
  transcript: PracticeTurn[];
  feedback: FeedbackReport | null;
  videoUrl: string | null;
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDuration(sec: number) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function computeStreak(rows: SessionListItem[]): number {
  if (rows.length === 0) return 0;
  const days = new Set(
    rows.map((r) => new Date(r.createdAt).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  // If today not present, start from yesterday so a streak isn't broken before midnight.
  const today = cursor.toISOString().slice(0, 10);
  if (!days.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (;;) {
    const k = cursor.toISOString().slice(0, 10);
    if (days.has(k)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function SignedOutPrompt() {
  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Navigation />
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card className="p-8 text-center" data-testid="card-history-signin">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4">
              <Trophy className="w-7 h-7" />
            </div>
            <h1 className="font-display text-3xl font-bold text-primary mb-2">
              Save your practice progress
            </h1>
            <p className="text-muted-foreground mb-6">
              Sign in to save every practice round, track your score over time,
              and re-watch your speeches whenever you want.
            </p>
            <Link href="/signin" data-testid="link-signin-history">
              <Button className="bg-accent hover:bg-accent/90 text-white">
                <LogIn className="w-4 h-4 mr-2" /> Sign in to view your dashboard
              </Button>
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}

export default function History() {
  const { toast } = useToast();

  const sessionAuth = useQuery<{ email: string | null; signedIn: boolean }>({
    queryKey: ["/api/auth/session"],
  });

  const list = useQuery<{ sessions: SessionListItem[] }>({
    queryKey: ["/api/practice/sessions"],
    enabled: !!sessionAuth.data?.signedIn,
  });

  const [openId, setOpenId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const detail = useQuery<SessionDetail>({
    queryKey: ["/api/practice/sessions", openId],
    enabled: !!openId,
  });

  const patchMut = useMutation({
    mutationFn: async (vars: {
      id: string;
      title?: string;
      isFavorite?: boolean;
    }) => {
      const { id, ...body } = vars;
      await apiRequest("PATCH", `/api/practice/sessions/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/sessions"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/practice/sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/sessions"] });
      toast({ title: "Session deleted" });
      setConfirmDeleteId(null);
      setOpenId(null);
    },
    onError: () => {
      toast({
        title: "Couldn't delete",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const sessions = list.data?.sessions ?? [];

  const stats = useMemo(() => {
    const scored = sessions.filter((s) => s.overallScore != null);
    const avg = scored.length
      ? Math.round(
          scored.reduce((acc, s) => acc + (s.overallScore ?? 0), 0) /
            scored.length,
        )
      : null;
    return {
      total: sessions.length,
      streak: computeStreak(sessions),
      avg,
    };
  }, [sessions]);

  const chartData = useMemo(() => {
    return sessions
      .filter((s) => s.overallScore != null)
      .slice()
      .reverse()
      .map((s, idx) => ({
        idx: idx + 1,
        score: s.overallScore as number,
        date: fmtDate(s.createdAt),
      }));
  }, [sessions]);

  if (sessionAuth.isLoading) {
    return (
      <div className="min-h-screen bg-background font-body text-foreground">
        <Navigation />
        <div className="pt-32 px-4 container mx-auto flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  if (!sessionAuth.data?.signedIn) {
    return <SignedOutPrompt />;
  }

  return (
    <div
      className="min-h-screen bg-background font-body text-foreground"
      data-testid="page-history"
    >
      <Navigation />

      {/* Hero */}
      <section className="relative pt-32 pb-10 px-4 overflow-hidden bg-primary">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb orb-delay-1 absolute -top-24 -right-24 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px]" />
        </div>
        <div className="container relative z-10 mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-accent" /> My Practice
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight">
            Your debate <span className="gradient-text">progress.</span>
          </h1>
          <p className="text-white/75 mt-3 max-w-2xl">
            Every round you save lives here. Track your score over time, re-watch your
            speeches, and revisit the coach's report whenever you need it.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-10 space-y-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="p-5" data-testid="stat-total">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Total rounds
                </div>
                <div
                  className="text-2xl font-display font-bold text-foreground"
                  data-testid="text-stat-total"
                >
                  {stats.total}
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-5" data-testid="stat-streak">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Current streak
                </div>
                <div
                  className="text-2xl font-display font-bold text-foreground"
                  data-testid="text-stat-streak"
                >
                  {stats.streak} {stats.streak === 1 ? "day" : "days"}
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-5" data-testid="stat-avg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Average score
                </div>
                <div
                  className="text-2xl font-display font-bold text-foreground"
                  data-testid="text-stat-avg"
                >
                  {stats.avg ?? "—"}
                  {stats.avg != null && (
                    <span className="text-sm text-muted-foreground font-normal">
                      /100
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Chart */}
        <Card className="p-6" data-testid="card-chart">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-primary flex items-center gap-2">
              <ChartLine className="w-5 h-5 text-accent" /> Score over time
            </h2>
          </div>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Save a round with a feedback card to start charting your progress.
            </p>
          ) : (
            <div className="h-64" data-testid="chart-score">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="idx" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(_label, payload) =>
                      payload?.[0]?.payload?.date ?? ""
                    }
                    formatter={(v: number) => [`${v} / 100`, "Score"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--accent))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* List */}
        <Card className="p-6" data-testid="card-sessions-list">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-primary">
              Past sessions
            </h2>
            <Link
              href="/practice"
              data-testid="link-practice-from-history"
              className="text-sm font-semibold text-accent hover:underline inline-flex items-center gap-1"
            >
              Start a new round <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {list.isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          {!list.isLoading && sessions.length === 0 && (
            <div className="text-center py-12" data-testid="empty-history">
              <p className="text-muted-foreground mb-4">
                No saved sessions yet. Run a practice round and tap{" "}
                <span className="font-semibold text-foreground">
                  Save to My Practice
                </span>{" "}
                when you're done.
              </p>
              <Link href="/practice">
                <Button className="bg-accent hover:bg-accent/90 text-white">
                  <Mic className="w-4 h-4 mr-2" /> Start a practice round
                </Button>
              </Link>
            </div>
          )}

          {sessions.length > 0 && (
            <ul className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {sessions.map((s) => (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    data-testid={`row-session-${s.id}`}
                    className="py-3 flex items-start gap-3"
                  >
                    <button
                      type="button"
                      data-testid={`button-favorite-${s.id}`}
                      onClick={() =>
                        patchMut.mutate({ id: s.id, isFavorite: !s.isFavorite })
                      }
                      className="mt-1 text-muted-foreground hover:text-amber-500"
                      aria-label={s.isFavorite ? "Unfavorite" : "Favorite"}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          s.isFavorite ? "fill-amber-400 text-amber-400" : ""
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenId(s.id)}
                      data-testid={`button-open-${s.id}`}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-primary">
                          {s.format}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-accent/10 text-accent">
                          {s.side === "Aff" ? "Aff" : "Neg"}
                        </span>
                        <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {fmtDate(s.createdAt)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          · {fmtDuration(s.durationSec)}
                        </span>
                        {s.overallScore != null && (
                          <span
                            data-testid={`text-score-${s.id}`}
                            className="ml-auto text-sm font-bold text-accent"
                          >
                            {s.overallScore}
                            <span className="text-xs text-muted-foreground font-normal">
                              /100
                            </span>
                          </span>
                        )}
                      </div>
                      <div
                        className="text-sm font-semibold text-foreground truncate"
                        data-testid={`text-title-${s.id}`}
                      >
                        {s.title || s.topic}
                      </div>
                      {s.title && (
                        <div className="text-xs text-muted-foreground truncate">
                          {s.topic}
                        </div>
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-testid={`button-rename-${s.id}`}
                        onClick={() => {
                          setRenameId(s.id);
                          setRenameValue(s.title || "");
                        }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                        aria-label="Rename"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        data-testid={`button-delete-${s.id}`}
                        onClick={() => setConfirmDeleteId(s.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Card>
      </section>

      {/* Detail dialog */}
      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          data-testid="dialog-session-detail"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              {detail.data?.title || detail.data?.topic || "Session detail"}
            </DialogTitle>
          </DialogHeader>
          {detail.isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading session…
            </div>
          )}
          {detail.data && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-primary">
                  {detail.data.format}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-accent/10 text-accent">
                  {detail.data.side === "Aff" ? "Affirmative" : "Negative"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {fmtDate(detail.data.createdAt)} ·{" "}
                  {fmtDuration(detail.data.durationSec)}
                </span>
              </div>
              {detail.data.title && (
                <p className="text-sm text-foreground/80">{detail.data.topic}</p>
              )}

              {detail.data.videoUrl && (
                <div data-testid="detail-media">
                  {detail.data.mimeType?.startsWith("audio/") ? (
                    <audio
                      controls
                      src={detail.data.videoUrl}
                      className="w-full"
                    />
                  ) : (
                    <video
                      controls
                      playsInline
                      src={detail.data.videoUrl}
                      className="w-full rounded-lg bg-black aspect-video"
                    />
                  )}
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">
                  Transcript
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {detail.data.transcript.map((t, i) => (
                    <div
                      key={i}
                      data-testid={`detail-turn-${i}`}
                      className={`p-3 rounded-lg text-sm leading-relaxed ${
                        t.role === "user"
                          ? "bg-primary/10 border-l-4 border-primary"
                          : "bg-accent/10 border-l-4 border-accent"
                      }`}
                    >
                      <div
                        className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${
                          t.role === "user" ? "text-primary" : "text-accent"
                        }`}
                      >
                        {t.role === "user" ? "You" : "Opponent"}
                      </div>
                      <div className="text-foreground/90 whitespace-pre-wrap">
                        {t.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {detail.data.feedback && (
                <div>
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">
                    Coach Report
                  </h3>
                  <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-display font-bold text-accent">
                        {detail.data.feedback.overallScore}
                      </span>
                      <span className="text-sm text-muted-foreground">/100 overall</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                      {(
                        ["clarity", "pace", "fillers", "structure", "rebuttal"] as const
                      ).map((k) => (
                        <div
                          key={k}
                          className="bg-background rounded-md p-2 border border-border"
                          data-testid={`detail-sub-${k}`}
                        >
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                            {k}
                          </div>
                          <div className="text-lg font-bold text-foreground">
                            {detail.data.feedback?.subscores?.[k]?.score ?? "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                    {detail.data.feedback.strengths?.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                          Strengths
                        </div>
                        <ul className="text-xs space-y-1">
                          {detail.data.feedback.strengths.map((s, i) => (
                            <li key={i} className="text-foreground/90">
                              ✓ {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {detail.data.feedback.weaknesses?.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 mb-1">
                          Areas to work on
                        </div>
                        <ul className="text-xs space-y-1">
                          {detail.data.feedback.weaknesses.map((w, i) => (
                            <li key={i} className="text-foreground/90">
                              → {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex flex-row justify-between sm:justify-between gap-2">
            {openId && (
              <Button
                variant="outline"
                onClick={() => {
                  if (!detail.data) return;
                  setRenameId(detail.data.id);
                  setRenameValue(detail.data.title || "");
                }}
                data-testid="button-rename-detail"
              >
                <Pencil className="w-4 h-4 mr-1.5" /> Rename
              </Button>
            )}
            {openId && (
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteId(openId)}
                data-testid="button-delete-detail"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameId} onOpenChange={(o) => !o && setRenameId(null)}>
        <DialogContent data-testid="dialog-rename">
          <DialogHeader>
            <DialogTitle>Rename session</DialogTitle>
          </DialogHeader>
          <input
            data-testid="input-rename"
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Give this round a memorable name"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameId(null)}
              data-testid="button-rename-cancel"
            >
              Cancel
            </Button>
            <Button
              data-testid="button-rename-save"
              onClick={() => {
                if (!renameId) return;
                const v = renameValue.trim();
                if (!v) return;
                patchMut.mutate(
                  { id: renameId, title: v },
                  {
                    onSuccess: () => {
                      toast({ title: "Renamed" });
                      setRenameId(null);
                      if (openId) {
                        queryClient.invalidateQueries({
                          queryKey: ["/api/practice/sessions", openId],
                        });
                      }
                    },
                  },
                );
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
      >
        <AlertDialogContent data-testid="dialog-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the recording, transcript, and scorecard.
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-delete-confirm"
              onClick={() => confirmDeleteId && deleteMut.mutate(confirmDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
