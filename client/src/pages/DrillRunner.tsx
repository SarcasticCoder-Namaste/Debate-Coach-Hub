import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  Square,
  Loader2,
  RotateCcw,
  Timer,
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Play,
  Keyboard,
} from "lucide-react";
import type { DrillType, DrillScore } from "@shared/drills";
import { recordDrillCompletion } from "@/pages/Drills";

type DrillDetail = {
  id: DrillType;
  name: string;
  tagline: string;
  skill: string;
  durationSec: number;
  instructions: string;
  scoringFocus: string;
  prompts: string[];
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = r.result as string;
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function pickAudioMime(): string {
  const list = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported)
    return "";
  for (const m of list) if (MediaRecorder.isTypeSupported(m)) return m;
  return "";
}

type Stage = "intro" | "running" | "review" | "scoring" | "done";

export default function DrillRunner() {
  const { id } = useParams<{ id: string }>();
  const [location] = useLocation();
  const isDaily = location.includes("daily=1");
  const { toast } = useToast();

  const { data: drill, isLoading } = useQuery<DrillDetail>({
    queryKey: ["/api/drills", id],
  });

  const [stage, setStage] = useState<Stage>("intro");
  const [promptIndex, setPromptIndex] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [responseText, setResponseText] = useState("");
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [score, setScore] = useState<DrillScore | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [actualDuration, setActualDuration] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeRef = useRef<string>("");
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const supportsMic =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  // Choose initial prompt
  useEffect(() => {
    if (!drill) return;
    if (isDaily) {
      const dayKey =
        new Date().getUTCFullYear() * 1000 +
        Math.floor(
          (Date.now() -
            Date.UTC(new Date().getUTCFullYear(), 0, 0)) /
            (1000 * 60 * 60 * 24),
        );
      setPromptIndex(dayKey % drill.prompts.length);
    } else {
      setPromptIndex(Math.floor(Math.random() * drill.prompts.length));
    }
  }, [drill, isDaily]);

  // Timer cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const prompt = drill?.prompts[promptIndex] ?? "";

  function pickAnotherPrompt() {
    if (!drill) return;
    let next = promptIndex;
    if (drill.prompts.length > 1) {
      while (next === promptIndex)
        next = Math.floor(Math.random() * drill.prompts.length);
    }
    setPromptIndex(next);
  }

  function resetForRetry() {
    setStage("intro");
    setResponseText("");
    setScore(null);
    setScoreError(null);
    setRecording(false);
    setTranscribing(false);
    setActualDuration(0);
    pickAnotherPrompt();
  }

  function startTimer(seconds: number) {
    setSecondsLeft(seconds);
    startedAtRef.current = Date.now();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const left = Math.max(0, seconds - elapsed);
      setSecondsLeft(left);
      if (left <= 0) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          stopRecording();
        } else if (mode === "text") {
          setActualDuration(seconds);
          setStage("review");
        }
      }
    }, 250);
  }

  async function startDrill() {
    if (!drill) return;
    if (mode === "voice") {
      if (!supportsMic) {
        toast({
          title: "Mic not available",
          description: "Switch to text mode to type your response.",
          variant: "destructive",
        });
        setMode("text");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mime = pickAudioMime();
        mimeRef.current = mime;
        const recorder = new MediaRecorder(
          stream,
          mime ? { mimeType: mime } : undefined,
        );
        recorderRef.current = recorder;
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.start(250);
        setRecording(true);
        setStage("running");
        startTimer(drill.durationSec);
      } catch {
        toast({
          title: "Microphone access denied",
          description:
            "Allow mic access in your browser, or switch to text mode below.",
          variant: "destructive",
        });
        setMode("text");
      }
    } else {
      setStage("running");
      startTimer(drill.durationSec);
    }
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      // text mode or already stopped
      if (timerRef.current) window.clearInterval(timerRef.current);
      const elapsed = Math.max(
        1,
        Math.floor((Date.now() - startedAtRef.current) / 1000),
      );
      setActualDuration(elapsed);
      setStage("review");
      return;
    }
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
    const elapsed = Math.max(
      1,
      Math.floor((Date.now() - startedAtRef.current) / 1000),
    );
    setActualDuration(elapsed);
    setTranscribing(true);

    const finished = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const type = mimeRef.current || "audio/webm";
        resolve(new Blob(chunksRef.current, { type }));
      };
    });
    recorder.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const blob = await finished;

    try {
      const base64 = await blobToBase64(blob);
      const res = await fetch("/api/practice/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64 }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Transcription failed");
      const { text } = (await res.json()) as { text: string };
      setResponseText(text || "");
      setTranscribing(false);
      setStage("review");
      if (!text || !text.trim()) {
        toast({
          title: "Couldn't hear you",
          description:
            "We didn't catch any speech. Try again, or type your response.",
          variant: "destructive",
        });
      }
    } catch {
      setTranscribing(false);
      setStage("review");
      toast({
        title: "Transcription error",
        description: "Type or paste your response and submit.",
        variant: "destructive",
      });
    }
  }

  async function submitForScoring() {
    if (!drill) return;
    const trimmed = responseText.trim();
    if (trimmed.split(/\s+/).filter(Boolean).length < 8) {
      toast({
        title: "Response too short",
        description: "Give at least a couple of sentences before scoring.",
        variant: "destructive",
      });
      return;
    }
    setStage("scoring");
    setScoreError(null);
    try {
      const res = await apiRequest("POST", "/api/drills/score", {
        drillId: drill.id,
        prompt,
        response: trimmed,
        durationSec: actualDuration || drill.durationSec,
      });
      const data = (await res.json()) as DrillScore;
      setScore(data);
      setStage("done");
      recordDrillCompletion();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scoring failed";
      setScoreError(msg);
      setStage("review");
    }
  }

  const headerProgress = useMemo(() => {
    if (!drill || stage !== "running") return 0;
    return ((drill.durationSec - secondsLeft) / drill.durationSec) * 100;
  }, [drill, stage, secondsLeft]);

  if (isLoading || !drill) {
    return (
      <div className="min-h-screen bg-background font-body">
        <Navigation />
        <div className="container mx-auto max-w-3xl px-4 pt-32 text-muted-foreground">
          <Loader2 className="w-5 h-5 inline-block animate-spin mr-2" />
          Loading drill…
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background font-body text-foreground"
      data-testid={`page-drill-${drill.id}`}
    >
      <Navigation />

      <section className="relative pt-32 pb-8 px-4 overflow-hidden bg-primary">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb orb-delay-1 absolute -top-24 -right-24 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px]" />
        </div>
        <div className="container relative z-10 mx-auto max-w-3xl">
          <Link
            href="/drills"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors"
            data-testid="link-back-drills"
          >
            <ArrowLeft className="w-4 h-4" /> All drills
          </Link>
          <h1 className="text-2xl md:text-4xl font-display font-bold text-white">
            {drill.name}
          </h1>
          <p className="text-white/75 mt-2">{drill.tagline}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-white/70">
            <span className="inline-flex items-center gap-1">
              <Timer className="w-3.5 h-3.5" /> {drill.durationSec}s
            </span>
            <span className="inline-flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> {drill.skill}
            </span>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Prompt card (always shown until done) */}
        {stage !== "done" && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-accent">
                Your prompt
              </span>
              {stage === "intro" && drill.prompts.length > 1 && (
                <button
                  type="button"
                  onClick={pickAnotherPrompt}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  data-testid="button-shuffle-prompt"
                >
                  <RotateCcw className="w-3 h-3" /> Shuffle
                </button>
              )}
            </div>
            <p
              className="text-lg md:text-xl font-display text-foreground leading-snug"
              data-testid="text-drill-prompt"
            >
              {prompt}
            </p>
          </Card>
        )}

        {/* Stage: intro */}
        {stage === "intro" && (
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="font-display text-base font-bold text-primary mb-1">
                How this drill works
              </h3>
              <p className="text-sm text-muted-foreground">{drill.instructions}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setMode("voice")}
                disabled={!supportsMic}
                data-testid="button-mode-voice"
                className={`flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-md border text-sm font-medium transition-colors ${
                  mode === "voice"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-background text-foreground hover:bg-muted"
                } ${!supportsMic ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Mic className="w-4 h-4" /> Voice (recommended)
              </button>
              <button
                type="button"
                onClick={() => setMode("text")}
                data-testid="button-mode-text"
                className={`flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-md border text-sm font-medium transition-colors ${
                  mode === "text"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                <Keyboard className="w-4 h-4" /> Type it
              </button>
            </div>

            <Button
              onClick={startDrill}
              size="lg"
              className="w-full bg-accent hover:bg-accent/90 text-white"
              data-testid="button-start-drill"
            >
              <Play className="mr-2 w-4 h-4" /> Start {drill.durationSec}-second drill
            </Button>
          </Card>
        )}

        {/* Stage: running */}
        {stage === "running" && (
          <Card className="p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5" /> Time left
                </span>
                <span
                  className={`font-display text-3xl font-bold ${
                    secondsLeft <= 10 ? "text-rose-500" : "text-primary"
                  }`}
                  data-testid="text-time-left"
                >
                  {secondsLeft}s
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${headerProgress}%` }}
                />
              </div>
            </div>

            {mode === "voice" ? (
              <div className="text-center py-4">
                <div
                  className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${
                    recording
                      ? "bg-rose-500/15 text-rose-500 animate-pulse"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Mic className="w-9 h-9" />
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  {recording ? "Recording — speak your response." : "Stopped."}
                </p>
                <Button
                  onClick={stopRecording}
                  size="lg"
                  variant="destructive"
                  className="mt-4"
                  data-testid="button-stop-drill"
                >
                  <Square className="mr-2 w-4 h-4" /> Stop & submit
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={6}
                  placeholder="Type your response as if speaking it…"
                  data-testid="input-drill-response"
                />
                <Button
                  onClick={() => {
                    if (timerRef.current) window.clearInterval(timerRef.current);
                    setActualDuration(
                      Math.max(
                        1,
                        Math.floor((Date.now() - startedAtRef.current) / 1000),
                      ),
                    );
                    setStage("review");
                  }}
                  className="w-full bg-accent hover:bg-accent/90"
                  data-testid="button-finish-text"
                >
                  Finish early
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Stage: review */}
        {(stage === "review" || stage === "scoring") && (
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="font-display text-base font-bold text-primary mb-1">
                Your response
              </h3>
              <p className="text-xs text-muted-foreground">
                Edit if the transcript missed something, then submit for scoring.
              </p>
            </div>
            {transcribing ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
                <Loader2 className="w-4 h-4 animate-spin" /> Transcribing your
                speech…
              </div>
            ) : (
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={6}
                placeholder="Your transcribed (or typed) response…"
                disabled={stage === "scoring"}
                data-testid="input-drill-review"
              />
            )}
            {scoreError && (
              <div className="text-sm text-rose-600 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5" /> {scoreError}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={submitForScoring}
                disabled={transcribing || stage === "scoring"}
                className="flex-1 bg-accent hover:bg-accent/90"
                data-testid="button-submit-drill"
              >
                {stage === "scoring" ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" /> Scoring…
                  </>
                ) : (
                  <>
                    Score my drill <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={resetForRetry}
                disabled={stage === "scoring"}
                data-testid="button-retry-drill"
              >
                <RotateCcw className="mr-2 w-4 h-4" /> Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Stage: done */}
        {stage === "done" && score && (
          <>
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-accent/15 flex items-center justify-center">
                    <span
                      className="font-display text-3xl font-bold text-accent"
                      data-testid="text-drill-score"
                    >
                      {score.score}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1 inline-flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> {drill.skill} score
                  </div>
                  <p
                    className="font-display text-lg font-bold text-primary leading-snug"
                    data-testid="text-drill-headline"
                  >
                    {score.headline}
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="p-5">
                <h4 className="font-display text-sm font-bold text-primary inline-flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> What
                  worked
                </h4>
                <ul className="space-y-1.5 text-sm text-foreground">
                  {score.whatWorked.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-500">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-5">
                <h4 className="font-display text-sm font-bold text-primary inline-flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> What to
                  fix
                </h4>
                <ul className="space-y-1.5 text-sm text-foreground">
                  {score.whatToFix.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-amber-500">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card className="p-5 bg-accent/5 border-accent/30">
              <h4 className="font-display text-sm font-bold text-accent inline-flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" /> One thing to try next rep
              </h4>
              <p className="text-sm text-foreground" data-testid="text-drill-tip">
                {score.oneTip}
              </p>
            </Card>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={resetForRetry}
                size="lg"
                className="flex-1 bg-accent hover:bg-accent/90 text-white"
                data-testid="button-try-another"
              >
                <RotateCcw className="mr-2 w-4 h-4" /> Try another prompt
              </Button>
              <Link href="/drills" className="flex-1">
                <Button size="lg" variant="outline" className="w-full" data-testid="button-back-to-drills">
                  Back to drills
                </Button>
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
