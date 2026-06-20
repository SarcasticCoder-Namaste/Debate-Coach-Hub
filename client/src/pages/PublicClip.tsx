import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  ArrowRight,
  Copy,
  Download,
  Eye,
  Loader2,
  Mic,
  Share2,
  Sparkles,
} from "lucide-react";
import { SiX, SiInstagram, SiTiktok } from "react-icons/si";

interface ClipData {
  id: string;
  topic: string;
  side: "Aff" | "Neg";
  format: string;
  durationSec: number;
  overlayName: string | null;
  overlayScore: number | null;
  viewCount: number;
  createdAt: string;
  videoUrl: string;
  posterUrl: string | null;
  shareUrl: string;
}

export default function PublicClip() {
  const [, params] = useRoute("/clips/:id");
  const id = params?.id;
  const { toast } = useToast();

  const [data, setData] = useState<ClipData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/clips/${id}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error("This clip doesn't exist or has been removed.");
        if (!res.ok) throw new Error("Could not load this clip.");
        return res.json();
      })
      .then((j: ClipData) => {
        if (!cancelled) setData(j);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const fullUrl = typeof window !== "undefined" && data
    ? window.location.origin + data.shareUrl
    : "";

  const shareText = data
    ? `${data.overlayName ? data.overlayName + " — " : ""}${data.topic} · debate highlight on @Orator`
    : "";

  async function copyLink() {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Copy failed", description: "Select and copy manually.", variant: "destructive" });
    }
  }

  function nativeShare() {
    if (typeof navigator === "undefined" || !("share" in navigator) || !data) return;
    navigator
      .share({ title: data.topic, text: shareText, url: fullUrl })
      .catch(() => {/* user cancelled */});
  }

  const tweetUrl = data
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullUrl)}`
    : "#";

  return (
    <div className="min-h-screen bg-background font-body text-foreground" data-testid="page-public-clip">
      <Navigation />

      <section className="pt-32 pb-6 px-4 bg-primary">
        <div className="container mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-accent" /> Highlight Clip
          </div>
          <h1 className="text-2xl md:text-4xl font-display font-bold text-white leading-tight" data-testid="text-clip-title">
            {data?.topic ?? "Practice highlight"}
          </h1>
          {data && (
            <p className="text-white/75 mt-2 text-sm">
              {data.overlayName && <span className="font-semibold text-white">{data.overlayName} · </span>}
              {data.side === "Aff" ? "Affirmative" : "Negative"} · {data.format} · {data.durationSec}s clip
            </p>
          )}
        </div>
      </section>

      <section className="container mx-auto max-w-3xl px-4 py-8 space-y-5">
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
            <Card className="p-3 overflow-hidden">
              <video
                data-testid="clip-video"
                src={data.videoUrl}
                poster={data.posterUrl ?? undefined}
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-lg bg-black aspect-video"
              />
              <div className="flex items-center justify-between mt-3 px-2 text-xs text-muted-foreground">
                <span data-testid="text-view-count">
                  <Eye className="w-3.5 h-3.5 inline mr-1" />
                  {data.viewCount} {data.viewCount === 1 ? "view" : "views"}
                </span>
                {data.overlayScore != null && (
                  <span data-testid="text-clip-score" className="font-bold text-accent">
                    Coach score: {data.overlayScore}/100
                  </span>
                )}
              </div>
            </Card>

            <Card className="p-5" data-testid="card-share-actions">
              <h2 className="font-display text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-accent" /> Share this clip
              </h2>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <input
                  readOnly
                  value={fullUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-[220px] px-3 py-2 rounded-md border border-input bg-background font-mono text-xs"
                  data-testid="input-public-share-url"
                />
                <Button variant="outline" onClick={copyLink} data-testid="button-copy-link">
                  <Copy className="w-4 h-4 mr-1.5" /> {copied ? "Copied!" : "Copy link"}
                </Button>
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <Button variant="outline" onClick={nativeShare} data-testid="button-native-share">
                    <Share2 className="w-4 h-4 mr-1.5" /> Share…
                  </Button>
                )}
                <a href={data.videoUrl + "?download=1"} data-testid="link-download-public">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-1.5" /> Download MP4
                  </Button>
                </a>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={tweetUrl}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="link-share-twitter"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-foreground text-background text-sm font-semibold hover-elevate active-elevate-2"
                >
                  <SiX className="w-4 h-4" /> Share on X
                </a>
                <button
                  type="button"
                  onClick={async () => { await copyLink(); toast({ title: "Link copied", description: "Paste it in your Instagram bio or DM." }); }}
                  data-testid="button-share-instagram"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-pink-500 text-white text-sm font-semibold hover-elevate active-elevate-2"
                >
                  <SiInstagram className="w-4 h-4" /> Instagram
                </button>
                <button
                  type="button"
                  onClick={async () => { await copyLink(); toast({ title: "Link copied", description: "Paste it in your TikTok caption or bio." }); }}
                  data-testid="button-share-tiktok"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-black text-white text-sm font-semibold hover-elevate active-elevate-2"
                >
                  <SiTiktok className="w-4 h-4" /> TikTok
                </button>
              </div>
            </Card>

            <Card className="p-6 border-accent/40 bg-gradient-to-br from-primary/5 to-accent/5" data-testid="card-cta">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider mb-2">
                    <Mic className="w-4 h-4" /> Try Orator
                  </div>
                  <h3 className="font-display text-xl font-bold text-primary mb-1">
                    Run your own practice round, free.
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Spar with our AI opponent across LD, PF, and Policy. Save your rounds and cut your own highlight clips like this one.
                  </p>
                </div>
                <Link href="/practice" data-testid="link-cta-practice">
                  <Button className="bg-accent hover:bg-accent/90 text-white">
                    Start practicing <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          </>
        )}
      </section>
    </div>
  );
}
