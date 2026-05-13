import type { Express, Request, Response } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import {
  insertPracticeSessionSchema,
  feedbackReportSchema,
} from "@shared/schema";
import { storage } from "./storage";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./replit_integrations/object_storage";

const ALLOWED_MIME = new Set([
  "video/webm",
  "video/mp4",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
]);

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function makeId(): string {
  return randomBytes(8)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
    .slice(0, 12);
}

function requireUser(req: Request, res: Response): string | null {
  const email = req.session?.userEmail;
  if (!email) {
    res
      .status(401)
      .json({ error: "Sign in to save and view your practice rounds." });
    return null;
  }
  return email;
}

const createSchema = insertPracticeSessionSchema
  .extend({
    feedback: feedbackReportSchema.nullable().optional(),
    title: z.string().max(200).nullable().optional(),
    durationSec: z.number().int().nonnegative().default(0),
    objectPath: z.string().nullable().optional(),
    mimeType: z.string().max(120).nullable().optional(),
    sizeBytes: z.number().int().nonnegative().nullable().optional(),
  })
  .omit({ hasMedia: true, overallScore: true, isFavorite: true });

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  isFavorite: z.boolean().optional(),
});

export function registerSessionRoutes(app: Express) {
  const objSvc = new ObjectStorageService();

  app.get("/api/practice/sessions", async (req: Request, res: Response) => {
    const email = requireUser(req, res);
    if (!email) return;
    const rows = await storage.listPracticeSessions(email);
    res.json({
      sessions: rows.map((r) => ({
        id: r.id,
        title: r.title,
        topic: r.topic,
        side: r.side,
        format: r.format,
        durationSec: r.durationSec,
        hasMedia: r.hasMedia,
        mimeType: r.mimeType,
        overallScore: r.overallScore,
        isFavorite: r.isFavorite,
        createdAt: r.createdAt,
      })),
    });
  });

  app.post("/api/practice/sessions", async (req: Request, res: Response) => {
    const email = requireUser(req, res);
    if (!email) return;

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid session payload" });
    }
    const data = parsed.data;
    const objectPath = data.objectPath ?? null;
    let mimeType: string | null = null;
    let sizeBytes: number | null = null;
    let hasMedia = false;

    if (objectPath) {
      const baseType = (data.mimeType || "")
        .split(";")[0]!
        .trim()
        .toLowerCase();
      if (!ALLOWED_MIME.has(baseType)) {
        return res.status(415).json({ error: "Unsupported media type" });
      }
      try {
        const file = await objSvc.getObjectEntityFile(objectPath);
        const [meta] = await file.getMetadata();
        const reported = Number(meta.size ?? 0);
        if (!reported || reported > MAX_VIDEO_BYTES) {
          return res.status(413).json({ error: "Recording too large" });
        }
        sizeBytes = reported;
      } catch (err) {
        if (err instanceof ObjectNotFoundError) {
          return res
            .status(400)
            .json({ error: "Recording upload not found — try again" });
        }
        console.error("session media verify error", err);
        return res.status(500).json({ error: "Could not verify upload" });
      }
      mimeType = baseType;
      hasMedia = true;
    }

    const id = makeId();
    try {
      const row = await storage.createPracticeSession({
        id,
        userEmail: email,
        title: data.title?.trim() || null,
        topic: data.topic,
        side: data.side,
        format: data.format,
        durationSec: data.durationSec ?? 0,
        objectPath,
        mimeType,
        sizeBytes,
        hasMedia,
        transcript: data.transcript,
        feedback: data.feedback ?? null,
        overallScore: data.feedback?.overallScore ?? null,
        isFavorite: false,
      });
      res.status(201).json({ id: row.id });
    } catch (err) {
      console.error("session create error", err);
      res.status(500).json({ error: "Could not save session" });
    }
  });

  app.get("/api/practice/sessions/:id", async (req: Request, res: Response) => {
    const email = requireUser(req, res);
    if (!email) return;
    const id = String(req.params.id ?? "");
    const row = await storage.getPracticeSession(id);
    if (!row || row.userEmail !== email) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({
      id: row.id,
      title: row.title,
      topic: row.topic,
      side: row.side,
      format: row.format,
      durationSec: row.durationSec,
      mimeType: row.mimeType,
      hasMedia: row.hasMedia,
      transcript: row.transcript,
      feedback: row.feedback,
      overallScore: row.overallScore,
      isFavorite: row.isFavorite,
      createdAt: row.createdAt,
      videoUrl: row.hasMedia ? `/api/practice/sessions/${row.id}/video` : null,
    });
  });

  app.patch(
    "/api/practice/sessions/:id",
    async (req: Request, res: Response) => {
      const email = requireUser(req, res);
      if (!email) return;
      const id = String(req.params.id ?? "");
      const parsed = patchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid update" });
      }
      const updated = await storage.updatePracticeSession(id, email, {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.isFavorite !== undefined
          ? { isFavorite: parsed.data.isFavorite }
          : {}),
      });
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json({ ok: true });
    },
  );

  app.delete(
    "/api/practice/sessions/:id",
    async (req: Request, res: Response) => {
      const email = requireUser(req, res);
      if (!email) return;
      const id = String(req.params.id ?? "");
      const removed = await storage.deletePracticeSession(id, email);
      if (!removed) return res.status(404).json({ error: "Not found" });
      if (removed.objectPath) {
        try {
          const file = await objSvc.getObjectEntityFile(removed.objectPath);
          await file.delete({ ignoreNotFound: true });
        } catch (err) {
          if (!(err instanceof ObjectNotFoundError)) {
            console.error("session media delete error", err);
          }
        }
      }
      res.json({ ok: true });
    },
  );

  app.get(
    "/api/practice/sessions/:id/video",
    async (req: Request, res: Response) => {
      const email = requireUser(req, res);
      if (!email) return;
      const id = String(req.params.id ?? "");
      const row = await storage.getPracticeSession(id);
      if (!row || row.userEmail !== email || !row.objectPath) {
        return res.status(404).json({ error: "Not found" });
      }
      try {
        const file = await objSvc.getObjectEntityFile(row.objectPath);
        await objSvc.downloadObject(file, res, 60 * 60);
      } catch (err) {
        if (err instanceof ObjectNotFoundError) {
          return res.status(404).json({ error: "File missing" });
        }
        console.error("session video error", err);
        if (!res.headersSent)
          res.status(500).json({ error: "Could not stream video" });
      }
    },
  );
}
