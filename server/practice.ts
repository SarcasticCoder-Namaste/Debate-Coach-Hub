import type { Express, Request, Response } from "express";
import { z } from "zod";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type {
  ChatCompletionMessageParam,
  ChatCompletionAudioParam,
} from "openai/resources/chat/completions";
import { openai, ensureCompatibleFormat, speechToText } from "./replit_integrations/audio/client";
import { ObjectStorageService, ObjectNotFoundError } from "./replit_integrations/object_storage";
import { storage } from "./storage";
import {
  feedbackPayloadSchema,
  insertPracticeShareSchema,
  insertPracticeShareCommentSchema,
  coachReferralRequestSchema,
  type FeedbackReport,
  type PracticeShare,
} from "@shared/schema";
import {
  checkPracticeMinutes,
  recordPracticeMinutes,
  requireFeature,
} from "./billing";
import { LANGUAGES, LANGUAGE_CODES, type LanguageCode } from "@shared/languages";

const FORMAT_GUIDES: Record<string, string> = {
  LD: "Lincoln-Douglas (1-on-1, value debate, framework + contentions, ~6 min constructive).",
  PF: "Public Forum (2-on-2, accessible argumentation, evidence-driven, 4-min cases).",
  Policy: "Policy Debate (CX, plan-focused, evidence comparison, fast delivery acceptable but clarity required).",
  Parli: "Parliamentary (limited prep, 7-8 min speeches, logic and rhetoric over evidence; PMC/LOC/MGC/MOC/LOR/PMR structure).",
  Congress: "Congressional Debate (3-min legislative speeches on bills/resolutions, parliamentary procedure, persuasive chamber-style).",
  Worlds: "World Schools (3-on-3, 8-min substantives + 4-min reply, principle-driven, balanced rhetoric and analysis).",
};

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = (typeof VOICES)[number];

const languageSchema = z.enum(LANGUAGE_CODES as [LanguageCode, ...LanguageCode[]]).default("en");

function languageInstruction(lang: LanguageCode): string {
  const cfg = LANGUAGES[lang];
  if (lang === "en") {
    return "Speak and write entirely in English.";
  }
  return `Speak and write entirely in ${cfg.promptName}. Every word of your response — including any proper nouns you cite — must be rendered in ${cfg.promptName}. Do not switch to English at any point. Maintain natural, native-level fluency in ${cfg.promptName}.`;
}

function buildSystemPrompt(
  topic: string,
  side: "Aff" | "Neg",
  format: string,
  lang: LanguageCode,
  packet?: PacketContext | null,
) {
  const opposing = side === "Aff" ? "Negative" : "Affirmative";
  const packetBlock = packet
    ? `

The student is prepping from a coach-provided topic packet titled "${packet.title}".
Use this packet as your shared evidence pool — your counter-arguments must engage
its framing and cite specific points or evidence from it where possible. When you
reference the packet, name it briefly (e.g. "your packet's third card on …").

PACKET SUMMARY:
${packet.summary}

KEY POINTS / EVIDENCE FROM THE PACKET:
${packet.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

PACKET EXCERPT (verbatim, may be truncated):
"""
${packet.excerpt}
"""`
    : "";

  return `You are an experienced competitive debate coach and a sharp ${opposing} opponent.

Resolution / Topic: "${topic}"
Student is debating: ${side === "Aff" ? "Affirmative" : "Negative"}
Format: ${FORMAT_GUIDES[format] ?? format}${packetBlock}

Language requirement: ${languageInstruction(lang)}

Your job each turn:
1. Listen to the student's speech.
2. Respond as a tough but fair ${opposing} opponent. Give 2-3 concise counter-arguments with reasoning (and brief example evidence where appropriate).${packet ? "\n   Reference the packet's framing/evidence by name when it strengthens your attack or turns the student's own card." : ""}
3. Keep responses to 60-90 seconds when spoken aloud (about 130-200 words). Conversational, clear, and focused. No lists, no headings — speak as a debater would in-round.
4. End with a probing question or challenge that pushes them to defend their position.

Stay in character as the opponent. Do NOT add coaching tips inside this response — feedback is delivered separately.`;
}

interface PacketContext {
  title: string;
  summary: string;
  keyPoints: string[];
  excerpt: string;
}

const packetContextSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(4_000),
  keyPoints: z.array(z.string().max(500)).max(20).default([]),
  excerpt: z.string().max(8_000),
});

import {
  practiceTurnSchema,
  feedbackReportSchema,
  type FillerHit,
} from "@shared/schema";

const turnSchema = practiceTurnSchema;

const SUBSCORE_LLM_SCHEMA = z.object({
  clarity: z.object({ score: z.number(), comment: z.string(), suggestion: z.string() }),
  structure: z.object({ score: z.number(), comment: z.string(), suggestion: z.string() }),
  rebuttal: z.object({ score: z.number(), comment: z.string(), suggestion: z.string() }),
  strengths: z.array(z.string()).min(1).max(4),
  weaknesses: z.array(z.string()).min(1).max(4),
  rfd: z
    .object({
      decision: z.enum(["Aff", "Neg"]),
      reason: z.string(),
      keyVoters: z.array(z.string()).max(5),
    })
    .optional(),
});

const FEEDBACK_PROMPT_BASE = `You are a debate coach giving structured, honest feedback on a student's practice round.
You will receive: the resolution, the student's side, and the round transcript labeled by speaker.
Score ONLY the student's speeches. Be specific and reference what they actually said.

Return ONLY JSON matching exactly this schema, no prose:
{
  "clarity": { "score": 0-100, "comment": "1-2 sentences", "suggestion": "one concrete improvement tip" },
  "structure": { "score": 0-100, "comment": "1-2 sentences on argument structure / framework / signposting", "suggestion": "one concrete improvement tip" },
  "rebuttal": { "score": 0-100, "comment": "1-2 sentences on how they engaged the opponent's arguments", "suggestion": "one concrete improvement tip" },
  "strengths": ["1-3 short bullets"],
  "weaknesses": ["1-3 short bullets"]
}`;

const JUDGE_RFD_BLOCK = `Additionally, because the user has enabled JUDGE MODE, also include a Reason For Decision field "rfd" in the JSON, decisively picking a winning side based on the flow as written:
{
  "rfd": {
    "decision": "Aff" | "Neg",
    "reason": "2-4 sentence judge's RFD explaining why that side won, citing flow",
    "keyVoters": ["short voter 1", "short voter 2", "short voter 3"]
  }
}
Be decisive — pick a winner.`;

function feedbackLanguageTail(lang: LanguageCode, includeRfd: boolean): string {
  const fields = includeRfd
    ? "comments, suggestions, strengths, weaknesses, rfd.reason, rfd.keyVoters"
    : "comments, suggestions, strengths, weaknesses";
  const enumNote = includeRfd
    ? ` and the rfd.decision enum ("Aff" | "Neg")`
    : "";
  return `\n\nLanguage requirement for ALL human-readable string values (${fields}):\n${languageInstruction(lang)}\nThe JSON KEYS${enumNote} must remain exactly as shown above in English; only the other string VALUES are translated.`;
}

function feedbackPrompt(lang: LanguageCode): string {
  return `${FEEDBACK_PROMPT_BASE}${feedbackLanguageTail(lang, false)}`;
}

function feedbackPromptJudge(lang: LanguageCode): string {
  return `${FEEDBACK_PROMPT_BASE}\n\n${JUDGE_RFD_BLOCK}${feedbackLanguageTail(lang, true)}`;
}

/* ---------- metric helpers (deterministic, computed server-side) ---------- */
const FILLER_PATTERNS: Array<{ word: string; re: RegExp }> = [
  { word: "um", re: /\bu+m+\b/gi },
  { word: "uh", re: /\bu+h+\b/gi },
  { word: "like", re: /\blike\b/gi },
  { word: "you know", re: /\byou know\b/gi },
];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractFillers(turns: Array<{ content: string; durationSec?: number }>): {
  fillers: FillerHit[];
  totalWords: number;
  totalDuration: number;
} {
  const fillers: FillerHit[] = [];
  let totalWords = 0;
  let totalDuration = 0;

  turns.forEach((turn, turnIndex) => {
    const text = turn.content;
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const dur = turn.durationSec && turn.durationSec > 0 ? turn.durationSec : Math.max(1, wordCount / 2.5);
    totalWords += wordCount;
    totalDuration += dur;

    for (const { word, re } of FILLER_PATTERNS) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const charIdx = m.index;
        const before = text.slice(0, charIdx).trim();
        const wordPos = before ? before.split(/\s+/).length : 0;
        const ts = wordCount > 0 ? (wordPos / wordCount) * dur : 0;
        fillers.push({
          word,
          timestampSec: Math.round(ts * 10) / 10,
          turnIndex,
        });
      }
    }
  });

  fillers.sort((a, b) =>
    a.turnIndex === b.turnIndex ? a.timestampSec - b.timestampSec : a.turnIndex - b.turnIndex,
  );
  return { fillers, totalWords, totalDuration };
}

function paceSubscore(wpm: number) {
  // Ideal conversational debate pace ~140-180 wpm.
  let score: number;
  let comment: string;
  let suggestion: string;
  if (wpm === 0) {
    score = 0;
    comment = "Couldn't measure your pace — the round was too short.";
    suggestion = "Deliver a longer speech (at least 30 seconds) so pace can be measured.";
  } else if (wpm < 110) {
    score = Math.max(40, 100 - (140 - wpm) * 1.2);
    comment = `Your pace of ${wpm} words/min is on the slow side, which can lose the judge's attention.`;
    suggestion = "Aim for 140-170 wpm — practice reading a passage aloud at a brisk but clear pace.";
  } else if (wpm > 200) {
    score = Math.max(40, 100 - (wpm - 180) * 0.9);
    comment = `Your pace of ${wpm} words/min is fast — clarity may suffer at this speed.`;
    suggestion = "Slow down on tag lines and key warrants; sprint only through cited evidence.";
  } else {
    score = Math.round(100 - Math.abs(160 - wpm) * 0.6);
    comment = `Your pace of ${wpm} words/min is in the ideal conversational range.`;
    suggestion = "Hold this tempo, and vary it slightly to emphasize key arguments.";
  }
  return { score: Math.max(0, Math.min(100, Math.round(score))), comment, suggestion };
}

function fillerSubscore(fillerCount: number, totalWords: number) {
  const per100 = totalWords > 0 ? (fillerCount / totalWords) * 100 : 0;
  let score: number;
  let comment: string;
  let suggestion: string;
  if (totalWords === 0) {
    score = 0;
    comment = "No speech to analyze for filler words yet.";
    suggestion = "Deliver a full speech to get a filler-word readout.";
  } else if (fillerCount === 0) {
    score = 100;
    comment = "Zero filler words — extremely clean delivery.";
    suggestion = "Keep practicing pause-instead-of-filler to lock this in.";
  } else if (per100 <= 1) {
    score = 90;
    comment = `Only ${fillerCount} filler word${fillerCount === 1 ? "" : "s"} across your speech — very clean.`;
    suggestion = "Replace any remaining fillers with a deliberate half-second pause.";
  } else if (per100 <= 3) {
    score = 75;
    comment = `${fillerCount} filler words (about ${per100.toFixed(1)} per 100 words) — noticeable but not distracting.`;
    suggestion = "Mark transition points in your flow and breathe instead of saying 'um' or 'like'.";
  } else if (per100 <= 6) {
    score = 55;
    comment = `${fillerCount} filler words (${per100.toFixed(1)} per 100) — judges will start to notice.`;
    suggestion = "Record yourself and re-deliver, consciously pausing where each filler appears.";
  } else {
    score = 35;
    comment = `${fillerCount} filler words (${per100.toFixed(1)} per 100) — significantly hurts your delivery.`;
    suggestion = "Slow your pace and rehearse from a brief outline so you have less reason to stall.";
  }
  return { score, comment, suggestion };
}

function computeOverall(subs: Record<string, { score: number }>): number {
  const weights = { clarity: 0.2, pace: 0.15, fillers: 0.15, structure: 0.25, rebuttal: 0.25 };
  let total = 0;
  for (const [k, w] of Object.entries(weights)) total += (subs[k]?.score ?? 0) * w;
  return Math.round(total);
}

const transcribeSchema = z.object({
  audio: z.string().min(1),
  language: languageSchema,
});

const respondSchema = z.object({
  topic: z.string().min(1),
  side: z.enum(["Aff", "Neg"]),
  format: z.string().default("LD"),
  history: z.array(turnSchema).default([]),
  voice: z.enum(VOICES).default("onyx"),
  packet: packetContextSchema.nullish(),
  language: languageSchema,
});

const packetIngestSchema = z
  .object({
    title: z.string().max(200).optional(),
    text: z.string().optional(),
    pdf: z.string().optional(),
    docx: z.string().optional(),
    fileName: z.string().max(200).optional(),
  })
  .refine(
    (d) =>
      (d.text && d.text.trim().length > 0) ||
      (d.pdf && d.pdf.length > 0) ||
      (d.docx && d.docx.length > 0),
    { message: "Provide pasted text, a PDF, or a .docx file" },
  );

const packetModelOutputSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  keyPoints: z.array(z.unknown()).optional(),
});

const PACKET_MAX_CHARS = 60_000;
const PACKET_PDF_MAX_BYTES = 4 * 1024 * 1024;
const PACKET_EXCERPT_CHARS = 6_000;

const PACKET_PROMPT = `You are helping a competitive debate student prep against an AI opponent.
Read the topic packet below (a coach-provided brief / evidence packet) and produce a JSON object that another model will use as round context.

Return ONLY JSON matching this exact schema, no prose:
{
  "title": "concise descriptive title <= 80 chars (use the user's title if provided, else infer one)",
  "summary": "3-5 sentence neutral summary of the packet's framing, scope, and main claims on both sides",
  "keyPoints": ["8-15 bullet strings, each a single specific claim, framing move, or piece of evidence (with author/source if the packet names one). Mix Aff and Neg material."]
}
Be faithful to the packet. Do not invent evidence the packet does not contain.`;

const feedbackSchema = z.object({
  topic: z.string().min(1),
  side: z.enum(["Aff", "Neg"]),
  transcript: z.array(turnSchema).min(1),
  judgeMode: z.boolean().optional().default(false),
  language: languageSchema,
});

interface AudioReplyMessage {
  content?: string | null;
  audio?: { transcript?: string; data?: string } | null;
}

/* ------------------ share-clip configuration ------------------ */

const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
const SHARE_TTL_DAYS = 30;
const UPLOAD_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 min — matches presigned URL TTL
const ALLOWED_MIME = new Set([
  "video/webm",
  "video/mp4",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
]);

// Server secret used to bind a finalize call back to its init. We re-use
// SESSION_SECRET if set, otherwise generate a per-process secret.
const UPLOAD_SECRET =
  process.env.SESSION_SECRET || randomBytes(32).toString("hex");

function signUploadToken(payload: { objectPath: string; ip: string; exp: number }): string {
  const body = `${payload.objectPath}|${payload.ip}|${payload.exp}`;
  const sig = createHmac("sha256", UPLOAD_SECRET).update(body).digest("base64url");
  return `${payload.exp}.${sig}`;
}

function verifyUploadToken(token: string, objectPath: string, ip: string): boolean {
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = createHmac("sha256", UPLOAD_SECRET)
    .update(`${objectPath}|${ip}|${exp}`)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Simple in-memory rate limiter per IP. Max N requests within window.
type Bucket = { count: number; resetAt: number };
function makeRateLimiter(max: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();
  return (ip: string): boolean => {
    const now = Date.now();
    const b = buckets.get(ip);
    if (!b || b.resetAt < now) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (b.count >= max) return false;
    b.count += 1;
    return true;
  };
}

const limitInit = makeRateLimiter(20, 60 * 60 * 1000);     // 20 init / hr / IP
const limitFinalize = makeRateLimiter(10, 60 * 60 * 1000); // 10 saves / hr / IP
const limitComment = makeRateLimiter(15, 10 * 60 * 1000);  // 15 comments / 10 min / IP
const limitReferral = makeRateLimiter(8, 60 * 60 * 1000);  // 8 coach emails / hr / IP

function clientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!.trim();
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

// URL-safe slug, ~10 chars (~60 bits of entropy).
function makeSlug(): string {
  return randomBytes(8)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
    .slice(0, 10);
}

const initShareSchema = z.object({
  contentType: z.string().min(1),
  size: z.number().int().positive().max(MAX_VIDEO_BYTES),
});

const finalizeShareSchema = insertPracticeShareSchema.extend({
  feedback: feedbackReportSchema.nullable().optional(),
  uploadToken: z.string().min(10),
});

/* ------------------ coach referral email ------------------ */

const FORMAT_LONG: Record<string, string> = {
  LD: "Lincoln-Douglas",
  PF: "Public Forum",
  Policy: "Policy",
  Parli: "Parliamentary",
  Congress: "Congressional Debate",
  Worlds: "World Schools",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function feedbackSummaryLines(fb: FeedbackReport | null | undefined): string[] {
  if (!fb) return [];
  const lines = [
    `Overall ${fb.overallScore}/100`,
    `Clarity ${fb.subscores.clarity.score}/10 — ${fb.subscores.clarity.comment}`,
    `Pace ${fb.subscores.pace.score}/10 — ${fb.subscores.pace.comment}`,
    `Fillers ${fb.subscores.fillers.score}/10 — ${fb.subscores.fillers.comment}`,
    `Structure ${fb.subscores.structure.score}/10 — ${fb.subscores.structure.comment}`,
    `Rebuttal ${fb.subscores.rebuttal.score}/10 — ${fb.subscores.rebuttal.comment}`,
  ];
  if (fb.strengths.length) lines.push(`Strengths: ${fb.strengths.slice(0, 3).join("; ")}`);
  if (fb.weaknesses.length) lines.push(`Focus: ${fb.weaknesses.slice(0, 3).join("; ")}`);
  return lines;
}

function buildReferralEmail(opts: {
  share: PracticeShare;
  shareUrl: string;
  studentName?: string;
  studentEmail?: string;
  note?: string;
}) {
  const { share, shareUrl, studentName, studentEmail, note } = opts;
  const sideLong = share.side === "Aff" ? "Affirmative" : "Negative";
  const formatLong = FORMAT_LONG[share.format] ?? share.format;
  const fb = (share.feedback ?? null) as FeedbackReport | null;
  const fbLines = feedbackSummaryLines(fb);
  const who = studentName?.trim()
    ? studentName.trim()
    : studentEmail?.trim()
      ? studentEmail.trim()
      : "A student";

  const subject = `Debate practice clip from ${who} — ${share.topic}`;

  const textParts = [
    `${who} would like a coach to review their practice round.`,
    "",
    `Topic:  ${share.topic}`,
    `Side:   ${sideLong}`,
    `Format: ${formatLong}`,
    "",
    `Watch the clip: ${shareUrl}`,
  ];
  if (note?.trim()) {
    textParts.push("", "Their note:", note.trim());
  }
  if (fbLines.length > 0) {
    textParts.push("", "Auto-generated feedback summary:", ...fbLines.map((l) => `  - ${l}`));
  }
  if (studentEmail?.trim()) {
    textParts.push("", `Reply-to: ${studentEmail.trim()}`);
  }
  textParts.push("", "— Sent via DebateMastery practice bot");
  const text = textParts.join("\n");

  const fbHtml =
    fbLines.length > 0
      ? `<h3 style="margin:24px 0 8px;font-size:14px;color:#333;">Feedback summary</h3><ul style="padding-left:18px;margin:0;color:#444;font-size:14px;line-height:1.5;">${fbLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`
      : "";
  const noteHtml = note?.trim()
    ? `<h3 style="margin:24px 0 8px;font-size:14px;color:#333;">Note from ${escapeHtml(who)}</h3><p style="white-space:pre-wrap;color:#444;font-size:14px;line-height:1.5;margin:0;">${escapeHtml(note.trim())}</p>`
    : "";
  const replyHtml = studentEmail?.trim()
    ? `<p style="font-size:12px;color:#888;margin-top:24px;">Reply directly to <a href="mailto:${escapeHtml(studentEmail.trim())}">${escapeHtml(studentEmail.trim())}</a>.</p>`
    : "";

  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f7f9;padding:24px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e6e8ec;">
  <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Debate practice clip from ${escapeHtml(who)}</h2>
  <p style="margin:0 0 16px;color:#555;font-size:14px;">A student is asking you to review their practice round.</p>
  <table style="border-collapse:collapse;font-size:14px;color:#222;margin-bottom:16px;">
    <tr><td style="padding:2px 12px 2px 0;color:#777;">Topic</td><td>${escapeHtml(share.topic)}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#777;">Side</td><td>${escapeHtml(sideLong)}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#777;">Format</td><td>${escapeHtml(formatLong)}</td></tr>
  </table>
  <a href="${escapeHtml(shareUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;">Watch the clip</a>
  <p style="font-size:12px;color:#888;margin-top:8px;word-break:break-all;">${escapeHtml(shareUrl)}</p>
  ${noteHtml}
  ${fbHtml}
  ${replyHtml}
  <p style="font-size:12px;color:#aaa;margin-top:24px;">Sent via DebateMastery practice bot</p>
</div></body></html>`;

  return { subject, text, html };
}

type EmailResult = { status: "sent" | "skipped" | "failed"; error?: string };

async function sendCoachEmail(args: {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailResult> {
  const sgKey = process.env.SENDGRID_API_KEY;
  const from =
    process.env.COACH_REFERRAL_FROM ||
    process.env.MAIL_FROM ||
    "no-reply@debatemastery.app";

  if (!sgKey) {
    console.warn(
      "[coach-referral] SENDGRID_API_KEY not set — referral recorded but email not sent.",
    );
    return { status: "skipped", error: "Email transport not configured" };
  }

  try {
    const personalization: Record<string, unknown> = { to: [{ email: args.to }] };
    const body: Record<string, unknown> = {
      personalizations: [personalization],
      from: { email: from, name: "DebateMastery" },
      subject: args.subject,
      content: [
        { type: "text/plain", value: args.text },
        { type: "text/html", value: args.html },
      ],
    };
    if (args.replyTo) body.reply_to = { email: args.replyTo };

    const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sgKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (resp.status >= 200 && resp.status < 300) {
      return { status: "sent" };
    }
    const errText = await resp.text().catch(() => "");
    console.error("[coach-referral] SendGrid error", resp.status, errText);
    return { status: "failed", error: `SendGrid ${resp.status}` };
  } catch (err) {
    console.error("[coach-referral] send exception", err);
    return { status: "failed", error: err instanceof Error ? err.message : "send failed" };
  }
}

function buildShareUrl(req: Request, id: string): string {
  const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
  return `${proto}://${host}/share/${id}`;
}

// Best-effort cleanup of expired shares. Runs at most every 5 min.
let lastSweepAt = 0;
async function deleteStoredObject(objSvc: ObjectStorageService, objectPath: string) {
  try {
    const file = await objSvc.getObjectEntityFile(objectPath);
    await file.delete({ ignoreNotFound: true });
  } catch (err) {
    if (err instanceof ObjectNotFoundError) return;
    console.error("deleteStoredObject error", err);
  }
}

async function sweepExpired() {
  const now = Date.now();
  if (now - lastSweepAt < 5 * 60 * 1000) return;
  lastSweepAt = now;
  try {
    const objSvc = new ObjectStorageService();
    const expired = await storage.listExpiredPracticeShares(new Date());
    for (const row of expired) {
      await deleteStoredObject(objSvc, row.objectPath);
      await storage.deletePracticeShare(row.id);
    }
  } catch (err) {
    console.error("sweepExpired error", err);
  }
}

export function registerPracticeRoutes(app: Express) {
  const objSvc = new ObjectStorageService();

  // Transcribe an uploaded audio chunk (base64) to text.
  app.post("/api/practice/transcribe", async (req: Request, res: Response) => {
    const parsed = transcribeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Missing audio" });
    try {
      const raw = Buffer.from(parsed.data.audio, "base64");
      const { buffer, format } = await ensureCompatibleFormat(raw);
      const text = await speechToText(buffer, format, parsed.data.language);
      res.json({ text });
    } catch (err) {
      console.error("transcribe error", err);
      res.status(500).json({ error: "Transcription failed" });
    }
  });

  app.post("/api/practice/respond", async (req: Request, res: Response) => {
    const parsed = respondSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
    const { topic, side, format, history, voice, packet, language } = parsed.data;

    // Server-side enforcement: each opponent turn is ~1 minute of practice.
    const MINUTES_PER_TURN = 1;
    const gate = await checkPracticeMinutes(req, MINUTES_PER_TURN);
    if (!gate.ok) {
      return res
        .status(gate.status)
        .json({ error: gate.message, code: gate.code });
    }

    try {
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: buildSystemPrompt(topic, side, format, language, packet) },
        ...history.map<ChatCompletionMessageParam>((m) => ({
          role: m.role,
          content: m.content,
        })),
      ];

      const audioParam: ChatCompletionAudioParam = { voice: voice as Voice, format: "mp3" };
      const response = await openai.chat.completions.create({
        model: "gpt-audio",
        modalities: ["text", "audio"],
        audio: audioParam,
        messages,
      });

      const message = response.choices[0]?.message as
        | (typeof response.choices[0]["message"] & AudioReplyMessage)
        | undefined;
      const transcript: string = message?.audio?.transcript ?? message?.content ?? "";
      const audioB64: string = message?.audio?.data ?? "";
      await recordPracticeMinutes(req, MINUTES_PER_TURN);
      res.json({ transcript, audio: audioB64 });
    } catch (err) {
      console.error("respond error", err);
      res.status(500).json({ error: "Bot response failed" });
    }
  });

  // Ingest a coach-provided topic packet (pasted text or PDF), returning a compact context object.
  app.post("/api/practice/packet", async (req: Request, res: Response) => {
    const parsed = packetIngestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Provide pasted text, a PDF, or a Word (.docx) file." });
    }

    let rawText = "";
    let inferredTitle = (parsed.data.title || "").trim();
    let source: "pdf" | "docx" | "text" = "text";

    try {
      if (parsed.data.pdf) {
        source = "pdf";
        const buf = Buffer.from(parsed.data.pdf, "base64");
        if (buf.length === 0) {
          return res.status(400).json({ error: "PDF appears empty." });
        }
        if (buf.length > PACKET_PDF_MAX_BYTES) {
          return res.status(413).json({
            error: `PDF is too large. Please keep it under ${Math.round(PACKET_PDF_MAX_BYTES / (1024 * 1024))} MB.`,
          });
        }
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(buf) });
        const result = await parser.getText();
        await parser.destroy();
        rawText = (result?.text || "").trim();
        if (!inferredTitle && parsed.data.fileName) {
          inferredTitle = parsed.data.fileName.replace(/\.[^.]+$/, "").slice(0, 80);
        }
      } else if (parsed.data.docx) {
        source = "docx";
        const buf = Buffer.from(parsed.data.docx, "base64");
        if (buf.length === 0) {
          return res.status(400).json({ error: "Document appears empty." });
        }
        if (buf.length > PACKET_PDF_MAX_BYTES) {
          return res.status(413).json({
            error: `Document is too large. Please keep it under ${Math.round(PACKET_PDF_MAX_BYTES / (1024 * 1024))} MB.`,
          });
        }
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer: buf });
        rawText = (result?.value || "").trim();
        if (!inferredTitle && parsed.data.fileName) {
          inferredTitle = parsed.data.fileName.replace(/\.[^.]+$/, "").slice(0, 80);
        }
      } else if (parsed.data.text) {
        rawText = parsed.data.text.trim();
      }

      if (!rawText) {
        return res.status(400).json({
          error: "Couldn't read any text from that file. Try pasting the brief instead.",
        });
      }

      // Normalize whitespace and cap size before sending to the model.
      const cleaned = rawText.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      const truncated = cleaned.length > PACKET_MAX_CHARS ? cleaned.slice(0, PACKET_MAX_CHARS) : cleaned;
      const excerpt = cleaned.slice(0, PACKET_EXCERPT_CHARS);

      const userPrompt = `${inferredTitle ? `Suggested title: ${inferredTitle}\n\n` : ""}Packet text:\n"""\n${truncated}\n"""`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: PACKET_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let parsedUnknown: unknown;
      try {
        parsedUnknown = JSON.parse(raw);
      } catch {
        return res.status(502).json({ error: "Couldn't summarize the packet. Try again." });
      }

      const validated = packetModelOutputSchema.safeParse(parsedUnknown);
      if (!validated.success) {
        return res.status(502).json({ error: "Packet summary was malformed. Try again." });
      }

      const title = (validated.data.title || inferredTitle || "Topic packet").slice(0, 120);
      const summary = (validated.data.summary ?? "").trim();
      const keyPoints = (validated.data.keyPoints ?? [])
        .map((p) => String(p).trim())
        .filter((s) => s.length > 0)
        .slice(0, 20);

      if (!summary || keyPoints.length === 0) {
        return res.status(502).json({ error: "Packet summary was empty. Try a longer or clearer brief." });
      }

      const context: PacketContext = { title, summary, keyPoints, excerpt };
      res.json({
        packet: context,
        stats: {
          characters: cleaned.length,
          truncated: cleaned.length > PACKET_MAX_CHARS,
          source,
        },
      });
    } catch (err) {
      console.error("packet ingest error", err);
      res.status(500).json({ error: "Couldn't read that packet. Try pasting the text instead." });
    }
  });

  // Structured scorecard + written feedback from the round transcript.
  // Judge-mode RFD output is gated behind the Pro/Team `judgeMode` feature.
  app.post("/api/practice/feedback", async (req: Request, res: Response) => {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
    const { topic, side, transcript, judgeMode, language } = parsed.data;

    if (judgeMode) {
      const gate = await requireFeature(req, "judgeMode");
      if (!gate.ok) {
        return res
          .status(gate.status)
          .json({ error: gate.message, code: gate.code });
      }
    }
    const systemPrompt = judgeMode
      ? feedbackPromptJudge(language)
      : feedbackPrompt(language);

    const userTurns = transcript.filter((t) => t.role === "user");
    const userWords = userTurns.reduce((acc, t) => acc + countWords(t.content), 0);
    if (userTurns.length === 0 || userWords < 15) {
      return res.status(422).json({
        error: "Round too short to score. Speak for at least a few sentences before requesting feedback.",
      });
    }

    // Map original transcript indices for filler turnIndex
    const userTurnIndices: number[] = [];
    transcript.forEach((t, i) => { if (t.role === "user") userTurnIndices.push(i); });

    const { fillers: localFillers, totalWords, totalDuration } = extractFillers(userTurns);
    const fillers: FillerHit[] = localFillers.map((f) => ({
      ...f,
      turnIndex: userTurnIndices[f.turnIndex] ?? f.turnIndex,
    }));
    const wpm = totalDuration > 0 ? Math.round((totalWords / totalDuration) * 60) : 0;

    const pace = paceSubscore(wpm);
    const fillerSub = fillerSubscore(fillers.length, totalWords);

    let llmResult: z.infer<typeof SUBSCORE_LLM_SCHEMA>;
    try {
      const convo = transcript
        .map((t) => `${t.role === "user" ? "Student" : "Opponent"}: ${t.content}`)
        .join("\n\n");

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Topic: ${topic}\nStudent side: ${side}\nLanguage: ${LANGUAGES[language].promptName}\n\nRound transcript:\n${convo}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(raw);
      } catch {
        return res.status(502).json({ error: "Model returned invalid JSON" });
      }
      const validated = SUBSCORE_LLM_SCHEMA.safeParse(parsedJson);
      if (!validated.success) {
        return res.status(502).json({ error: "Feedback did not match expected shape" });
      }
      llmResult = validated.data;
    } catch (err) {
      console.error("feedback error", err);
      return res.status(500).json({ error: "Feedback generation failed" });
    }

    const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
    const subscores = {
      clarity: { ...llmResult.clarity, score: clamp100(llmResult.clarity.score) },
      pace,
      fillers: fillerSub,
      structure: { ...llmResult.structure, score: clamp100(llmResult.structure.score) },
      rebuttal: { ...llmResult.rebuttal, score: clamp100(llmResult.rebuttal.score) },
    };
    const overallScore = computeOverall(subscores);

    const report: FeedbackReport = {
      overallScore,
      strengths: llmResult.strengths,
      weaknesses: llmResult.weaknesses,
      metrics: {
        wpm,
        durationSec: Math.round(totalDuration),
        wordCount: totalWords,
        fillerCount: fillers.length,
        fillers,
      },
      subscores,
      ...(judgeMode && llmResult.rfd ? { rfd: llmResult.rfd } : {}),
    };

    const finalCheck = feedbackReportSchema.safeParse(report);
    if (!finalCheck.success) {
      return res.status(500).json({ error: "Failed to assemble report" });
    }
    res.json(finalCheck.data);
  });

  /* ------------------ Shareable practice clips ------------------ */

  // Step 1: ask for a presigned upload URL for the recording.
  app.post("/api/practice/shares/init", async (req: Request, res: Response) => {
    if (!limitInit(clientIp(req))) {
      return res.status(429).json({ error: "Too many uploads — please try again later." });
    }
    const parsed = initShareSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid file metadata" });
    }
    const { contentType, size } = parsed.data;
    const baseType = contentType.split(";")[0]!.trim().toLowerCase();
    if (!ALLOWED_MIME.has(baseType)) {
      return res.status(415).json({ error: "Unsupported file type" });
    }
    if (size > MAX_VIDEO_BYTES) {
      return res.status(413).json({ error: "File too large (max 50 MB)" });
    }
    try {
      const uploadURL = await objSvc.getObjectEntityUploadURL();
      const objectPath = objSvc.normalizeObjectEntityPath(uploadURL);
      const exp = Date.now() + UPLOAD_TOKEN_TTL_MS;
      const uploadToken = signUploadToken({ objectPath, ip: clientIp(req), exp });
      res.json({ uploadURL, objectPath, uploadToken });
    } catch (err) {
      console.error("share init error", err);
      res.status(500).json({ error: "Could not prepare upload" });
    }
  });

  // Step 2: finalize after the upload completes — store the share record.
  app.post("/api/practice/shares", async (req: Request, res: Response) => {
    if (!limitFinalize(clientIp(req))) {
      return res.status(429).json({ error: "Too many shares — please try again later." });
    }
    sweepExpired();

    const body = {
      ...req.body,
      // id will be assigned server-side
      id: req.body?.id ?? "_pending",
    };
    const parsed = finalizeShareSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid share payload" });
    }
    const { objectPath, mimeType, sizeBytes, topic, side, format, transcript, feedback, uploadToken } = parsed.data;

    // Bind this finalize back to the original init: the token is an HMAC over
    // (objectPath | requester ip | exp), preventing path replay/misattribution.
    if (!verifyUploadToken(uploadToken, objectPath, clientIp(req))) {
      return res.status(403).json({ error: "Upload token invalid or expired" });
    }

    const baseType = mimeType.split(";")[0]!.trim().toLowerCase();
    if (!ALLOWED_MIME.has(baseType)) {
      return res.status(415).json({ error: "Unsupported file type" });
    }
    if (sizeBytes > MAX_VIDEO_BYTES) {
      return res.status(413).json({ error: "File too large (max 50 MB)" });
    }

    // Verify the upload landed in our storage.
    let realSize = sizeBytes;
    try {
      const file = await objSvc.getObjectEntityFile(objectPath);
      const [meta] = await file.getMetadata();
      const reported = Number(meta.size ?? 0);
      if (!reported || reported > MAX_VIDEO_BYTES) {
        return res.status(413).json({ error: "Uploaded file too large" });
      }
      realSize = reported;
    } catch (err) {
      if (err instanceof ObjectNotFoundError) {
        return res.status(400).json({ error: "Upload not found — try again" });
      }
      console.error("share verify error", err);
      return res.status(500).json({ error: "Could not verify upload" });
    }

    const id = makeSlug();
    // Signed-in users get clips that don't auto-expire; anonymous uploads
    // are kept for 30 days then cleaned up by the lazy sweep.
    const isSignedIn = !!req.session?.userId;
    const expiresAt = isSignedIn
      ? null
      : new Date(Date.now() + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000);
    try {
      const row = await storage.createPracticeShare({
        id,
        objectPath,
        mimeType: baseType,
        sizeBytes: realSize,
        topic,
        side,
        format,
        transcript,
        feedback: feedback ?? null,
        expiresAt,
      });
      res.status(201).json({
        id: row.id,
        url: `/share/${row.id}`,
        expiresAt: row.expiresAt,
      });
    } catch (err) {
      console.error("share create error", err);
      res.status(500).json({ error: "Could not save share" });
    }
  });

  // Public read of share metadata (transcript + feedback + video pointer).
  app.get("/api/practice/shares/:id", async (req: Request, res: Response) => {
    sweepExpired();
    const id = String(req.params.id ?? "");
    if (!/^[A-Za-z0-9_-]{6,16}$/.test(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const row = await storage.getPracticeShare(id);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      await deleteStoredObject(objSvc, row.objectPath);
      await storage.deletePracticeShare(row.id);
      return res.status(410).json({ error: "This share has expired" });
    }
    const comments = await storage.listPracticeShareComments(row.id);
    res.json({
      id: row.id,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      topic: row.topic,
      side: row.side,
      format: row.format,
      transcript: row.transcript,
      feedback: row.feedback,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      videoUrl: `/api/practice/shares/${row.id}/video`,
      comments,
    });
  });

  // List coach comments for a share.
  app.get("/api/practice/shares/:id/comments", async (req: Request, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!/^[A-Za-z0-9_-]{6,16}$/.test(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const row = await storage.getPracticeShare(id);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: "Expired" });
    }
    const comments = await storage.listPracticeShareComments(id);
    res.json({ comments });
  });

  // Add a coach comment tied to a video timestamp.
  app.post("/api/practice/shares/:id/comments", async (req: Request, res: Response) => {
    if (!limitComment(clientIp(req))) {
      return res.status(429).json({ error: "Too many comments — please slow down." });
    }
    const id = String(req.params.id ?? "");
    if (!/^[A-Za-z0-9_-]{6,16}$/.test(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const row = await storage.getPracticeShare(id);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: "This share has expired" });
    }
    const parsed = insertPracticeShareCommentSchema.safeParse({
      shareId: id,
      coachName: req.body?.coachName,
      comment: req.body?.comment,
      timestampSec: Math.floor(Number(req.body?.timestampSec ?? 0)),
    });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid comment" });
    }
    try {
      const created = await storage.createPracticeShareComment(parsed.data);
      res.status(201).json(created);
    } catch (err) {
      console.error("share comment create error", err);
      res.status(500).json({ error: "Could not save comment" });
    }
  });

  // Email a share link to a coach and record the referral for follow-up.
  app.post("/api/practice/shares/:id/email", async (req: Request, res: Response) => {
    const ip = clientIp(req);
    if (!limitReferral(ip)) {
      return res.status(429).json({ error: "Too many coach emails — please try again later." });
    }
    const id = String(req.params.id ?? "");
    if (!/^[A-Za-z0-9_-]{6,16}$/.test(id)) {
      return res.status(400).json({ error: "Invalid share id" });
    }
    const parsed = coachReferralRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Enter a valid coach email." });
    }
    const { coachEmail, studentName, studentEmail, note } = parsed.data;

    const share = await storage.getPracticeShare(id);
    if (!share) return res.status(404).json({ error: "Share not found" });
    if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: "This share has expired" });
    }

    const shareUrl = buildShareUrl(req, share.id);
    const replyTo = (studentEmail && studentEmail.trim()) || undefined;

    const { subject, text, html } = buildReferralEmail({
      share,
      shareUrl,
      studentName,
      studentEmail: replyTo,
      note,
    });

    const sendResult = await sendCoachEmail({
      to: coachEmail,
      replyTo,
      subject,
      text,
      html,
    });

    try {
      await storage.createCoachReferral({
        shareId: share.id,
        coachEmail: coachEmail.toLowerCase(),
        studentEmail: replyTo ?? null,
        studentName: studentName?.trim() || null,
        note: note?.trim() || null,
        shareUrl,
        topic: share.topic,
        side: share.side,
        format: share.format,
        emailStatus: sendResult.status,
        emailError: sendResult.error ?? null,
        ipAddress: ip,
      });
    } catch (err) {
      console.error("coach referral persist error", err);
      return res.status(500).json({ error: "Could not record referral" });
    }

    if (sendResult.status === "failed") {
      return res.status(502).json({
        error: "We saved your request but couldn't send the email. The team will follow up.",
        status: sendResult.status,
      });
    }

    res.status(201).json({
      ok: true,
      status: sendResult.status,
      message:
        sendResult.status === "sent"
          ? "Email sent to your coach."
          : "Saved — the team will deliver this to your coach shortly.",
    });
  });

  // Stream the recorded video/audio for a share. Supports HTTP Range so
  // players can seek into long clips without re-downloading the whole file.
  const serveShareVideo = async (req: Request, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!/^[A-Za-z0-9_-]{6,16}$/.test(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const row = await storage.getPracticeShare(id);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: "Expired" });
    }
    try {
      const file = await objSvc.getObjectEntityFile(row.objectPath);
      await objSvc.streamObject(file, req, res, 60 * 60);
    } catch (err) {
      if (err instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File missing" });
      }
      console.error("share video error", err);
      if (!res.headersSent) res.status(500).json({ error: "Could not stream video" });
    }
  };
  app.get("/api/practice/shares/:id/video", serveShareVideo);
  app.head("/api/practice/shares/:id/video", serveShareVideo);
}
