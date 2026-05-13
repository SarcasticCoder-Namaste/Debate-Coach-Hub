import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type DebateTopic, FORMAT_LABELS, TOPICS } from "@shared/topics";
import { useSavedTopics } from "@/hooks/use-saved-topics";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { History as HistoryIcon, CheckCircle2, LogIn } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Mic, MicOff, Video, VideoOff, Loader2, Sparkles, Download,
  Volume2, VolumeX, RotateCcw, ArrowLeft, Send, AlertTriangle, Gavel, Languages,
  FileText, Upload, X, BookOpen,
  Share2, Copy, Check, CalendarDays, Trophy, BookmarkCheck, Mail,
  ChevronDown, ChevronUp, Clock, Lightbulb, Timer, Pause, Play,
  TrendingUp, ThumbsUp, AlertCircle, Gauge, MessageSquare, Layers, Target, Zap,
  ExternalLink, Quote,
} from "lucide-react";
import { Paywall, useFeatureAccess } from "@/components/Paywall";
import type { FeedbackReport, ResearchBundle } from "@shared/schema";
import { LANGUAGES, LANGUAGE_CODES, topicsForLanguage, type LanguageCode } from "@shared/languages";

type Side = "Aff" | "Neg";
type FormatKey = "LD" | "PF" | "Policy" | "Parli" | "Congress" | "Worlds";
type Turn = { role: "user" | "assistant"; content: string; durationSec?: number };

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
type PacketContext = {
  title: string;
  summary: string;
  keyPoints: string[];
  excerpt: string;
};
type PacketStats = { characters: number; truncated: boolean; source: "pdf" | "docx" | "text" };

type Feedback = FeedbackReport;

const ENGLISH_EXTRA_TOPICS = [
  "Resolved: Public colleges and universities ought not consider standardized tests in admissions.",
  "Resolved: In the United States, the right to be forgotten outweighs the freedom of the press.",
];

function topicsForUi(lang: LanguageCode): string[] {
  const translated = topicsForLanguage(lang).map((t) => t.resolution);
  return lang === "en" ? [...translated, ...ENGLISH_EXTRA_TOPICS] : translated;
}

function getQueryParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function pickSupportedMime(audioOnly: boolean): string {
  const list = audioOnly
    ? ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]
    : ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  for (const m of list) if (MediaRecorder.isTypeSupported(m)) return m;
  return "";
}

/* ---------- pulse waveform ---------- */
function Pulse({ active }: { active: boolean }) {
  return (
    <div className="flex items-end justify-center gap-1.5 h-12">
      {Array.from({ length: 9 }).map((_, i) => (
        <motion.span
          key={i}
          className="w-1.5 rounded-full bg-accent"
          animate={
            active
              ? { height: ["20%", "100%", "30%", "80%", "20%"] }
              : { height: "20%" }
          }
          transition={{
            duration: 0.9 + (i % 3) * 0.2,
            repeat: active ? Infinity : 0,
            ease: "easeInOut",
            delay: i * 0.06,
          }}
          style={{ height: "20%" }}
        />
      ))}
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 65) return "text-accent";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function SubScoreRow({
  label,
  icon: Icon,
  item,
  metricLabel,
  testId,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  item: { score: number; comment: string; suggestion: string };
  metricLabel?: string;
  testId: string;
}) {
  return (
    <div data-testid={testId} className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate">{label}</span>
          {metricLabel && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">· {metricLabel}</span>
          )}
        </div>
        <span className={`text-sm font-bold ${scoreColor(item.score)}`} data-testid={`${testId}-score`}>
          {item.score}
          <span className="text-xs text-muted-foreground font-normal">/100</span>
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${item.score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
        />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{item.comment}</p>
      <p className="text-xs text-foreground/80 leading-relaxed">
        <span className="font-semibold text-accent">Try:</span> {item.suggestion}
      </p>
    </div>
  );
}

interface SavedResearch {
  id: number;
  topic: string;
  side: string;
  format: string;
  bundle: ResearchBundle;
}

function getQueryParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export default function PracticeBot() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [savedRoundId, setSavedRoundId] = useState<number | null>(null);
  const [savingRound, setSavingRound] = useState(false);

  const initialParams = useMemo(() => {
    const p = getQueryParams();
    return {
      topic: p.get("topic") || "",
      side: (p.get("side") === "Neg" ? "Neg" : p.get("side") === "Aff" ? "Aff" : null) as Side | null,
      format: (["LD", "PF", "Policy"].includes(p.get("format") || "") ? (p.get("format") as FormatKey) : null),
      researchId: p.get("researchId") ? Number(p.get("researchId")) : null,
    };
  }, []);

  // setup
  const initialTopicId = getQueryParam("topicId");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [topic, setTopic] = useState(initialParams.topic && !TOPICS.some(t => t.resolution === initialParams.topic) ? initialParams.topic : initialParams.topic || TOPICS[0].resolution);
  const [customTopic, setCustomTopic] = useState(
    initialParams.topic && !TOPICS.some(t => t.resolution === initialParams.topic) ? initialParams.topic : ""
  );
  const [side, setSide] = useState<Side>(initialParams.side ?? "Aff");
  const [format, setFormat] = useState<FormatKey>(initialParams.format ?? "LD");
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(
    initialTopicId,
  );
  const [judgeMode, setJudgeMode] = useState(false);
  const judgeAllowed = useFeatureAccess("judgeMode");

  const { data: libraryTopics = [] } = useQuery<DebateTopic[]>({
    queryKey: ["/api/topics"],
  });

  const libraryById = useMemo(() => {
    const map = new Map<string, DebateTopic>();
    libraryTopics.forEach((t) => map.set(t.id, t));
    return map;
  }, [libraryTopics]);

  const { saved: savedTopicRows } = useSavedTopics();

  // Recently-saved library topics, in save order (newest first), filtered to
  // ones still in the library.
  const savedTopicSuggestions = useMemo(() => {
    const out: DebateTopic[] = [];
    const seen = new Set<string>();
    for (const row of savedTopicRows) {
      const t = libraryById.get(row.topicId);
      if (t && !seen.has(t.id)) {
        out.push(t);
        seen.add(t.id);
      }
    }
    return out;
  }, [savedTopicRows, libraryById]);

  const otherLibraryTopics = useMemo(() => {
    const savedSet = new Set(savedTopicSuggestions.map((t) => t.id));
    return libraryTopics.filter((t) => !savedSet.has(t.id));
  }, [libraryTopics, savedTopicSuggestions]);

  // When a topicId is supplied via URL (or selected from the picker),
  // pre-load its resolution and format.
  useEffect(() => {
    if (!activeTopicId) return;
    const t = libraryById.get(activeTopicId);
    if (!t) return;
    setTopic(t.resolution);
    setCustomTopic("");
    setFormat(t.format as FormatKey);
  }, [activeTopicId, libraryById]);

  // prep packet
  const researchQuery = useQuery<SavedResearch>({
    queryKey: ["/api/research", initialParams.researchId],
    enabled: !!initialParams.researchId,
  });
  const prep = researchQuery.data?.bundle ?? null;
  const [prepOpen, setPrepOpen] = useState(true);
  const [prepSection, setPrepSection] = useState<"sources" | "evidence" | "case">("sources");

  const availableTopics = topicsForUi(language);

  // round state
  const [history, setHistory] = useState<Turn[]>([]);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [botSpeaking, setBotSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [textFallback, setTextFallback] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [savedBlob, setSavedBlob] = useState<Blob | null>(null);
  const [savedMime, setSavedMime] = useState<string>("");
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [savingToHistory, setSavingToHistory] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const sessionAuth = useQuery<{ email: string | null; signedIn: boolean }>({
    queryKey: ["/api/auth/session"],
  });
  const isSignedIn = !!sessionAuth.data?.signedIn;
  const [shareId, setShareId] = useState<string | null>(null);
  const [coachEmail, setCoachEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [coachNote, setCoachNote] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // topic packet (session-only)
  const [packet, setPacket] = useState<PacketContext | null>(null);
  const [packetStats, setPacketStats] = useState<PacketStats | null>(null);
  const [packetTitle, setPacketTitle] = useState("");
  const [packetText, setPacketText] = useState("");
  const [packetLoading, setPacketLoading] = useState(false);
  const packetFileInputRef = useRef<HTMLInputElement | null>(null);

  // refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const livePreviewRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoMimeRef = useRef<string>("");
  const speechRecRef = useRef<SpeechRecognitionLike | null>(null);
  const speechFinalRef = useRef<string>("");
  const turnStartRef = useRef<number>(0);
  const lastTurnDurationRef = useRef<number>(0);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const activeTopic = customTopic.trim() || topic;

  // Briefing card uses the full topic when one is selected from the library.
  const briefingTopic = activeTopicId && !customTopic.trim()
    ? libraryById.get(activeTopicId) ?? null
    : null;
  const [briefingOpen, setBriefingOpen] = useState(true);

  // Round timer (one-click preset from topic suggestedTime).
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef<number | null>(null);
  const [chimeMuted, setChimeMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("practiceBot.chimeMuted") === "1";
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("practiceBot.chimeMuted", chimeMuted ? "1" : "0");
    }
  }, [chimeMuted]);

  function playChime(kind: "warning" | "end") {
    if (chimeMuted) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      // Two-tone beep; second tone is lower for "end".
      const tones = kind === "end"
        ? [{ f: 880, t: 0 }, { f: 660, t: 0.18 }, { f: 523, t: 0.36 }]
        : [{ f: 880, t: 0 }, { f: 1175, t: 0.16 }];
      const now = ctx.currentTime;
      tones.forEach(({ f, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.0001, now + t);
        gain.gain.exponentialRampToValueAtTime(0.25, now + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.32);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.35);
      });
    } catch {
      // Audio is best-effort; ignore failures.
    }
  }

  useEffect(() => {
    if (!timerRunning || timerRemaining === null) return;
    timerIntervalRef.current = window.setInterval(() => {
      setTimerRemaining((r) => {
        if (r === null) return r;
        if (r <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timerRunning, timerRemaining]);

  // Fire chimes when crossing the 30s warning and the 0:00 end.
  useEffect(() => {
    const prev = prevTimerRef.current;
    const cur = timerRemaining;
    if (prev !== null && cur !== null) {
      if (prev > 30 && cur <= 30 && cur > 0) playChime("warning");
      if (prev > 0 && cur === 0) playChime("end");
    }
    prevTimerRef.current = cur;
    // playChime intentionally not in deps — it reads latest mute via state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRemaining]);

  const timerWarning = timerRemaining !== null && timerRemaining <= 30 && timerRemaining > 0;
  const timerEnded = timerRemaining === 0;

  // Reset / hide the timer when the selected topic changes.
  useEffect(() => {
    setTimerRemaining(null);
    setTimerRunning(false);
  }, [activeTopicId]);

  const presetMinutes = useMemo(() => {
    if (!briefingTopic) return null;
    const m = briefingTopic.suggestedTime.match(/(\d+)\s*min/i);
    return m ? parseInt(m[1], 10) : null;
  }, [briefingTopic]);

  // Per-format speech-length presets (minutes) used when no library topic
  // is selected. Mirrors the common speech lengths in each format.
  const FORMAT_TIMER_PRESETS: Record<FormatKey, number[]> = {
    LD: [4, 6, 7],
    PF: [2, 3, 4],
    Policy: [5, 8],
    Parli: [5, 7, 8],
    Congress: [3],
    Worlds: [4, 8],
  };
  const formatPresets = FORMAT_TIMER_PRESETS[format] ?? [1, 2, 3, 4, 6];
  const [customTimerMinutes, setCustomTimerMinutes] = useState<string>("");

  function startPresetTimer(mins: number) {
    setTimerRemaining(mins * 60);
    setTimerRunning(true);
  }
  function startCustomTimer() {
    const n = parseFloat(customTimerMinutes);
    if (!Number.isFinite(n) || n <= 0 || n > 60) {
      toast({
        title: "Invalid timer length",
        description: "Enter a number of minutes between 0 and 60.",
        variant: "destructive",
      });
      return;
    }
    setTimerRemaining(Math.round(n * 60));
    setTimerRunning(true);
  }
  function formatClock(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const difficultyClass = (d?: string) =>
    d === "Beginner"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
      : d === "Advanced"
      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
      : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";

  // When the language changes, swap to that language's topic list and clear
  // any in-progress round so the bot doesn't mix languages mid-conversation.
  useEffect(() => {
    setTopic(topicsForUi(language)[0]);
    setCustomTopic("");
    setHistory([]);
    setFeedback(null);
    setLiveTranscript("");
    speechFinalRef.current = "";
    if (audioRef.current) audioRef.current.pause();
    setBotSpeaking(false);
  }, [language]);

  // Stop media tracks on unmount only.
  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    };
  }, []);

  // Revoke the previous blob URL when videoUrl changes or on unmount.
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  /* ---------- camera live preview toggle ---------- */
  useEffect(() => {
    let cancelled = false;
    async function setup() {
      if (!cameraEnabled) {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        if (livePreviewRef.current) livePreviewRef.current.srcObject = null;
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
        if (livePreviewRef.current) {
          livePreviewRef.current.srcObject = stream;
          livePreviewRef.current.muted = true;
          livePreviewRef.current.play().catch(() => {});
        }
        setPermissionError(null);
      } catch (err: any) {
        setCameraEnabled(false);
        setPermissionError(
          "Camera or microphone access was denied. Enable permissions in your browser to record video, or use the mic-only or text mode below."
        );
      }
    }
    setup();
    return () => { cancelled = true; };
  }, [cameraEnabled]);

  /* ---------- start / stop recording ---------- */
  function startLiveTranscript() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    try {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = LANGUAGES[language].bcp47;
      speechFinalRef.current = "";
      setLiveTranscript("");
      rec.onresult = (e) => {
        let interim = "";
        let finalAdd = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const text = r[0]?.transcript ?? "";
          if (r.isFinal) finalAdd += text;
          else interim += text;
        }
        if (finalAdd) speechFinalRef.current = (speechFinalRef.current + " " + finalAdd).trim();
        setLiveTranscript((speechFinalRef.current + " " + interim).trim());
      };
      rec.onerror = () => {};
      rec.onend = () => {};
      rec.start();
      speechRecRef.current = rec;
    } catch {
      speechRecRef.current = null;
    }
  }

  function stopLiveTranscript(): string {
    const rec = speechRecRef.current;
    if (rec) {
      try { rec.stop(); } catch {}
    }
    speechRecRef.current = null;
    return speechFinalRef.current.trim();
  }

  async function startRecording() {
    setPermissionError(null);
    setFeedback(null);
    try {
      let stream = mediaStreamRef.current;
      const tracksLive = (s: MediaStream | null) =>
        !!s && s.getTracks().length > 0 && s.getTracks().every((t) => t.readyState === "live");
      const hasLiveAudio = !!stream && stream.getAudioTracks().some((t) => t.readyState === "live");
      const hasLiveVideo = !!stream && stream.getVideoTracks().some((t) => t.readyState === "live");
      const needsRefresh =
        !tracksLive(stream) || !hasLiveAudio || (cameraEnabled && !hasLiveVideo);

      if (needsRefresh) {
        stream?.getTracks().forEach((t) => t.stop());
        stream = await navigator.mediaDevices.getUserMedia(
          cameraEnabled ? { video: true, audio: true } : { audio: true }
        );
        mediaStreamRef.current = stream;
        if (cameraEnabled && livePreviewRef.current) {
          livePreviewRef.current.srcObject = stream;
          livePreviewRef.current.muted = true;
          livePreviewRef.current.play().catch(() => {});
        }
      }

      if (!stream) throw new Error("No media stream");
      const mime = pickSupportedMime(!cameraEnabled);
      videoMimeRef.current = mime;
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(250);
      startLiveTranscript();
      turnStartRef.current = Date.now();
      setRecording(true);
    } catch (err: any) {
      setPermissionError(
        "Microphone access was denied. Please enable it in your browser, or type your speech below."
      );
    }
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setRecording(false);
    setProcessing(true);

    const finished = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const type = videoMimeRef.current || (cameraEnabled ? "video/webm" : "audio/webm");
        resolve(new Blob(chunksRef.current, { type }));
      };
    });
    recorder.stop();
    const blob = await finished;
    const liveText = stopLiveTranscript();
    lastTurnDurationRef.current = turnStartRef.current
      ? Math.max(1, (Date.now() - turnStartRef.current) / 1000)
      : 0;

    // Save replayable video / audio
    if (blob.size > 0) {
      setSavedBlob(blob);
      setSavedMime(blob.type || (cameraEnabled ? "video/webm" : "audio/webm"));
      setShareUrl(null);
      setShareExpiresAt(null);
      setShareCopied(false);
      if (cameraEnabled) {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(URL.createObjectURL(blob));
      }
    }

    // Prefer the browser's live transcript when available — it's already final.
    if (liveText && liveText.split(/\s+/).length >= 3) {
      setLiveTranscript("");
      await sendUserTurn(liveText);
      return;
    }

    // Fallback: send audio to server STT.
    try {
      const base64 = await blobToBase64(blob);
      const tr = await fetch("/api/practice/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64, language }),
      });
      if (!tr.ok) throw new Error("transcribe failed");
      const { text } = (await tr.json()) as { text: string };
      if (!text?.trim()) {
        toast({ title: "Couldn't hear you", description: "No speech detected — try again or use text mode.", variant: "destructive" });
        setProcessing(false);
        setLiveTranscript("");
        return;
      }
      setLiveTranscript("");
      await sendUserTurn(text);
    } catch (err) {
      toast({ title: "Transcription error", description: "Please try again.", variant: "destructive" });
      setProcessing(false);
      setLiveTranscript("");
    }
  }

  /* ---------- send turn (audio or text) ---------- */
  async function sendUserTurn(userText: string) {
    setProcessing(true);
    setFeedbackError(null);
    const dur = lastTurnDurationRef.current;
    lastTurnDurationRef.current = 0;
    const nextHistory: Turn[] = [
      ...history,
      { role: "user", content: userText, durationSec: dur > 0 ? dur : undefined },
    ];
    setHistory(nextHistory);

    try {
      const res = await fetch("/api/practice/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: activeTopic,
          side,
          format,
          history: nextHistory,
          packet,
          language,
        }),
      });
      if (!res.ok) throw new Error("bot failed");
      const { transcript, audio } = (await res.json()) as { transcript: string; audio: string };
      setHistory([...nextHistory, { role: "assistant", content: transcript }]);
      if (audio && audioRef.current) {
        audioRef.current.src = `data:audio/mp3;base64,${audio}`;
        audioRef.current.onplay = () => setBotSpeaking(true);
        audioRef.current.onended = () => setBotSpeaking(false);
        audioRef.current.onpause = () => setBotSpeaking(false);
        audioRef.current.play().catch(() => {});
      }
    } catch (err) {
      toast({ title: "Bot response failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }

  async function submitTextFallback() {
    const t = textFallback.trim();
    if (!t || processing) return;
    setTextFallback("");
    await sendUserTurn(t);
  }

  /* ---------- feedback ---------- */
  async function getFeedback() {
    if (history.length === 0) return;
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      const useJudge = judgeMode && judgeAllowed;
      const res = await fetch("/api/practice/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          topic: activeTopic,
          side,
          transcript: history,
          judgeMode: useJudge,
          language,
        }),
      });
      if (res.status === 402 || res.status === 403) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error ?? "This feature is part of a paid plan.";
        setFeedbackError(msg);
        toast({
          title: "Upgrade required",
          description: msg,
          variant: "destructive",
        });
        return;
      }
      if (!res.ok) {
        let msg = "We couldn't generate a report. Please try again in a moment.";
        try {
          const body = await res.json();
          if (body?.error && typeof body.error === "string") msg = body.error;
        } catch {}
        setFeedbackError(msg);
        toast({ title: "Feedback unavailable", description: msg, variant: "destructive" });
        return;
      }
      const data = (await res.json()) as Feedback;
      setFeedback(data);
      void saveRound(data);
    } catch {
      const msg = "Network error while generating your report. Please try again.";
      setFeedbackError(msg);
      toast({ title: "Feedback unavailable", description: msg, variant: "destructive" });
    } finally {
      setFeedbackLoading(false);
    }
  }

  /* ---------- topic packet ---------- */
  async function ingestPacket(payload: { text?: string; pdf?: string; docx?: string; fileName?: string }) {
    setPacketLoading(true);
    try {
      const res = await fetch("/api/practice/packet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, title: packetTitle.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "Couldn't load packet",
          description: data?.error || "Try a different file or paste the text.",
          variant: "destructive",
        });
        return;
      }
      setPacket(data.packet as PacketContext);
      setPacketStats(data.stats as PacketStats);
      toast({
        title: "Packet loaded",
        description: `"${data.packet.title}" — the bot will reference it in the round.`,
      });
    } catch {
      toast({
        title: "Packet upload failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPacketLoading(false);
    }
  }

  async function submitPacketText() {
    const t = packetText.trim();
    if (!t) return;
    await ingestPacket({ text: t });
  }

  async function submitPacketFile(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please keep packets under 4 MB.",
        variant: "destructive",
      });
      return;
    }
    const lower = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lower.endsWith(".docx");
    if (isPdf) {
      const base64 = await blobToBase64(file);
      await ingestPacket({ pdf: base64, fileName: file.name });
    } else if (isDocx) {
      const base64 = await blobToBase64(file);
      await ingestPacket({ docx: base64, fileName: file.name });
    } else if (
      file.type.startsWith("text/") ||
      lower.endsWith(".txt") ||
      lower.endsWith(".md")
    ) {
      const text = await file.text();
      if (!packetTitle.trim()) {
        setPacketTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 80));
      }
      await ingestPacket({ text, fileName: file.name });
    } else {
      toast({
        title: "Unsupported file",
        description: "Upload a PDF, .docx, .txt, or .md, or paste the text below.",
        variant: "destructive",
      });
    }
  }

  function clearPacket() {
    setPacket(null);
    setPacketStats(null);
    setPacketTitle("");
    setPacketText("");
    if (packetFileInputRef.current) packetFileInputRef.current.value = "";
  }

  async function saveRound(fb: Feedback | null) {
    if (!user || savedRoundId) return;
    setSavingRound(true);
    try {
      const res = await apiRequest("POST", "/api/practice/rounds", {
        topic: activeTopic,
        side,
        format,
        transcript: history,
        feedback: fb,
      });
      const saved = (await res.json()) as { id: number };
      setSavedRoundId(saved.id);
      queryClient.invalidateQueries({ queryKey: ["/api/practice/rounds"] });
      toast({ title: "Round saved", description: "View it anytime in My History." });
    } catch {
      toast({
        title: "Couldn't save round",
        description: "We'll keep it on screen — try the feedback button again to retry saving.",
        variant: "destructive",
      });
    } finally {
      setSavingRound(false);
    }
  }

  function resetRound() {
    setHistory([]);
    setFeedback(null);
    setFeedbackError(null);
    setLiveTranscript("");
    speechFinalRef.current = "";
    setSavedRoundId(null);
    if (videoUrl) { URL.revokeObjectURL(videoUrl); setVideoUrl(null); }
    setSavedBlob(null);
    setSavedMime("");
    setShareUrl(null);
    setShareExpiresAt(null);
    setShareCopied(false);
    setSavedSessionId(null);
    setShareId(null);
    setCoachEmail("");
    setStudentName("");
    setStudentEmail("");
    setCoachNote("");
    setEmailSent(false);
    setSendingEmail(false);
    if (audioRef.current) audioRef.current.pause();
    setBotSpeaking(false);
  }

  /* ---------- save round to "My Practice" ---------- */
  async function saveRoundToHistory() {
    if (!isSignedIn || savingToHistory || history.length === 0) return;
    if (savedSessionId) return;
    setSavingToHistory(true);
    try {
      let objectPath: string | null = null;
      let mimeType: string | null = null;
      let sizeBytes: number | null = null;

      if (savedBlob) {
        const MAX = 50 * 1024 * 1024;
        if (savedBlob.size > MAX) {
          toast({
            title: "Recording too large",
            description: "We'll save the round without the recording (under 50 MB only).",
            variant: "destructive",
          });
        } else {
          const contentType = savedMime || savedBlob.type || "video/webm";
          const initRes = await fetch("/api/practice/shares/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ contentType, size: savedBlob.size }),
          });
          if (!initRes.ok) throw new Error("Could not start upload");
          const init = (await initRes.json()) as {
            uploadURL: string;
            objectPath: string;
            uploadToken: string;
          };
          const putRes = await fetch(init.uploadURL, {
            method: "PUT",
            body: savedBlob,
            headers: { "Content-Type": contentType },
          });
          if (!putRes.ok) throw new Error("Upload failed");
          objectPath = init.objectPath;
          mimeType = contentType.split(";")[0]?.trim() || "video/webm";
          sizeBytes = savedBlob.size;
        }
      }

      const totalDuration = history.reduce(
        (acc, t) => acc + (typeof t.durationSec === "number" ? t.durationSec : 0),
        0,
      );

      const res = await fetch("/api/practice/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          topic: activeTopic,
          side,
          format,
          durationSec: Math.round(totalDuration),
          objectPath,
          mimeType,
          sizeBytes,
          transcript: history,
          feedback: feedback ?? null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not save session");
      }
      const { id } = (await res.json()) as { id: string };
      setSavedSessionId(id);
      queryClient.invalidateQueries({ queryKey: ["/api/practice/sessions"] });
      toast({
        title: "Saved to My Practice",
        description: "Find this round on your dashboard.",
      });
    } catch (err) {
      toast({
        title: "Couldn't save round",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingToHistory(false);
    }
  }

  /* ---------- save & share ---------- */
  async function saveAndShare() {
    if (!savedBlob || sharing || history.length === 0) return;
    const MAX = 50 * 1024 * 1024;
    if (savedBlob.size > MAX) {
      toast({
        title: "Recording too large",
        description: "Clips must be under 50 MB. Try a shorter speech.",
        variant: "destructive",
      });
      return;
    }
    setSharing(true);
    setShareCopied(false);
    try {
      const contentType = savedMime || savedBlob.type || "video/webm";
      const initRes = await fetch("/api/practice/shares/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contentType, size: savedBlob.size }),
      });
      if (!initRes.ok) {
        const j = await initRes.json().catch(() => ({}));
        throw new Error(j.error || "Could not start upload");
      }
      const { uploadURL, objectPath, uploadToken } = (await initRes.json()) as {
        uploadURL: string;
        objectPath: string;
        uploadToken: string;
      };

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        body: savedBlob,
        headers: { "Content-Type": contentType },
      });
      if (!putRes.ok) throw new Error("Upload failed");

      const finalizeRes = await fetch("/api/practice/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          objectPath,
          uploadToken,
          mimeType: contentType.split(";")[0]?.trim() || "video/webm",
          sizeBytes: savedBlob.size,
          topic: activeTopic,
          side,
          format,
          transcript: history,
          feedback: feedback ?? null,
        }),
      });
      if (!finalizeRes.ok) {
        const j = await finalizeRes.json().catch(() => ({}));
        throw new Error(j.error || "Could not save share");
      }
      const { id: newShareId, url, expiresAt } = (await finalizeRes.json()) as {
        id: string;
        url: string;
        expiresAt: string | null;
      };
      const fullUrl = window.location.origin + url;
      setShareUrl(fullUrl);
      setShareExpiresAt(expiresAt);
      setShareId(newShareId);
      toast({ title: "Clip saved", description: "Share the link with your coach." });
    } catch (err) {
      toast({
        title: "Couldn't save clip",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Select and copy the link manually.", variant: "destructive" });
    }
  }

  function formatTimestamp(turnIndex: number, sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `Turn ${turnIndex + 1} · ${m}:${s.toString().padStart(2, "0")}`;
  }

  async function sendToCoach() {
    if (!shareId || sendingEmail) return;
    const email = coachEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Enter your coach's email",
        description: "Double-check the address and try again.",
        variant: "destructive",
      });
      return;
    }
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/practice/shares/${shareId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          coachEmail: email,
          studentName: studentName.trim() || undefined,
          studentEmail: studentEmail.trim() || undefined,
          note: coachNote.trim() || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error || "Could not send email");
      }
      setEmailSent(true);
      toast({
        title: "Sent to your coach",
        description: j.message || "We've delivered the link.",
      });
    } catch (err) {
      toast({
        title: "Couldn't send email",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  }

  /* ---------- render ---------- */
  const supportsMedia = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  return (
    <div className="min-h-screen bg-background font-body text-foreground" data-testid="page-practice-bot">
      <Navigation />
      <audio ref={audioRef} hidden />

      {/* Hero strip */}
      <section className="relative pt-32 pb-10 px-4 overflow-hidden bg-primary">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb orb-delay-1 absolute -top-24 -right-24 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px]" />
          <div className="orb orb-delay-2 absolute -bottom-20 left-1/4 w-[400px] h-[400px] bg-white/[0.05] rounded-full blur-[90px]" />
        </div>
        <div className="container relative z-10 mx-auto max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors"
            data-testid="link-back-home"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-accent" /> AI Practice Round
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight">
            Spar With An <span className="gradient-text">AI Opponent.</span>
          </h1>
          <p className="text-white/75 mt-3 max-w-2xl">
            Pick a resolution, choose your side, and run a live round. Get spoken counter-arguments
            and a structured feedback card after every speech.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 pt-6">
        {user ? (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15 text-sm" data-testid="banner-signed-in">
            <span className="text-foreground/80">
              Signed in as <span className="font-semibold text-primary">{user.name || user.email}</span>. Rounds save automatically when you get feedback.
            </span>
            <Link
              href="/history"
              className="inline-flex items-center gap-1.5 text-accent font-semibold hover:underline whitespace-nowrap"
              data-testid="link-view-history"
            >
              <HistoryIcon className="w-3.5 h-3.5" /> View history
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-accent/5 border border-accent/20 text-sm" data-testid="banner-signin-cta">
            <span className="text-foreground/80">
              <span className="font-semibold text-foreground">Want to save your progress?</span> Sign in to keep transcripts, feedback scores, and replays after every round.
            </span>
            <Link
              href="/signin"
              className="inline-flex items-center gap-1.5 text-accent font-semibold hover:underline whitespace-nowrap"
              data-testid="link-signin-cta"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in
            </Link>
          </div>
        )}
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-6 grid lg:grid-cols-3 gap-6">
        {/* LEFT: Setup + Recording */}
        <div className="lg:col-span-2 space-y-6">
          {/* Setup card */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="font-display text-xl font-bold text-primary">Round Setup</h2>
              <Link
                href="/research"
                data-testid="link-setup-research"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-accent/40 bg-accent/10 text-accent hover-elevate active-elevate-2 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" /> Research a Topic
              </Link>
            </div>
            {initialParams.researchId && prep && (
              <div className="mb-4 p-3 rounded-lg border border-accent/30 bg-accent/5 flex items-start gap-2 text-xs" data-testid="banner-prep-loaded">
                <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Prep packet loaded</p>
                  <p className="text-muted-foreground mt-0.5">Sources, evidence, and your case outline are in the sidebar.</p>
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                  Resolution / Topic
                </label>
                <Select
                  value={activeTopicId ?? `__fallback__${topic}`}
                  onValueChange={(v) => {
                    if (v.startsWith("__fallback__")) {
                      setActiveTopicId(null);
                      setTopic(v.replace("__fallback__", ""));
                      setCustomTopic("");
                    } else {
                      setActiveTopicId(v);
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-topic"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {savedTopicSuggestions.length > 0 && (
                      <div data-testid="select-saved-group">
                        <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                          ★ Recently saved
                        </div>
                        {savedTopicSuggestions.map((t) => (
                          <SelectItem
                            key={`saved-${t.id}`}
                            value={t.id}
                            className="text-sm"
                            data-testid={`select-saved-${t.id}`}
                          >
                            [{FORMAT_LABELS[t.format]}] {t.resolution}
                          </SelectItem>
                        ))}
                        <div className="my-1 h-px bg-border" />
                      </div>
                    )}
                    {language === "en" && otherLibraryTopics.length > 0 && (
                      <>
                        {savedTopicSuggestions.length > 0 && (
                          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Library
                          </div>
                        )}
                        {otherLibraryTopics.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-sm">
                            [{FORMAT_LABELS[t.format]}] {t.resolution}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {availableTopics.map((t) => (
                      <SelectItem
                        key={t}
                        value={`__fallback__${t}`}
                        className="text-sm"
                      >
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  data-testid="input-custom-topic"
                  value={customTopic}
                  onChange={(e) => {
                    setCustomTopic(e.target.value);
                    if (e.target.value.trim()) setActiveTopicId(null);
                  }}
                  placeholder="Or write your own resolution…"
                  className="mt-2 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="mt-2 flex items-center justify-between">
                  <Link
                    href="/topics"
                    className="text-xs text-accent hover:underline font-semibold"
                    data-testid="link-browse-library"
                  >
                    Browse the full topic library →
                  </Link>
                  <Link
                    href="/research"
                    className="text-xs text-accent hover:underline font-semibold flex items-center gap-1"
                    data-testid="link-research-topic"
                  >
                    <Sparkles className="w-3 h-3" /> Research a topic →
                  </Link>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                  You Are
                </label>
                <div className="flex gap-2">
                  {(["Aff", "Neg"] as Side[]).map((s) => (
                    <button
                      key={s}
                      data-testid={`button-side-${s.toLowerCase()}`}
                      onClick={() => setSide(s)}
                      className={`flex-1 py-2 rounded-md text-sm font-semibold border transition-all ${
                        side === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary"
                      }`}
                    >
                      {s === "Aff" ? "Affirmative" : "Negative"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                  Format
                </label>
                <Select value={format} onValueChange={(v) => setFormat(v as FormatKey)}>
                  <SelectTrigger data-testid="select-format"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LD">Lincoln-Douglas</SelectItem>
                    <SelectItem value="PF">Public Forum</SelectItem>
                    <SelectItem value="Policy">Policy</SelectItem>
                    <SelectItem value="Parli">Parliamentary</SelectItem>
                    <SelectItem value="Congress">Congressional</SelectItem>
                    <SelectItem value="Worlds">World Schools</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5" /> Practice Language
                </label>
                <Select value={language} onValueChange={(v) => setLanguage(v as LanguageCode)}>
                  <SelectTrigger data-testid="select-language"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_CODES.map((code) => (
                      <SelectItem
                        key={code}
                        value={code}
                        data-testid={`option-language-${code}`}
                        className="text-sm"
                      >
                        {LANGUAGES[code].label} — {LANGUAGES[code].nativeLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  The opponent's voice, your transcription, and the feedback card will all use the selected language. Switching languages resets the round.
                </p>
              </div>

              <div className="sm:col-span-2 mt-2">
                <button
                  data-testid="button-toggle-judge-mode"
                  onClick={() => {
                    if (!judgeAllowed) {
                      // Block activation; the inline paywall below explains why.
                      return;
                    }
                    setJudgeMode((v) => !v);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-md border transition-all ${
                    judgeMode && judgeAllowed
                      ? "bg-accent/10 border-accent text-foreground"
                      : "bg-background border-border hover:border-accent/50 text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Gavel className="w-4 h-4 text-accent" />
                    <span className="text-sm font-semibold">Live AI Judge mode</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      — get a judge's RFD after the round
                    </span>
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      judgeMode && judgeAllowed
                        ? "bg-accent text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {judgeAllowed ? (judgeMode ? "On" : "Off") : "Pro"}
                  </span>
                </button>
                {!judgeAllowed && (
                  <div className="mt-3">
                    <Paywall
                      feature="judgeMode"
                      title="Live AI Judge mode is a Pro feature"
                      description="Upgrade to Pro to get a full judge's reason for decision (RFD) at the end of every round."
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Standalone speech timer (shown when no library topic is selected) */}
          {!briefingTopic && (
            <Card className="p-6" data-testid="card-speech-timer">
              <div className="flex items-start gap-2 mb-3">
                <Timer className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold text-primary leading-tight">
                    Speech Timer
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pick a common speech length for {FORMAT_LABELS[format]} or set your own.
                  </p>
                </div>
              </div>

              {timerRemaining === null ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {formatPresets.map((mins) => (
                      <Button
                        key={mins}
                        data-testid={`button-timer-preset-${mins}`}
                        size="sm"
                        variant="outline"
                        onClick={() => startPresetTimer(mins)}
                        className="hover-elevate"
                      >
                        <Play className="w-3.5 h-3.5 mr-1" /> {mins} min
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      data-testid="input-custom-timer-minutes"
                      type="number"
                      min={0.5}
                      max={60}
                      step={0.5}
                      value={customTimerMinutes}
                      onChange={(e) => setCustomTimerMinutes(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") startCustomTimer(); }}
                      placeholder="Custom minutes"
                      className="w-36 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button
                      data-testid="button-start-custom-timer"
                      size="sm"
                      onClick={startCustomTimer}
                      disabled={!customTimerMinutes.trim()}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      <Play className="w-3.5 h-3.5 mr-1" /> Start
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  data-testid="container-custom-timer"
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    timerEnded
                      ? "bg-destructive/15 border-destructive/50 animate-pulse"
                      : timerWarning
                      ? "bg-destructive/10 border-destructive/40 animate-pulse"
                      : "bg-accent/10 border-accent/30"
                  }`}
                >
                  <span
                    data-testid="text-custom-timer-remaining"
                    className={`font-mono tabular-nums text-2xl font-bold flex-1 ${
                      timerWarning || timerEnded ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {formatClock(timerRemaining)}
                  </span>
                  <Button
                    data-testid="button-toggle-chime-mute"
                    size="sm"
                    variant="outline"
                    onClick={() => setChimeMuted((m) => !m)}
                    title={chimeMuted ? "Unmute chime" : "Mute chime"}
                    aria-label={chimeMuted ? "Unmute chime" : "Mute chime"}
                  >
                    {chimeMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    data-testid="button-toggle-custom-timer"
                    size="sm"
                    variant="outline"
                    onClick={() => setTimerRunning((r) => !r)}
                    disabled={timerRemaining === 0}
                  >
                    {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    data-testid="button-reset-custom-timer"
                    size="sm"
                    variant="outline"
                    onClick={() => { setTimerRunning(false); setTimerRemaining(null); }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Topic briefing card (only when a library topic is selected) */}
          {briefingTopic && (
            <Card className="p-6" data-testid="card-topic-briefing">
              <button
                type="button"
                onClick={() => setBriefingOpen((v) => !v)}
                className="w-full flex items-start justify-between gap-3 text-left"
                data-testid="button-toggle-briefing"
                aria-expanded={briefingOpen}
              >
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold text-primary flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-accent" /> Topic Briefing
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      data-testid="badge-difficulty"
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${difficultyClass(briefingTopic.difficulty)}`}
                    >
                      {briefingTopic.difficulty}
                    </span>
                    <span
                      data-testid="text-suggested-time"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
                    >
                      <Clock className="w-3 h-3" /> {briefingTopic.suggestedTime}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                      {FORMAT_LABELS[briefingTopic.format]}
                    </span>
                  </div>
                </div>
                {briefingOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                )}
              </button>

              {presetMinutes !== null && (
                <div
                  data-testid="container-briefing-timer"
                  className={`mt-4 flex flex-wrap items-center gap-3 p-3 rounded-lg border transition-colors ${
                    timerRemaining !== null && timerEnded
                      ? "bg-destructive/15 border-destructive/50 animate-pulse"
                      : timerRemaining !== null && timerWarning
                      ? "bg-destructive/10 border-destructive/40 animate-pulse"
                      : "bg-accent/10 border-accent/30"
                  }`}
                >
                  <Timer
                    className={`w-4 h-4 flex-shrink-0 ${
                      timerRemaining !== null && (timerWarning || timerEnded) ? "text-destructive" : "text-accent"
                    }`}
                  />
                  <div className="text-sm flex-1 min-w-0">
                    <div
                      className={`font-semibold ${
                        timerRemaining !== null && (timerWarning || timerEnded) ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {timerRemaining === null
                        ? `${presetMinutes}-min speech timer`
                        : (
                          <span data-testid="text-timer-remaining" className="font-mono tabular-nums">
                            {formatClock(timerRemaining)}
                          </span>
                        )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Matches the suggested first speech length for this topic.
                    </div>
                  </div>
                  {timerRemaining === null ? (
                    <Button
                      data-testid="button-start-timer"
                      size="sm"
                      onClick={() => startPresetTimer(presetMinutes)}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      <Play className="w-3.5 h-3.5 mr-1" /> Start {presetMinutes}-min timer
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        data-testid="button-toggle-chime-mute-briefing"
                        size="sm"
                        variant="outline"
                        onClick={() => setChimeMuted((m) => !m)}
                        title={chimeMuted ? "Unmute chime" : "Mute chime"}
                        aria-label={chimeMuted ? "Unmute chime" : "Mute chime"}
                      >
                        {chimeMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        data-testid="button-toggle-timer"
                        size="sm"
                        variant="outline"
                        onClick={() => setTimerRunning((r) => !r)}
                        disabled={timerRemaining === 0}
                      >
                        {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        data-testid="button-reset-timer"
                        size="sm"
                        variant="outline"
                        onClick={() => { setTimerRunning(false); setTimerRemaining(null); }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {briefingOpen && (
                <div className="mt-5 space-y-5" data-testid="briefing-body">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-primary mb-1">
                      Background
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed" data-testid="text-briefing-background">
                      {briefingTopic.background}
                    </p>
                  </div>

                  {briefingTopic.keyTerms.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-primary mb-2">
                        Key terms
                      </div>
                      <ul className="space-y-2">
                        {briefingTopic.keyTerms.map((kt, i) => (
                          <li
                            key={i}
                            className="text-sm leading-relaxed"
                            data-testid={`briefing-keyterm-${i}`}
                          >
                            <span className="font-semibold text-foreground">{kt.term}:</span>{" "}
                            <span className="text-foreground/80">{kt.definition}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {briefingTopic.prepQuestions.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-primary mb-2">
                        Prep questions
                      </div>
                      <ol className="text-sm text-foreground/90 space-y-1 list-decimal pl-5">
                        {briefingTopic.prepQuestions.map((q, i) => (
                          <li key={i} data-testid={`briefing-prep-${i}`}>{q}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="pt-1">
                    <Link
                      href={`/topics/${briefingTopic.id}`}
                      className="text-xs text-accent hover:underline font-semibold"
                      data-testid="link-open-topic-detail"
                    >
                      Open full topic page →
                    </Link>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Topic packet card */}
          <Card className="p-6" data-testid="card-topic-packet">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-xl font-bold text-primary flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-accent" /> Topic Packet
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Paste or upload your coach's brief / evidence packet. The bot will reference its
                  framing and cards in the round. Stays only for this session.
                </p>
              </div>
              {packet && (
                <button
                  data-testid="button-clear-packet"
                  onClick={clearPacket}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            {!packet && (
              <div className="space-y-3">
                <input
                  data-testid="input-packet-title"
                  value={packetTitle}
                  onChange={(e) => setPacketTitle(e.target.value)}
                  placeholder="Packet title (optional, e.g. 'NSDA Sept UBI brief')"
                  disabled={packetLoading}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <textarea
                  data-testid="input-packet-text"
                  value={packetText}
                  onChange={(e) => setPacketText(e.target.value)}
                  placeholder="Paste the brief, framing, and evidence cards here…"
                  disabled={packetLoading}
                  rows={5}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    data-testid="button-submit-packet-text"
                    onClick={submitPacketText}
                    disabled={!packetText.trim() || packetLoading}
                    className="bg-primary"
                  >
                    {packetLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reading…</>
                    ) : (
                      <><FileText className="w-4 h-4 mr-2" /> Use pasted text</>
                    )}
                  </Button>
                  <Button
                    data-testid="button-upload-packet"
                    type="button"
                    variant="outline"
                    onClick={() => packetFileInputRef.current?.click()}
                    disabled={packetLoading}
                  >
                    <Upload className="w-4 h-4 mr-2" /> Upload PDF / Word / text
                  </Button>
                  <input
                    ref={packetFileInputRef}
                    data-testid="input-packet-file"
                    type="file"
                    accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt,.md,text/plain,text/markdown"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) submitPacketFile(f);
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Supports PDF, Word (.docx), .txt, or .md up to 4&nbsp;MB. Long packets are summarized; nothing is saved server-side.
                </p>
              </div>
            )}

            {packet && (
              <div className="space-y-3" data-testid="packet-loaded">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/30">
                  <FileText className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground" data-testid="text-packet-title">
                      {packet.title}
                    </div>
                    {packetStats && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {packetStats.source === "pdf"
                          ? "PDF"
                          : packetStats.source === "docx"
                          ? "Word (.docx)"
                          : "Pasted text"}{" "}
                        ·{" "}
                        {packetStats.characters.toLocaleString()} chars
                        {packetStats.truncated ? " (trimmed for the bot)" : ""}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-primary mb-1">
                    Summary
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed" data-testid="text-packet-summary">
                    {packet.summary}
                  </p>
                </div>
                {packet.keyPoints.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-primary mb-1">
                      Key points the bot will use
                    </div>
                    <ul className="text-sm text-foreground/90 space-y-1 list-disc pl-5">
                      {packet.keyPoints.slice(0, 8).map((p, i) => (
                        <li key={i} data-testid={`packet-keypoint-${i}`}>{p}</li>
                      ))}
                      {packet.keyPoints.length > 8 && (
                        <li className="text-muted-foreground italic">
                          + {packet.keyPoints.length - 8} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Recording card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-primary">Your Speech</h2>
              <button
                data-testid="button-toggle-camera"
                onClick={() => setCameraEnabled((v) => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  cameraEnabled
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-background border-border hover:border-accent text-foreground"
                }`}
              >
                {cameraEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                Camera {cameraEnabled ? "on" : "off"}
              </button>
            </div>

            {cameraEnabled && (
              <div className="relative mb-4 rounded-xl overflow-hidden bg-black aspect-video border border-border">
                <video
                  ref={livePreviewRef}
                  data-testid="video-live-preview"
                  className="w-full h-full object-cover"
                  playsInline
                />
                {recording && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> REC
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col items-center gap-4 py-4">
              <Pulse active={recording || botSpeaking} />
              <button
                data-testid="button-record"
                onClick={recording ? stopRecording : startRecording}
                disabled={!supportsMedia || processing}
                className={`relative w-24 h-24 rounded-full text-white flex items-center justify-center shadow-2xl transition-all ${
                  recording
                    ? "bg-accent hover:bg-accent/90 scale-105"
                    : "bg-primary hover:bg-primary/90 hover:scale-105"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label={recording ? "Stop recording" : "Start recording"}
              >
                {processing ? (
                  <Loader2 className="w-9 h-9 animate-spin" />
                ) : recording ? (
                  <MicOff className="w-9 h-9" />
                ) : (
                  <Mic className="w-9 h-9" />
                )}
                {recording && (
                  <span className="absolute inset-0 rounded-full border-4 border-accent/40 animate-ping" />
                )}
              </button>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {recording
                  ? "Recording… click again when you're done."
                  : processing
                  ? "Thinking through a counter-argument…"
                  : botSpeaking
                  ? "Opponent is speaking — listen carefully."
                  : "Click the mic and deliver your speech as you would in-round."}
              </p>
            </div>

            {permissionError && (
              <div className="mt-2 flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/30 text-sm text-foreground" data-testid="text-permission-error">
                <AlertTriangle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <span>{permissionError}</span>
              </div>
            )}

            {/* Text fallback */}
            <div className="mt-5 pt-5 border-t border-border">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                Text mode (fallback)
              </label>
              <div className="flex gap-2">
                <input
                  data-testid="input-text-fallback"
                  value={textFallback}
                  onChange={(e) => setTextFallback(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitTextFallback(); }}
                  placeholder="Type your speech here and press Enter…"
                  disabled={processing}
                  className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  data-testid="button-send-text"
                  onClick={submitTextFallback}
                  disabled={!textFallback.trim() || processing}
                  className="bg-primary"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Replay video */}
          {videoUrl && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg font-bold text-primary">Replay your last speech</h3>
                <a
                  href={videoUrl}
                  download={`practice-round-${Date.now()}.webm`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-accent font-semibold"
                  data-testid="link-download-video"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
              <video
                data-testid="video-replay"
                src={videoUrl}
                controls
                className="w-full rounded-xl bg-black aspect-video"
              />
            </Card>
          )}

          {/* Save round to My Practice */}
          {history.length > 0 && (
            <Card className="p-6 border-primary/30" data-testid="card-save-history">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-bold text-primary leading-tight">
                    Save this round to My Practice
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track your score over time and re-watch the recording from
                    your dashboard.
                  </p>
                </div>
              </div>

              {!isSignedIn ? (
                <div
                  className="rounded-lg bg-muted/50 border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  data-testid="prompt-signin-save"
                >
                  <div className="text-sm text-foreground/85 flex-1">
                    Sign in to save your transcript, recording, and scorecard so
                    you can review them later.
                  </div>
                  <Link href="/signin" data-testid="link-signin-save">
                    <Button className="bg-accent hover:bg-accent/90 text-white">
                      <LogIn className="w-4 h-4 mr-2" /> Sign in to save
                    </Button>
                  </Link>
                </div>
              ) : savedSessionId ? (
                <div
                  className="flex flex-col sm:flex-row sm:items-center gap-3"
                  data-testid="state-saved-history"
                >
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <BookmarkCheck className="w-4 h-4" /> Saved to My Practice
                  </div>
                  <Link
                    href="/history"
                    data-testid="link-view-history"
                    className="text-sm font-semibold text-accent hover:underline"
                  >
                    View dashboard →
                  </Link>
                </div>
              ) : (
                <Button
                  data-testid="button-save-history"
                  onClick={saveRoundToHistory}
                  disabled={savingToHistory}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {savingToHistory ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                  ) : (
                    <><Trophy className="w-4 h-4 mr-2" /> Save to My Practice</>
                  )}
                </Button>
              )}
            </Card>
          )}

          {/* Save & share */}
          {savedBlob && history.length > 0 && (
            <Card className="p-6 border-accent/40" data-testid="card-share">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-primary leading-tight">
                    Send this clip to your coach
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload your recording to a private link a coach can open in any browser. Links expire after 30 days.
                  </p>
                </div>
              </div>

              {!shareUrl ? (
                <Button
                  data-testid="button-save-share"
                  onClick={saveAndShare}
                  disabled={sharing}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {sharing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</>
                  ) : (
                    <><Share2 className="w-4 h-4 mr-2" /> Save &amp; share clip</>
                  )}
                </Button>
              ) : (
                <div className="space-y-3" data-testid="share-result">
                  <div className="flex gap-2">
                    <input
                      data-testid="input-share-url"
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button
                      data-testid="button-copy-share"
                      onClick={copyShareUrl}
                      variant="outline"
                      className="flex-shrink-0"
                    >
                      {shareCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="link-open-share"
                      className="text-primary hover:text-accent font-semibold"
                    >
                      Open viewer →
                    </a>
                    {shareExpiresAt ? (
                      <span data-testid="text-share-expiry">
                        Expires {new Date(shareExpiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    ) : (
                      <span data-testid="text-share-expiry" className="text-emerald-600 dark:text-emerald-400">
                        Saved to your account — no expiry
                      </span>
                    )}
                  </div>

                  <div
                    className="mt-4 pt-4 border-t border-border space-y-3"
                    data-testid="form-coach-email"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-accent" />
                      <h4 className="font-semibold text-sm text-primary">
                        Email this clip to a coach
                      </h4>
                    </div>
                    {emailSent ? (
                      <div
                        className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400"
                        data-testid="text-email-sent"
                      >
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          Sent to <span className="font-mono">{coachEmail}</span>. They'll
                          get the link, topic, side, and feedback summary.
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="grid sm:grid-cols-2 gap-2">
                          <input
                            data-testid="input-coach-email"
                            type="email"
                            placeholder="coach@example.com"
                            value={coachEmail}
                            onChange={(e) => setCoachEmail(e.target.value)}
                            disabled={sendingEmail}
                            className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                          />
                          <input
                            data-testid="input-student-name"
                            type="text"
                            placeholder="Your name (optional)"
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            disabled={sendingEmail}
                            maxLength={120}
                            className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                          />
                        </div>
                        <input
                          data-testid="input-student-email"
                          type="email"
                          placeholder="Your email (optional, for replies)"
                          value={studentEmail}
                          onChange={(e) => setStudentEmail(e.target.value)}
                          disabled={sendingEmail}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        />
                        <textarea
                          data-testid="input-coach-note"
                          placeholder="Optional note for your coach…"
                          value={coachNote}
                          onChange={(e) => setCoachNote(e.target.value)}
                          disabled={sendingEmail}
                          maxLength={1000}
                          rows={3}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-y"
                        />
                        <Button
                          data-testid="button-send-coach-email"
                          onClick={sendToCoach}
                          disabled={sendingEmail || !coachEmail.trim()}
                          className="w-full"
                          variant="outline"
                        >
                          {sendingEmail ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
                          ) : (
                            <><Mail className="w-4 h-4 mr-2" /> Send to coach</>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          We'll email the link, topic, side, and feedback summary. Limited to a few sends per hour.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* RIGHT: Prep packet + Transcript + feedback */}
        <div className="space-y-6">
          {initialParams.researchId && (
            <Card className="p-4 border-accent/40" data-testid="card-prep-packet">
              <button
                onClick={() => setPrepOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2"
                data-testid="button-toggle-prep-packet"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent" />
                  <span className="font-display text-sm font-bold text-primary">Prep Packet</span>
                  {researchQuery.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                </div>
                {prepOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {prepOpen && prep && (
                <div className="mt-3">
                  <div className="flex gap-1 mb-3 border-b border-border">
                    {([
                      { k: "sources" as const, label: "Sources", icon: BookOpen },
                      { k: "evidence" as const, label: "Evidence", icon: Quote },
                      { k: "case" as const, label: "Case", icon: Target },
                    ]).map(({ k, label, icon: Icon }) => (
                      <button
                        key={k}
                        onClick={() => setPrepSection(k)}
                        data-testid={`tab-prep-${k}`}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                          prepSection === k
                            ? "border-accent text-accent"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-3 h-3" /> {label}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2">
                    {prepSection === "sources" && prep.sources.map((s, i) => (
                      <a
                        key={i}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 rounded-md border border-border hover-elevate active-elevate-2"
                        data-testid={`prep-source-${i}`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="text-xs font-semibold text-foreground leading-snug">{s.title}</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                        </div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-accent mt-0.5">
                          {s.publisher} · <span className={s.stance === "for" ? "text-emerald-600 dark:text-emerald-400" : s.stance === "against" ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>{s.stance}</span>
                        </div>
                      </a>
                    ))}

                    {prepSection === "evidence" && (
                      <>
                        {(["for", "against"] as const).map((st) => (
                          <div key={st}>
                            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-1 mb-1.5">
                              {st === "for" ? "For the resolution" : "Against the resolution"}
                            </div>
                            {prep.evidenceQuotes[st].map((q, i) => (
                              <blockquote
                                key={i}
                                className={`text-xs italic border-l-2 pl-2 py-1 mb-1.5 ${st === "for" ? "border-emerald-500/50" : "border-rose-500/50"}`}
                                data-testid={`prep-evidence-${st}-${i}`}
                              >
                                "{q.quote}" <span className="not-italic text-muted-foreground">— {q.source}</span>
                              </blockquote>
                            ))}
                          </div>
                        ))}
                      </>
                    )}

                    {prepSection === "case" && prep.caseOutline.map((c, i) => (
                      <div key={i} className="p-2 rounded-md border border-border" data-testid={`prep-contention-${i}`}>
                        <div className="text-xs font-bold text-primary mb-0.5">Contention {i + 1}: {c.title}</div>
                        <div className="text-xs text-foreground/80"><span className="font-semibold text-accent">Claim:</span> {c.claim}</div>
                        <div className="text-xs text-foreground/80 mt-0.5"><span className="font-semibold text-accent">Warrant:</span> {c.warrant}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {prepOpen && !prep && !researchQuery.isLoading && (
                <p className="text-xs text-muted-foreground mt-2">Couldn't load prep packet.</p>
              )}
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl font-bold text-primary">Transcript</h2>
              {history.length > 0 && (
                <button
                  data-testid="button-reset-round"
                  onClick={resetRound}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {history.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Your speech and the bot's reply will appear here.
                </p>
              )}
              <AnimatePresence initial={false}>
                {history.map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    data-testid={`transcript-turn-${i}`}
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
                  </motion.div>
                ))}
              </AnimatePresence>
              {(recording || liveTranscript) && liveTranscript && (
                <div
                  data-testid="text-live-transcript"
                  className="p-3 rounded-lg text-sm leading-relaxed bg-primary/5 border-l-4 border-primary/40"
                >
                  <div className="text-[10px] uppercase tracking-wider font-bold mb-1 text-primary/70 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    You (live)
                  </div>
                  <div className="text-foreground/70 italic">{liveTranscript}</div>
                </div>
              )}
            </div>
            <Button
              data-testid="button-get-feedback"
              onClick={getFeedback}
              disabled={history.length === 0 || feedbackLoading}
              className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {feedbackLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scoring…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Get Feedback Card</>
              )}
            </Button>
          </Card>

          {feedbackError && !feedback && (
            <Card className="p-4 border-destructive/40 bg-destructive/5" data-testid="card-feedback-error">
              <div className="flex items-start gap-2 text-sm text-foreground">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <span>{feedbackError}</span>
              </div>
            </Card>
          )}

          {feedback && (() => {
            const sub = feedback.subscores;
            const scores = sub
              ? [sub.clarity, sub.pace, sub.fillers, sub.structure, sub.rebuttal]
                  .filter((x) => !!x)
                  .map((x) => x.score)
              : [];
            const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            const lowScore = avg > 0 && avg < 7;
            const coachLink = `/coaches?format=${encodeURIComponent(format)}&score=${avg.toFixed(1)}`;
            return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <Card className="overflow-hidden border-accent/40" data-testid="card-feedback">
                {/* Header: overall score */}
                <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-white/70 mb-1">
                        Overall Score
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-5xl font-display font-bold text-white"
                          data-testid="text-overall-score"
                        >
                          {feedback.overallScore}
                        </span>
                        <span className="text-lg text-white/60 font-semibold">/100</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                        <Volume2 className="w-4 h-4 text-accent" />
                        <span className="text-xs font-semibold">Coach Report</span>
                      </div>
                      {user && savingRound && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-white/80"
                          data-testid="text-saving"
                        >
                          <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                        </span>
                      )}
                      {user && savedRoundId && !savingRound && (
                        <Link
                          href="/history"
                          className="inline-flex items-center gap-1 text-[11px] text-white font-semibold hover:underline"
                          data-testid="text-saved"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Saved to history
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-5 text-center">
                    <div className="bg-white/10 rounded-lg py-2">
                      <div className="text-[10px] uppercase tracking-wider text-white/60">Pace</div>
                      <div className="text-lg font-bold text-white" data-testid="text-metric-wpm">
                        {feedback.metrics.wpm}
                      </div>
                      <div className="text-[10px] text-white/60">wpm</div>
                    </div>
                    <div className="bg-white/10 rounded-lg py-2">
                      <div className="text-[10px] uppercase tracking-wider text-white/60">Words</div>
                      <div className="text-lg font-bold text-white" data-testid="text-metric-words">
                        {feedback.metrics.wordCount}
                      </div>
                      <div className="text-[10px] text-white/60">spoken</div>
                    </div>
                    <div className="bg-white/10 rounded-lg py-2">
                      <div className="text-[10px] uppercase tracking-wider text-white/60">Fillers</div>
                      <div className="text-lg font-bold text-white" data-testid="text-metric-fillers">
                        {feedback.metrics.fillerCount}
                      </div>
                      <div className="text-[10px] text-white/60">caught</div>
                    </div>
                  </div>
                </div>

                {/* Strengths / Weaknesses */}
                <div className="grid sm:grid-cols-2 gap-px bg-border">
                  <div className="bg-card p-4" data-testid="block-strengths">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                      <ThumbsUp className="w-3.5 h-3.5" /> Strengths
                    </div>
                    <ul className="space-y-1.5">
                      {feedback.strengths.map((s, i) => (
                        <li
                          key={i}
                          data-testid={`text-strength-${i}`}
                          className="text-xs text-foreground/90 leading-relaxed flex gap-1.5"
                        >
                          <span className="text-emerald-500 mt-0.5">✓</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-card p-4" data-testid="block-weaknesses">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                      <TrendingUp className="w-3.5 h-3.5" /> Areas to work on
                    </div>
                    <ul className="space-y-1.5">
                      {feedback.weaknesses.map((w, i) => (
                        <li
                          key={i}
                          data-testid={`text-weakness-${i}`}
                          className="text-xs text-foreground/90 leading-relaxed flex gap-1.5"
                        >
                          <span className="text-amber-500 mt-0.5">→</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Sub-scores */}
                <div className="p-6 space-y-5">
                  <SubScoreRow
                    label="Clarity"
                    icon={MessageSquare}
                    item={feedback.subscores.clarity}
                    testId="feedback-clarity"
                  />
                  <SubScoreRow
                    label="Pace"
                    icon={Gauge}
                    item={feedback.subscores.pace}
                    metricLabel={`${feedback.metrics.wpm} wpm`}
                    testId="feedback-pace"
                  />
                  <SubScoreRow
                    label="Filler words"
                    icon={Zap}
                    item={feedback.subscores.fillers}
                    metricLabel={`${feedback.metrics.fillerCount} found`}
                    testId="feedback-fillers"
                  />
                  <SubScoreRow
                    label="Argument structure"
                    icon={Layers}
                    item={feedback.subscores.structure}
                    testId="feedback-structure"
                  />
                  <SubScoreRow
                    label="Rebuttal quality"
                    icon={Target}
                    item={feedback.subscores.rebuttal}
                    testId="feedback-rebuttal"
                  />
                </div>

                {/* Filler chips */}
                {feedback.metrics.fillers.length > 0 && (
                  <div className="px-6 pb-6" data-testid="block-filler-chips">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      <AlertCircle className="w-3.5 h-3.5" /> Filler-word timeline
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {feedback.metrics.fillers.slice(0, 24).map((f, i) => (
                        <span
                          key={i}
                          data-testid={`chip-filler-${i}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900"
                          title={formatTimestamp(f.turnIndex, f.timestampSec)}
                        >
                          <span className="font-semibold">"{f.word}"</span>
                          <span className="text-[10px] opacity-70">
                            {formatTimestamp(f.turnIndex, f.timestampSec)}
                          </span>
                        </span>
                      ))}
                      {feedback.metrics.fillers.length > 24 && (
                        <span className="text-[11px] text-muted-foreground self-center">
                          +{feedback.metrics.fillers.length - 24} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {feedback.rfd && typeof feedback.rfd === "object" && (
                  <div
                    data-testid="card-rfd"
                    className="mt-0 pt-4 border-t border-border bg-accent/5 -mx-6 px-6 py-4 rounded-b-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-accent">
                        Judge's RFD
                      </div>
                      <span
                        data-testid="text-rfd-decision"
                        className="text-xs font-bold px-2 py-0.5 rounded bg-accent text-white"
                      >
                        {feedback.rfd.decision} wins
                      </span>
                    </div>
                    <p
                      data-testid="text-rfd-reason"
                      className="text-sm text-foreground leading-relaxed mb-2"
                    >
                      {feedback.rfd.reason}
                    </p>
                    {feedback.rfd.keyVoters?.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        {feedback.rfd.keyVoters.map((v, i) => (
                          <li key={i} data-testid={`text-rfd-voter-${i}`}>
                            {v}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>

              {lowScore ? (
                <Card className="p-5 border-accent/60 bg-accent/5" data-testid="card-coach-nudge">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="font-display font-bold text-primary text-sm mb-1">
                        Want a human coach to take it from here?
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Your average was {avg.toFixed(1)}/10. A 30-minute session with a coach can fix
                        the gaps the AI flagged in days, not weeks.
                      </p>
                      <Link href={coachLink} data-testid="link-book-after-low-score">
                        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                          <CalendarDays className="w-3.5 h-3.5 mr-1.5" /> Book a Coach
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-5" data-testid="card-coach-cta">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-display font-bold text-primary text-sm mb-1">
                        Take this momentum into a real session
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Pair your AI prep with a human coach to fine-tune strategy before your next round.
                      </p>
                      <Link href={coachLink} data-testid="link-book-coach-results">
                        <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/5">
                          Browse coaches
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
            );
          })()}
        </div>
      </section>
    </div>
  );
}
