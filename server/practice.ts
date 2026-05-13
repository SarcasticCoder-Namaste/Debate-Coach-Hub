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
  turnSchema,
} from "@shared/schema";

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

function buildSystemPrompt(
  topic: string,
  side: "Aff" | "Neg",
  format: string,
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

const FEEDBACK_SCHEMA = z.object({
  clarity: z.object({ score: z.number().min(1).max(10), comment: z.string() }),
  structure: z.object({ score: z.number().min(1).max(10), comment: z.string() }),
  evidence: z.object({ score: z.number().min(1).max(10), comment: z.string() }),
  delivery: z.object({ score: z.number().min(1).max(10), comment: z.string() }),
  tip: z.string(),
});

const FEEDBACK_PROMPT = `You are a debate coach giving structured feedback on a student's practice round.
Return ONLY JSON matching this schema, no prose:
{
  "clarity": { "score": 1-10, "comment": "one short sentence" },
  "structure": { "score": 1-10, "comment": "one short sentence" },
  "evidence": { "score": 1-10, "comment": "one short sentence" },
  "delivery": { "score": 1-10, "comment": "one short sentence" },
  "tip": "one actionable improvement tip in <= 25 words"
}
Be honest and specific. Base scores on the student's turns only, not the bot's.`;

const transcribeSchema = z.object({ audio: z.string().min(1) });

const respondSchema = z.object({
  topic: z.string().min(1),
  side: z.enum(["Aff", "Neg"]),
  format: z.string().default("LD"),
  history: z.array(turnSchema).default([]),
  voice: z.enum(VOICES).default("onyx"),
  packet: packetContextSchema.nullish(),
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
  feedback: feedbackPayloadSchema.nullable().optional(),
  uploadToken: z.string().min(10),
});

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
      const text = await speechToText(buffer, format);
      res.json({ text });
    } catch (err) {
      console.error("transcribe error", err);
      res.status(500).json({ error: "Transcription failed" });
    }
  });

  // Generate a debate-coach counter-argument with synthesized voice.
  app.post("/api/practice/respond", async (req: Request, res: Response) => {
    const parsed = respondSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
    const { topic, side, format, history, voice, packet } = parsed.data;

    try {
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: buildSystemPrompt(topic, side, format, packet) },
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

  // Structured feedback card from the round transcript.
  app.post("/api/practice/feedback", async (req: Request, res: Response) => {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
    const { topic, side, transcript } = parsed.data;

    try {
      const convo = transcript
        .map((t) => `${t.role === "user" ? "Student" : "Opponent"}: ${t.content}`)
        .join("\n\n");

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: FEEDBACK_PROMPT },
          {
            role: "user",
            content: `Topic: ${topic}\nStudent side: ${side}\n\nRound transcript:\n${convo}`,
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

      const validated = FEEDBACK_SCHEMA.safeParse(parsedJson);
      if (!validated.success) {
        return res.status(502).json({ error: "Feedback did not match expected shape" });
      }
      res.json(validated.data);
    } catch (err) {
      console.error("feedback error", err);
      res.status(500).json({ error: "Feedback generation failed" });
    }
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
    const isSignedIn = !!req.session?.userEmail;
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
    });
  });

  // Stream the recorded video/audio for a share.
  app.get("/api/practice/shares/:id/video", async (req: Request, res: Response) => {
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
      await objSvc.downloadObject(file, res, 60 * 60);
    } catch (err) {
      if (err instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File missing" });
      }
      console.error("share video error", err);
      if (!res.headersSent) res.status(500).json({ error: "Could not stream video" });
    }
  });
}
