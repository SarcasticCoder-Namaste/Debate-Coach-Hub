import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navigation } from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, Loader2, MessageSquare, Star, Volume2, AlertTriangle, Send, Sparkles } from "lucide-react";

type Turn = { role: "user" | "assistant"; content: string };
type Feedback = {
  clarity?: { score: number; comment: string };
  structure?: { score: number; comment: string };
  evidence?: { score: number; comment: string };
  delivery?: { score: number; comment: string };
  tip?: string;
} | null;

interface ShareComment {
  id: number;
  shareId: string;
  coachName: string;
  comment: string;
  timestampSec: number;
  createdAt: string;
}

interface ShareData {
  id: string;
  mimeType: string;
  topic: string;
  side: "Aff" | "Neg";
  format: string;
  transcript: Turn[];
  feedback: Feedback;
  createdAt: string;
  expiresAt: string | null;
  videoUrl: string;
  comments: ShareComment[];
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function ScoreRow({ label, item }: { label: string; item?: { score: number; comment: string } }) {
  if (!item) return null;
  return (
    <div data-testid={`share-feedback-${label.toLowerCase()}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-accent fill-accent" />
          <span className="text-sm font-bold text-accent">{item.score}/10</span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
          style={{ width: `${item.score * 10}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{item.comment}</p>
    </div>
  );
}

const SEEN_KEY = (id: string) => `share-comments-seen-${id}`;

export default function SharedClip() {
  const [, params] = useRoute("/share/:id");
  const id = params?.id;
  const { toast } = useToast();

  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const [coachName, setCoachName] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem(SEEN_KEY(id));
      if (raw) setSeenIds(new Set(JSON.parse(raw) as number[]));
    } catch { /* ignore */ }
    try {
      const savedName = localStorage.getItem("share-coach-name");
      if (savedName) setCoachName(savedName);
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/practice/shares/${id}`);
        if (res.status === 404) throw new Error("This clip doesn't exist or has been removed.");
        if (res.status === 410) throw new Error("This clip has expired and is no longer available.");
        if (!res.ok) throw new Error("Could not load this shared clip.");
        const payload = (await res.json()) as ShareData;
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const newCommentCount = useMemo(() => {
    if (!data) return 0;
    return data.comments.filter((c) => !seenIds.has(c.id)).length;
  }, [data, seenIds]);

  function markAllSeen() {
    if (!data || !id) return;
    const all = new Set(data.comments.map((c) => c.id));
    setSeenIds(all);
    try {
      localStorage.setItem(SEEN_KEY(id), JSON.stringify(Array.from(all)));
    } catch { /* ignore */ }
  }

  function seekTo(sec: number) {
    const m = mediaRef.current;
    if (!m) return;
    try {
      m.currentTime = sec;
      void m.play().catch(() => { /* user gesture may be required */ });
    } catch { /* ignore */ }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !data) return;
    const name = coachName.trim();
    const body = comment.trim();
    if (!name) {
      toast({ title: "Add your name", description: "Coaches sign their feedback so students know who it's from.", variant: "destructive" });
      return;
    }
    if (!body) {
      toast({ title: "Comment is empty", description: "Write a quick note before sending.", variant: "destructive" });
      return;
    }
    if (body.length > 1000) {
      toast({ title: "Too long", description: "Keep comments under 1000 characters.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const ts = Math.max(0, Math.floor(mediaRef.current?.currentTime ?? currentTime));
      const res = await fetch(`/api/practice/shares/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachName: name, comment: body, timestampSec: ts }),
      });
      if (res.status === 429) {
        throw new Error("Too many comments — please wait a bit before posting again.");
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Could not save comment");
      }
      const created = (await res.json()) as ShareComment;
      setData((prev) => prev ? { ...prev, comments: [...prev.comments, created].sort((a, b) => a.timestampSec - b.timestampSec || a.id - b.id) } : prev);
      // Mark our own comment as seen so we don't notify ourselves.
      setSeenIds((prev) => {
        const next = new Set(prev);
        next.add(created.id);
        try { localStorage.setItem(SEEN_KEY(id!), JSON.stringify(Array.from(next))); } catch { /* ignore */ }
        return next;
      });
      try { localStorage.setItem("share-coach-name", name); } catch { /* ignore */ }
      setComment("");
      toast({ title: "Comment posted", description: `Tied to ${formatTime(ts)} of the recording.` });
    } catch (err) {
      toast({ title: "Couldn't post", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const isAudioOnly = data?.mimeType?.startsWith("audio/");
  const expiresLabel = data?.expiresAt
    ? new Date(data.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-background font-body text-foreground" data-testid="page-shared-clip">
      <Navigation />

      <section className="pt-32 pb-8 px-4 bg-primary">
        <div className="container mx-auto max-w-4xl">
          <Link
            href="/practice"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-3 transition-colors"
            data-testid="link-back-practice"
          >
            <ArrowLeft className="w-4 h-4" /> Back to practice
          </Link>
          <h1 className="text-2xl md:text-4xl font-display font-bold text-white leading-tight">
            Practice Round Clip
          </h1>
          <p className="text-white/75 mt-2 text-sm">
            Shared from a student's AI practice round. Watch the recording, read the transcript,
            and review the coach feedback.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 py-10 space-y-6">
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground" data-testid="status-loading">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading clip…
          </div>
        )}

        {error && (
          <Card className="p-6 border-destructive/40 bg-destructive/5" data-testid="status-error">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-lg font-bold text-foreground mb-1">Clip unavailable</h2>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {data && (
          <>
            <Card className="p-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-primary">
                  {data.format}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-accent/10 text-accent">
                  {data.side === "Aff" ? "Affirmative" : "Negative"}
                </span>
                {expiresLabel && (
                  <span className="inline-flex items-center gap-1 ml-auto text-xs text-muted-foreground" data-testid="text-expiry">
                    <Clock className="w-3.5 h-3.5" /> Expires {expiresLabel}
                  </span>
                )}
              </div>
              <p className="text-base font-semibold text-foreground leading-snug" data-testid="text-share-topic">
                {data.topic}
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="font-display text-lg font-bold text-primary mb-3">Recording</h2>
              {isAudioOnly ? (
                <audio
                  ref={(el) => { mediaRef.current = el; }}
                  data-testid="share-audio"
                  src={data.videoUrl}
                  controls
                  className="w-full"
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                />
              ) : (
                <video
                  ref={(el) => { mediaRef.current = el; }}
                  data-testid="share-video"
                  src={data.videoUrl}
                  controls
                  playsInline
                  className="w-full rounded-xl bg-black aspect-video"
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                />
              )}
            </Card>

            <Card className="p-6" data-testid="card-coach-comments">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-display text-lg font-bold text-primary flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-accent" /> Coach Comments
                  <span className="text-xs font-normal text-muted-foreground" data-testid="text-comment-count">
                    ({data.comments.length})
                  </span>
                </h2>
                {newCommentCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllSeen}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-accent text-accent-foreground hover-elevate active-elevate-2"
                    data-testid="button-mark-seen"
                  >
                    <Sparkles className="w-3 h-3" /> {newCommentCount} new — mark as seen
                  </button>
                )}
              </div>

              {data.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-6" data-testid="text-no-comments">
                  No comments yet. Coaches: leave the first timestamped note below.
                </p>
              ) : (
                <ul className="space-y-3 mb-6">
                  {data.comments.map((c) => {
                    const isNew = !seenIds.has(c.id);
                    return (
                      <li
                        key={c.id}
                        data-testid={`comment-${c.id}`}
                        className={`p-3 rounded-lg border ${isNew ? "border-accent/50 bg-accent/5" : "border-border bg-muted/30"}`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => seekTo(c.timestampSec)}
                            className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md font-mono text-xs font-bold bg-primary text-primary-foreground hover-elevate active-elevate-2"
                            data-testid={`button-seek-${c.id}`}
                            aria-label={`Jump to ${formatTime(c.timestampSec)}`}
                          >
                            <Clock className="w-3 h-3" /> {formatTime(c.timestampSec)}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-semibold text-foreground" data-testid={`text-coach-name-${c.id}`}>
                                {c.coachName}
                              </span>
                              {isNew && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold bg-accent text-accent-foreground" data-testid={`badge-new-${c.id}`}>
                                  New
                                </span>
                              )}
                              <span className="text-[11px] text-muted-foreground ml-auto">
                                {new Date(c.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap break-words" data-testid={`text-comment-body-${c.id}`}>
                              {c.comment}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <form onSubmit={submitComment} className="space-y-3 pt-4 border-t border-border" data-testid="form-comment">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <Input
                    placeholder="Your name (e.g. Coach Rivera)"
                    value={coachName}
                    onChange={(e) => setCoachName(e.target.value)}
                    maxLength={60}
                    className="md:max-w-xs"
                    data-testid="input-coach-name"
                  />
                  <div className="text-xs text-muted-foreground">
                    Posting at{" "}
                    <span className="font-mono font-bold text-foreground" data-testid="text-current-time">
                      {formatTime(mediaRef.current?.currentTime ?? currentTime)}
                    </span>{" "}
                    — pause the recording at the moment you want to comment on.
                  </div>
                </div>
                <Textarea
                  placeholder="Leave a quick note for the student. Tie your feedback to what's happening at this timestamp."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  data-testid="textarea-comment"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {comment.length}/1000
                  </span>
                  <Button type="submit" disabled={submitting} data-testid="button-submit-comment">
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Posting…</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" /> Post comment</>
                    )}
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="p-6">
              <h2 className="font-display text-lg font-bold text-primary mb-3">Transcript</h2>
              <div className="space-y-3">
                {data.transcript.map((t, i) => (
                  <div
                    key={i}
                    data-testid={`share-turn-${i}`}
                    className={`p-3 rounded-lg text-sm leading-relaxed ${
                      t.role === "user"
                        ? "bg-primary/10 border-l-4 border-primary"
                        : "bg-accent/10 border-l-4 border-accent"
                    }`}
                  >
                    <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${
                      t.role === "user" ? "text-primary" : "text-accent"
                    }`}>
                      {t.role === "user" ? "Student" : "Opponent"}
                    </div>
                    <div className="text-foreground/90 whitespace-pre-wrap">{t.content}</div>
                  </div>
                ))}
              </div>
            </Card>

            {data.feedback && (
              <Card className="p-6 border-accent/40" data-testid="card-share-feedback">
                <h3 className="font-display text-lg font-bold text-primary mb-4 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-accent" /> Coach Feedback
                </h3>
                <div className="space-y-4">
                  <ScoreRow label="Clarity" item={data.feedback.clarity} />
                  <ScoreRow label="Structure" item={data.feedback.structure} />
                  <ScoreRow label="Evidence" item={data.feedback.evidence} />
                  <ScoreRow label="Delivery" item={data.feedback.delivery} />
                </div>
                {data.feedback.tip && (
                  <div className="mt-5 pt-4 border-t border-border bg-primary/5 -mx-6 px-6 py-3 rounded-b-lg">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-accent mb-1">
                      Coach's Tip
                    </div>
                    <p className="text-sm text-foreground" data-testid="text-share-tip">{data.feedback.tip}</p>
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </section>
    </div>
  );
}
