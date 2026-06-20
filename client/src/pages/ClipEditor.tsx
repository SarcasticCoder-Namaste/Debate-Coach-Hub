import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowLeft,
  Sparkles,
  Scissors,
  Download,
  Copy,
  ExternalLink,
  Wand2,
  Film,
} from "lucide-react";
import type { FeedbackReport, PracticeTurn } from "@shared/schema";
import { CLIP_MAX_SEC, CLIP_MIN_SEC } from "@shared/schema";

type SessionDetail = {
  id: string;
  title: string | null;
  topic: string;
  side: "Aff" | "Neg";
  format: string;
  durationSec: number;
  mimeType: string | null;
  hasMedia: boolean;
  transcript: PracticeTurn[];
  feedback: FeedbackReport | null;
  overallScore: number | null;
  createdAt: string;
  videoUrl: string | null;
};

type CreatedClip = {
  id: string;
  url: string;
  downloadUrl: string;
  posterUrl: string | null;
  startSec: number;
  endSec: number;
  durationSec: number;
  sizeBytes: number;
};

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function ClipEditor() {
  const [, params] = useRoute("/clips/new/:sessionId");
  const sessionId = params?.sessionId;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const sessionAuth = useQuery<{ email: string | null; signedIn: boolean }>({
    queryKey: ["/api/auth/session"],
  });

  const detail = useQuery<SessionDetail>({
    queryKey: ["/api/practice/sessions", sessionId],
    enabled: !!sessionId && !!sessionAuth.data?.signedIn,
  });

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaDur, setMediaDur] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(CLIP_MIN_SEC);
  const [overlayName, setOverlayName] = useState("");
  const [overlayTopic, setOverlayTopic] = useState(true);
  const [overlayScoreOn, setOverlayScoreOn] = useState(true);
  const [overlayWatermark, setOverlayWatermark] = useState(true);

  const [suggesting, setSuggesting] = useState(false);
  const [suggestionReason, setSuggestionReason] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [created, setCreated] = useState<CreatedClip | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialise window once we know media duration.
  useEffect(() => {
    if (!detail.data) return;
    const total = Math.floor(detail.data.durationSec || mediaDur || 0);
    if (total <= 0) return;
    const target = Math.min(CLIP_MAX_SEC, Math.max(CLIP_MIN_SEC, Math.min(30, total)));
    const start = Math.max(0, Math.floor((total - target) / 2));
    setStartSec(start);
    setEndSec(Math.min(total, start + target));
  }, [detail.data, mediaDur]);

  const totalSec = useMemo(() => {
    return Math.max(
      Math.floor(mediaDur || 0),
      Math.floor(detail.data?.durationSec || 0),
    );
  }, [mediaDur, detail.data?.durationSec]);

  const clipDur = endSec - startSec;
  const isAudio = detail.data?.mimeType?.startsWith("audio/") ?? false;
  const shareOrigin = typeof window !== "undefined" ? window.location.origin : "";

  function clampWindow(start: number, end: number): { start: number; end: number } {
    const total = totalSec || end;
    let s = Math.max(0, Math.min(total, Math.floor(start)));
    let e = Math.max(s + CLIP_MIN_SEC, Math.min(total, Math.floor(end)));
    if (e - s > CLIP_MAX_SEC) e = s + CLIP_MAX_SEC;
    if (e - s < CLIP_MIN_SEC) e = Math.min(total, s + CLIP_MIN_SEC);
    if (e > total) {
      e = total;
      s = Math.max(0, e - Math.max(CLIP_MIN_SEC, Math.min(CLIP_MAX_SEC, e - s)));
    }
    return { start: s, end: e };
  }

  function setIn(v: number) {
    const { start, end } = clampWindow(v, endSec < v + CLIP_MIN_SEC ? v + CLIP_MIN_SEC : endSec);
    setStartSec(start);
    setEndSec(end);
  }
  function setOut(v: number) {
    const { start, end } = clampWindow(startSec, v);
    setStartSec(start);
    setEndSec(end);
  }

  function previewWindow() {
    const m = mediaRef.current;
    if (!m) return;
    try {
      m.currentTime = startSec;
      void m.play().catch(() => {});
    } catch {/* ignore */}
  }

  // While playing, snap back to start when crossing endSec so preview loops the trim window.
  useEffect(() => {
    const m = mediaRef.current;
    if (!m) return;
    const onTime = () => {
      const t = m.currentTime;
      setCurrentTime(t);
      if (t > endSec) {
        m.currentTime = startSec;
      }
    };
    m.addEventListener("timeupdate", onTime);
    return () => m.removeEventListener("timeupdate", onTime);
  }, [startSec, endSec, mediaReady]);

  async function suggestHighlight() {
    if (!sessionId || suggesting) return;
    setSuggesting(true);
    setSuggestionReason(null);
    try {
      const res = await fetch(`/api/practice/sessions/${sessionId}/clip-suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Suggestion failed");
      }
      const j = (await res.json()) as { startSec: number; endSec: number; reason: string };
      const { start, end } = clampWindow(j.startSec, j.endSec);
      setStartSec(start);
      setEndSec(end);
      setSuggestionReason(j.reason);
      const m = mediaRef.current;
      if (m) {
        try { m.currentTime = start; } catch {/* ignore */}
      }
      toast({
        title: "AI picked a moment",
        description: j.reason,
      });
    } catch (err) {
      toast({
        title: "Couldn't suggest a highlight",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSuggesting(false);
    }
  }

  async function exportClip() {
    if (!sessionId || exporting) return;
    if (clipDur < CLIP_MIN_SEC) {
      toast({ title: "Clip too short", description: `At least ${CLIP_MIN_SEC} seconds.`, variant: "destructive" });
      return;
    }
    setExporting(true);
    setCreated(null);
    try {
      const body = {
        startSec,
        endSec,
        overlayName: overlayName.trim() || null,
        overlayTopic,
        overlayScore:
          overlayScoreOn && detail.data?.overallScore != null
            ? detail.data.overallScore
            : null,
        overlayWatermark,
      };
      const res = await fetch(`/api/practice/sessions/${sessionId}/clips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Export failed");
      }
      const c = (await res.json()) as CreatedClip;
      setCreated(c);
      toast({ title: "Clip ready", description: "Share the link or download the MP4." });
    } catch (err) {
      toast({
        title: "Couldn't export clip",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  async function copyLink() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(shareOrigin + created.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Copy failed", description: "Select and copy manually.", variant: "destructive" });
    }
  }

  if (sessionAuth.isLoading) {
    return (
      <div className="min-h-screen bg-background"><Navigation />
        <div className="pt-32 px-4 container mx-auto flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      </div>
    );
  }
  if (!sessionAuth.data?.signedIn) {
    return (
      <div className="min-h-screen bg-background"><Navigation />
        <section className="pt-32 px-4 container mx-auto max-w-xl">
          <Card className="p-6">
            <h1 className="font-display text-xl font-bold text-primary mb-2">Sign in to create clips</h1>
            <p className="text-sm text-muted-foreground mb-4">Highlight clips are tied to your saved practice sessions.</p>
            <Link href="/signin"><Button>Sign in</Button></Link>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground" data-testid="page-clip-editor">
      <Navigation />
      <section className="pt-32 pb-6 px-4 bg-primary">
        <div className="container mx-auto max-w-4xl">
          <Link
            href="/history"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-3 transition-colors"
            data-testid="link-back-history"
          >
            <ArrowLeft className="w-4 h-4" /> Back to history
          </Link>
          <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider mb-2">
            <Film className="w-4 h-4" /> Highlight Clip Editor
          </div>
          <h1 className="text-2xl md:text-4xl font-display font-bold text-white leading-tight">
            Cut a {CLIP_MIN_SEC}–{CLIP_MAX_SEC}s highlight from your round
          </h1>
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 py-8 space-y-5">
        {detail.isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading session…
          </div>
        )}

        {detail.error && (
          <Card className="p-6 border-destructive/40">
            <p className="text-sm text-destructive" data-testid="text-detail-error">
              Could not load this session.
            </p>
          </Card>
        )}

        {detail.data && !detail.data.hasMedia && (
          <Card className="p-6 border-amber-500/40 bg-amber-500/5" data-testid="card-no-media">
            <h2 className="font-display text-lg font-bold text-foreground mb-1">No recording on this round</h2>
            <p className="text-sm text-muted-foreground">
              Highlight clips are made from the recorded video or audio. Run a new round with the camera on, save it, and try again.
            </p>
          </Card>
        )}

        {detail.data && detail.data.hasMedia && detail.data.videoUrl && (
          <>
            <Card className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Source round</div>
              <div className="text-base font-semibold text-foreground" data-testid="text-source-topic">
                {detail.data.topic}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {detail.data.format} · {detail.data.side === "Aff" ? "Affirmative" : "Negative"} · {fmtTime(totalSec)} long
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-3">
                {isAudio ? (
                  <audio
                    ref={(el) => { mediaRef.current = el; }}
                    src={detail.data.videoUrl}
                    controls
                    className="w-full"
                    data-testid="editor-audio"
                    onLoadedMetadata={(e) => {
                      const m = e.currentTarget;
                      setMediaDur(m.duration || 0);
                      setMediaReady(true);
                    }}
                  />
                ) : (
                  <video
                    ref={(el) => { mediaRef.current = el; }}
                    src={detail.data.videoUrl}
                    controls
                    playsInline
                    className="w-full rounded-lg bg-black aspect-video"
                    data-testid="editor-video"
                    onLoadedMetadata={(e) => {
                      const m = e.currentTarget;
                      setMediaDur(m.duration || 0);
                      setMediaReady(true);
                    }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span>
                  Now at <span className="font-mono font-bold text-foreground" data-testid="text-current-time">{fmtTime(currentTime)}</span>
                </span>
                <span data-testid="text-clip-window">
                  Window <span className="font-mono font-bold text-foreground">{fmtTime(startSec)}</span>
                  {" → "}
                  <span className="font-mono font-bold text-foreground">{fmtTime(endSec)}</span>
                  {" "}({clipDur}s)
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Trim start</Label>
                  <Slider
                    value={[startSec]}
                    min={0}
                    max={Math.max(0, totalSec - CLIP_MIN_SEC)}
                    step={1}
                    onValueChange={(v) => setIn(v[0] ?? 0)}
                    data-testid="slider-start"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Trim end</Label>
                  <Slider
                    value={[endSec]}
                    min={Math.min(totalSec, startSec + CLIP_MIN_SEC)}
                    max={Math.min(totalSec, startSec + CLIP_MAX_SEC)}
                    step={1}
                    onValueChange={(v) => setOut(v[0] ?? endSec)}
                    data-testid="slider-end"
                    className="mt-2"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={previewWindow}
                    data-testid="button-preview-window"
                  >
                    Preview window
                  </Button>
                  <Button
                    type="button"
                    onClick={suggestHighlight}
                    disabled={suggesting || !mediaReady}
                    className="bg-accent hover:bg-accent/90 text-white"
                    data-testid="button-suggest-highlight"
                  >
                    {suggesting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Picking…</>
                    ) : (
                      <><Wand2 className="w-4 h-4 mr-2" /> Suggest highlight</>
                    )}
                  </Button>
                </div>

                {suggestionReason && (
                  <p className="text-xs text-muted-foreground italic" data-testid="text-suggestion-reason">
                    <Sparkles className="w-3 h-3 inline mr-1 text-accent" />
                    {suggestionReason}
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-5 space-y-4" data-testid="card-overlays">
              <h2 className="font-display text-lg font-bold text-primary">Overlays</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="overlay-name" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Student name (top-left)
                  </Label>
                  <Input
                    id="overlay-name"
                    value={overlayName}
                    onChange={(e) => setOverlayName(e.target.value)}
                    placeholder="Leave blank to hide"
                    maxLength={80}
                    data-testid="input-overlay-name"
                    className="mt-2"
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Topic banner</div>
                    <div className="text-xs text-muted-foreground">Show the resolution at the bottom.</div>
                  </div>
                  <Switch checked={overlayTopic} onCheckedChange={setOverlayTopic} data-testid="switch-overlay-topic" />
                </div>

                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Score badge</div>
                    <div className="text-xs text-muted-foreground">
                      {detail.data.overallScore != null
                        ? `Show ${detail.data.overallScore}/100 (top-right)`
                        : "No overall score on this round"}
                    </div>
                  </div>
                  <Switch
                    checked={overlayScoreOn && detail.data.overallScore != null}
                    onCheckedChange={(v) => setOverlayScoreOn(v)}
                    disabled={detail.data.overallScore == null}
                    data-testid="switch-overlay-score"
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Orator watermark</div>
                    <div className="text-xs text-muted-foreground">Bottom-right corner. Recommended.</div>
                  </div>
                  <Switch checked={overlayWatermark} onCheckedChange={setOverlayWatermark} data-testid="switch-overlay-watermark" />
                </div>
              </div>
            </Card>

            <Card className="p-5" data-testid="card-export">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-display text-lg font-bold text-primary flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-accent" /> Export this clip
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    We render an MP4 with your overlays and give you a share link.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={exportClip}
                  disabled={exporting}
                  className="bg-accent hover:bg-accent/90 text-white"
                  data-testid="button-export-clip"
                >
                  {exporting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rendering…</>
                  ) : (
                    <><Scissors className="w-4 h-4 mr-2" /> Export {clipDur}s clip</>
                  )}
                </Button>
              </div>

              {created && (
                <div className="mt-5 space-y-3" data-testid="card-clip-result">
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <Input
                      readOnly
                      value={shareOrigin + created.url}
                      data-testid="input-clip-share-url"
                      onFocus={(e) => e.currentTarget.select()}
                      className="font-mono text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={copyLink}
                        data-testid="button-copy-clip-link"
                      >
                        <Copy className="w-4 h-4 mr-1.5" /> {copied ? "Copied!" : "Copy"}
                      </Button>
                      <a
                        href={created.downloadUrl}
                        data-testid="link-download-clip"
                      >
                        <Button variant="outline">
                          <Download className="w-4 h-4 mr-1.5" /> Download MP4
                        </Button>
                      </a>
                      <Button
                        type="button"
                        onClick={() => navigate(created.url)}
                        data-testid="button-open-clip"
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        <ExternalLink className="w-4 h-4 mr-1.5" /> Open share page
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share-ready MP4 · {Math.round((created.sizeBytes / 1024 / 1024) * 10) / 10} MB · {created.durationSec}s
                  </p>
                </div>
              )}
            </Card>
          </>
        )}
      </section>
    </div>
  );
}
