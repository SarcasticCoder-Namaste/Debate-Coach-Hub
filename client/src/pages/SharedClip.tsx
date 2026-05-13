import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { ArrowLeft, Clock, Loader2, Star, Volume2, AlertTriangle } from "lucide-react";

type Turn = { role: "user" | "assistant"; content: string };
type Feedback = {
  clarity?: { score: number; comment: string };
  structure?: { score: number; comment: string };
  evidence?: { score: number; comment: string };
  delivery?: { score: number; comment: string };
  tip?: string;
} | null;

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

export default function SharedClip() {
  const [, params] = useRoute("/share/:id");
  const id = params?.id;

  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
                  data-testid="share-audio"
                  src={data.videoUrl}
                  controls
                  className="w-full"
                />
              ) : (
                <video
                  data-testid="share-video"
                  src={data.videoUrl}
                  controls
                  playsInline
                  className="w-full rounded-xl bg-black aspect-video"
                />
              )}
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
