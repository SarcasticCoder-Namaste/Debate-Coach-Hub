import type { Express, Request, Response } from "express";
import { spawn } from "child_process";
import { randomBytes } from "crypto";
import { promises as fsp, createReadStream, createWriteStream } from "fs";
import { tmpdir } from "os";
import path from "path";
import { pipeline } from "stream/promises";
import OpenAI from "openai";
import {
  CLIP_MAX_SEC,
  CLIP_MIN_SEC,
  clipSuggestionSchema,
  createClipSchema,
  type ClipSuggestion,
  type PracticeClip,
  type PracticeSession,
} from "@shared/schema";
import { storage } from "./storage";
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from "./replit_integrations/object_storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf";
const SUGGEST_MODEL = process.env.CLIP_SUGGEST_MODEL || "gpt-5-mini";

function makeSlug(): string {
  return randomBytes(8)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
    .slice(0, 12);
}

function requireEmail(req: Request, res: Response): string | null {
  const email = req.session?.userEmail;
  if (!email) {
    res
      .status(401)
      .json({ error: "Sign in to create or manage highlight clips." });
    return null;
  }
  return email;
}

function escapeDrawText(s: string): string {
  // Escape special chars used by ffmpeg drawtext.
  return s
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%");
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function pickFallbackWindow(durationSec: number): { startSec: number; endSec: number } {
  const total = Math.max(0, Math.floor(durationSec));
  const target = clamp(30, CLIP_MIN_SEC, Math.min(CLIP_MAX_SEC, total || CLIP_MIN_SEC));
  const start = Math.max(0, Math.floor((total - target) / 2));
  const end = Math.min(total, start + target) || start + CLIP_MIN_SEC;
  return { startSec: start, endSec: end };
}

function turnTimings(session: PracticeSession): Array<{ startSec: number; endSec: number }> {
  const totalSec = session.durationSec || 0;
  const turns = session.transcript || [];
  if (turns.length === 0) return [];
  // Use per-turn durationSec if present, else split total evenly.
  const haveDurations = turns.every(
    (t) => typeof t.durationSec === "number" && (t.durationSec ?? 0) > 0,
  );
  if (haveDurations) {
    const out: Array<{ startSec: number; endSec: number }> = [];
    let acc = 0;
    for (const t of turns) {
      const d = Math.max(1, Math.round(t.durationSec ?? 1));
      out.push({ startSec: acc, endSec: acc + d });
      acc += d;
    }
    return out;
  }
  const each = Math.max(1, Math.floor(totalSec / Math.max(1, turns.length)));
  return turns.map((_, i) => ({ startSec: i * each, endSec: (i + 1) * each }));
}

async function suggestHighlight(session: PracticeSession): Promise<ClipSuggestion> {
  const totalSec = session.durationSec || 0;
  if (totalSec < CLIP_MIN_SEC) {
    return {
      startSec: 0,
      endSec: Math.max(CLIP_MIN_SEC, totalSec),
      reason: "Recording is too short for a highlight — using the whole thing.",
    };
  }

  const timings = turnTimings(session);
  const userTurnsForPrompt = session.transcript
    .map((t, i) => ({
      idx: i,
      role: t.role,
      preview: t.content.slice(0, 280),
      ...timings[i],
    }))
    .filter((t) => t.role === "user")
    .slice(0, 12);

  const fallback = pickFallbackWindow(totalSec);
  if (userTurnsForPrompt.length === 0) {
    return { ...fallback, reason: "Picked the middle of the round." };
  }

  const subscores = session.feedback?.subscores;
  const rebuttalScore = subscores?.rebuttal?.score ?? 0;
  const structureScore = subscores?.structure?.score ?? 0;
  const strengths = (session.feedback?.strengths ?? []).slice(0, 3).join("; ");

  const prompt = `You are a debate coach helping select the BEST 15-60 second moment from a student's practice round to share as a highlight clip on social media.

Topic: ${session.topic}
Side: ${session.side}
Format: ${session.format}
Total recording length (sec): ${totalSec}
Strongest noted skills: ${strengths || "n/a"}
Rebuttal subscore: ${rebuttalScore}/100  Structure subscore: ${structureScore}/100

Student turns (with their approximate start..end seconds inside the recording):
${userTurnsForPrompt
  .map(
    (t) =>
      `#${t.idx} [${t.startSec}-${t.endSec}s] ${t.preview.replace(/\s+/g, " ").trim()}`,
  )
  .join("\n")}

Pick ONE window of 15-60 seconds that captures the strongest moment — usually their best rebuttal, sharpest argument, or most rhetorically effective passage. Return strict JSON ONLY:
{ "startSec": <int>, "endSec": <int>, "reason": "<one short sentence>" }
Constraints: 0 <= startSec, endSec <= ${totalSec}, ${CLIP_MIN_SEC} <= endSec-startSec <= ${CLIP_MAX_SEC}.`;

  try {
    const completion = await openai.chat.completions.create({
      model: SUGGEST_MODEL,
      response_format: { type: "json_object" },
      max_completion_tokens: 200,
      messages: [
        { role: "system", content: "You output strict JSON only." },
        { role: "user", content: prompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const candidate = clipSuggestionSchema.safeParse({
      startSec: Math.floor(Number(parsed.startSec ?? fallback.startSec)),
      endSec: Math.floor(Number(parsed.endSec ?? fallback.endSec)),
      reason: String(parsed.reason ?? "Strongest student moment."),
    });
    if (!candidate.success) return { ...fallback, reason: "Picked the middle of the round." };
    let { startSec, endSec, reason } = candidate.data;
    startSec = clamp(startSec, 0, Math.max(0, totalSec - CLIP_MIN_SEC));
    endSec = clamp(endSec, startSec + CLIP_MIN_SEC, Math.min(totalSec, startSec + CLIP_MAX_SEC));
    return { startSec, endSec, reason };
  } catch (err) {
    console.warn("clip suggest fallback:", err);
    return { ...fallback, reason: "Picked the middle of the round." };
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-1000)}`));
    });
  });
}

interface RenderOpts {
  inputPath: string;
  outputPath: string;
  posterPath: string;
  startSec: number;
  durationSec: number;
  isAudio: boolean;
  overlayName?: string | null;
  overlayTopic?: string | null;
  overlayScore?: number | null;
  overlayWatermark: boolean;
}

function buildDrawTextFilters(opts: RenderOpts): string {
  const filters: string[] = [];
  // Top-left student name
  if (opts.overlayName) {
    filters.push(
      `drawtext=fontfile=${FONT_BOLD}:text='${escapeDrawText(opts.overlayName)}':fontcolor=white:fontsize=36:x=40:y=40:box=1:boxborderw=14:boxcolor=black@0.55`,
    );
  }
  // Top-right score badge
  if (typeof opts.overlayScore === "number") {
    filters.push(
      `drawtext=fontfile=${FONT_BOLD}:text='${escapeDrawText(String(opts.overlayScore) + "/100")}':fontcolor=white:fontsize=34:x=w-tw-40:y=40:box=1:boxborderw=14:boxcolor=0x14b8a6@0.85`,
    );
  }
  // Bottom-center topic line
  if (opts.overlayTopic) {
    const topic = opts.overlayTopic.length > 90 ? opts.overlayTopic.slice(0, 87) + "…" : opts.overlayTopic;
    filters.push(
      `drawtext=fontfile=${FONT_REGULAR}:text='${escapeDrawText(topic)}':fontcolor=white:fontsize=28:x=(w-tw)/2:y=h-th-100:box=1:boxborderw=12:boxcolor=black@0.55`,
    );
  }
  // Bottom-right watermark
  if (opts.overlayWatermark) {
    filters.push(
      `drawtext=fontfile=${FONT_BOLD}:text='DebateMastery':fontcolor=white:fontsize=22:x=w-tw-30:y=h-th-30:alpha=0.85:shadowx=2:shadowy=2:shadowcolor=black@0.6`,
    );
  }
  return filters.join(",");
}

async function renderClipFromAudio(opts: RenderOpts): Promise<void> {
  // Audio-only: build a 1280x720 colored canvas with overlays; mux audio in.
  const overlay = buildDrawTextFilters(opts) || "null";
  const args = [
    "-y",
    "-f", "lavfi",
    "-i", `color=c=0x0f172a:s=1280x720:d=${opts.durationSec}:r=30`,
    "-ss", String(opts.startSec),
    "-t", String(opts.durationSec),
    "-i", opts.inputPath,
    "-filter_complex",
    `[0:v]${overlay}[v]`,
    "-map", "[v]",
    "-map", "1:a:0",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "veryfast",
    "-movflags", "+faststart",
    "-c:a", "aac",
    "-b:a", "128k",
    "-shortest",
    opts.outputPath,
  ];
  await runFfmpeg(args);
  // Poster from the same visual canvas (no audio): just take a frame.
  await runFfmpeg([
    "-y",
    "-f", "lavfi",
    "-i", `color=c=0x0f172a:s=1200x630:d=1:r=1`,
    "-vf", overlay,
    "-frames:v", "1",
    opts.posterPath,
  ]);
}

async function renderClipFromVideo(opts: RenderOpts): Promise<void> {
  const overlay = buildDrawTextFilters(opts);
  const filterChain = ["scale=1280:-2,setsar=1", overlay].filter(Boolean).join(",");
  const args = [
    "-y",
    "-ss", String(opts.startSec),
    "-i", opts.inputPath,
    "-t", String(opts.durationSec),
    "-vf", filterChain || "scale=1280:-2,setsar=1",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "veryfast",
    "-movflags", "+faststart",
    "-c:a", "aac",
    "-b:a", "128k",
    opts.outputPath,
  ];
  await runFfmpeg(args);
  // Poster from the middle of the clip.
  const posterTime = Math.max(0, Math.floor(opts.durationSec / 2));
  await runFfmpeg([
    "-y",
    "-ss", String(opts.startSec + posterTime),
    "-i", opts.inputPath,
    "-vf",
    `scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630${overlay ? "," + overlay : ""}`,
    "-frames:v", "1",
    opts.posterPath,
  ]);
}

async function downloadObjectToFile(
  objSvc: ObjectStorageService,
  objectPath: string,
  destPath: string,
): Promise<void> {
  const file = await objSvc.getObjectEntityFile(objectPath);
  await pipeline(file.createReadStream(), createWriteStream(destPath));
}

async function uploadFileToObject(
  objSvc: ObjectStorageService,
  srcPath: string,
  contentType: string,
): Promise<{ objectPath: string; sizeBytes: number }> {
  const uploadURL = await objSvc.getObjectEntityUploadURL();
  const objectPath = objSvc.normalizeObjectEntityPath(uploadURL);
  const stat = await fsp.stat(srcPath);
  const stream = createReadStream(srcPath);
  const res = await fetch(uploadURL, {
    method: "PUT",
    body: stream as unknown as BodyInit,
    // @ts-expect-error -- node fetch accepts duplex
    duplex: "half",
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
    },
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
  return { objectPath, sizeBytes: stat.size };
}

export function registerClipRoutes(app: Express) {
  const objSvc = new ObjectStorageService();

  app.post(
    "/api/practice/sessions/:id/clip-suggest",
    async (req: Request, res: Response) => {
      const email = requireEmail(req, res);
      if (!email) return;
      const id = String(req.params.id ?? "");
      const session = await storage.getPracticeSession(id);
      if (!session || session.userEmail !== email) {
        return res.status(404).json({ error: "Session not found" });
      }
      const suggestion = await suggestHighlight(session);
      res.json(suggestion);
    },
  );

  app.post(
    "/api/practice/sessions/:id/clips",
    async (req: Request, res: Response) => {
      const email = requireEmail(req, res);
      if (!email) return;
      const id = String(req.params.id ?? "");
      const session = await storage.getPracticeSession(id);
      if (!session || session.userEmail !== email) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (!session.hasMedia || !session.objectPath) {
        return res
          .status(400)
          .json({ error: "This session has no recording to clip from." });
      }
      const parsed = createClipSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors[0]?.message ?? "Invalid clip request";
        return res.status(400).json({ error: msg });
      }
      const startSec = Math.max(0, Math.floor(parsed.data.startSec));
      const endSec = Math.max(startSec + CLIP_MIN_SEC, Math.floor(parsed.data.endSec));
      const total = session.durationSec || 0;
      if (total > 0 && startSec >= total) {
        return res.status(400).json({ error: "Clip start is past the recording end." });
      }
      const clipDur = Math.min(CLIP_MAX_SEC, endSec - startSec);

      const tmpDir = await fsp.mkdtemp(path.join(tmpdir(), "clip-"));
      const isAudio = (session.mimeType || "").startsWith("audio/");
      const inExt = isAudio ? "audio" : "video";
      const inputPath = path.join(tmpDir, `src-${inExt}`);
      const outputPath = path.join(tmpDir, "out.mp4");
      const posterPath = path.join(tmpDir, "poster.jpg");

      try {
        await downloadObjectToFile(objSvc, session.objectPath, inputPath);
        const renderOpts: RenderOpts = {
          inputPath,
          outputPath,
          posterPath,
          startSec,
          durationSec: clipDur,
          isAudio,
          overlayName: parsed.data.overlayName?.trim() ? parsed.data.overlayName.trim() : null,
          overlayTopic: parsed.data.overlayTopic ? session.topic : null,
          overlayScore:
            typeof parsed.data.overlayScore === "number"
              ? parsed.data.overlayScore
              : null,
          overlayWatermark: parsed.data.overlayWatermark,
        };
        if (isAudio) {
          await renderClipFromAudio(renderOpts);
        } else {
          await renderClipFromVideo(renderOpts);
        }
        const { objectPath: clipObjectPath, sizeBytes } =
          await uploadFileToObject(objSvc, outputPath, "video/mp4");
        let posterObjectPath: string | null = null;
        try {
          const { objectPath: pPath } = await uploadFileToObject(
            objSvc,
            posterPath,
            "image/jpeg",
          );
          posterObjectPath = pPath;
        } catch (err) {
          console.warn("clip poster upload failed:", err);
        }

        const slug = makeSlug();
        const clip: PracticeClip = {
          id: slug,
          sessionId: session.id,
          userEmail: email,
          topic: session.topic,
          side: session.side,
          format: session.format,
          startSec,
          endSec: startSec + clipDur,
          durationSec: clipDur,
          overlayName: renderOpts.overlayName ?? null,
          overlayTopic: parsed.data.overlayTopic,
          overlayScore: renderOpts.overlayScore ?? null,
          overlayWatermark: parsed.data.overlayWatermark,
          objectPath: clipObjectPath,
          posterPath: posterObjectPath,
          mimeType: "video/mp4",
          sizeBytes,
          viewCount: 0,
          createdAt: new Date(),
        };
        await storage.createPracticeClip(clip);
        res.status(201).json({
          id: clip.id,
          url: `/clips/${clip.id}`,
          downloadUrl: `/api/clips/${clip.id}/video?download=1`,
          posterUrl: posterObjectPath ? `/api/clips/${clip.id}/poster` : null,
          startSec,
          endSec: clip.endSec,
          durationSec: clipDur,
          sizeBytes,
        });
      } catch (err) {
        console.error("clip render error", err);
        res
          .status(500)
          .json({ error: "Could not render clip. Please try again." });
      } finally {
        // cleanup temp dir
        fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    },
  );

  app.get(
    "/api/practice/sessions/:id/clips",
    async (req: Request, res: Response) => {
      const email = requireEmail(req, res);
      if (!email) return;
      const id = String(req.params.id ?? "");
      const session = await storage.getPracticeSession(id);
      if (!session || session.userEmail !== email) {
        return res.status(404).json({ error: "Session not found" });
      }
      const rows = await storage.listPracticeClipsBySession(id, email);
      res.json({
        clips: rows.map((c) => ({
          id: c.id,
          url: `/clips/${c.id}`,
          posterUrl: c.posterPath ? `/api/clips/${c.id}/poster` : null,
          startSec: c.startSec,
          endSec: c.endSec,
          durationSec: c.durationSec,
          viewCount: c.viewCount,
          createdAt: c.createdAt,
        })),
      });
    },
  );

  app.delete("/api/clips/:id", async (req: Request, res: Response) => {
    const email = requireEmail(req, res);
    if (!email) return;
    const id = String(req.params.id ?? "");
    const removed = await storage.deletePracticeClip(id, email);
    if (!removed) return res.status(404).json({ error: "Not found" });
    for (const obj of [removed.objectPath, removed.posterPath]) {
      if (!obj) continue;
      try {
        const file = await objSvc.getObjectEntityFile(obj);
        await file.delete({ ignoreNotFound: true });
      } catch (err) {
        if (!(err instanceof ObjectNotFoundError)) {
          console.error("clip delete object error", err);
        }
      }
    }
    res.json({ ok: true });
  });

  // Public metadata
  app.get("/api/clips/:id", async (req: Request, res: Response) => {
    const id = String(req.params.id ?? "");
    const clip = await storage.getPracticeClip(id);
    if (!clip) return res.status(404).json({ error: "Not found" });
    res.json({
      id: clip.id,
      topic: clip.topic,
      side: clip.side,
      format: clip.format,
      durationSec: clip.durationSec,
      overlayName: clip.overlayName,
      overlayScore: clip.overlayScore,
      viewCount: clip.viewCount,
      createdAt: clip.createdAt,
      videoUrl: `/api/clips/${clip.id}/video`,
      posterUrl: clip.posterPath ? `/api/clips/${clip.id}/poster` : null,
      shareUrl: `/clips/${clip.id}`,
    });
  });

  // Stream video with range support.
  const serveClipVideo = async (req: Request, res: Response) => {
    const id = String(req.params.id ?? "");
    const clip = await storage.getPracticeClip(id);
    if (!clip) return res.status(404).json({ error: "Not found" });
    if (req.query.download === "1") {
      const safeName = (clip.topic || "clip")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 60)
        .replace(/^-+|-+$/g, "") || "clip";
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeName}-${clip.id}.mp4"`,
      );
    }
    if (req.method === "GET") {
      // count once per GET, not per range request — best-effort.
      if (!req.headers.range) {
        storage.incrementClipViewCount(clip.id).catch(() => {});
      }
    }
    try {
      const file = await objSvc.getObjectEntityFile(clip.objectPath);
      await objSvc.streamObject(file, req, res, 60 * 60);
    } catch (err) {
      if (err instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File missing" });
      }
      console.error("clip video stream error", err);
      if (!res.headersSent) res.status(500).json({ error: "Stream failed" });
    }
  };
  app.get("/api/clips/:id/video", serveClipVideo);
  app.head("/api/clips/:id/video", serveClipVideo);

  // Open Graph poster image
  app.get("/api/clips/:id/poster", async (req: Request, res: Response) => {
    const id = String(req.params.id ?? "");
    const clip = await storage.getPracticeClip(id);
    if (!clip || !clip.posterPath) return res.status(404).json({ error: "Not found" });
    try {
      const file = await objSvc.getObjectEntityFile(clip.posterPath);
      await objSvc.downloadObject(file, res, 60 * 60 * 24);
    } catch (err) {
      if (err instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File missing" });
      }
      console.error("clip poster error", err);
      if (!res.headersSent) res.status(500).json({ error: "Poster failed" });
    }
  });
}

/* ----------------------------------------------------------------------- */
/*  Server-side OG/social meta injection for /clips/:slug HTML responses    */
/* ----------------------------------------------------------------------- */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function buildClipMetaTags(
  slug: string,
  origin: string,
): Promise<string | null> {
  const clip = await storage.getPracticeClip(slug);
  if (!clip) return null;
  const title = `${clip.topic} — DebateMastery highlight`;
  const desc = `${clip.overlayName ? clip.overlayName + " · " : ""}${clip.side === "Aff" ? "Affirmative" : "Negative"} · ${clip.format} · ${clip.durationSec}s clip`;
  const url = `${origin}/clips/${slug}`;
  const video = `${origin}/api/clips/${slug}/video`;
  const image = clip.posterPath ? `${origin}/api/clips/${slug}/poster` : "";
  const lines = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(desc)}" />`,
    `<meta property="og:type" content="video.other" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(desc)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : "",
    `<meta property="og:video" content="${escapeHtml(video)}" />`,
    `<meta property="og:video:type" content="video/mp4" />`,
    `<meta name="twitter:card" content="${image ? "player" : "summary_large_image"}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(desc)}" />`,
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : "",
    image ? `<meta name="twitter:player" content="${escapeHtml(url)}" />` : "",
  ].filter(Boolean);
  return lines.join("\n    ");
}
