import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import OpenAI from "openai";
import { z } from "zod";
import { storage } from "./storage";
import {
  insertInquirySchema,
  savePracticeRoundSchema,
  insertLeadSchema,
  updateLeadSchema,
} from "@shared/schema";
import { TOPICS, getTopicById } from "@shared/topics";
import { registerPracticeRoutes } from "./practice";
import { registerAuthRoutes, requireAuth, setupSession } from "./auth";
import { registerBillingRoutes } from "./billing";
import { registerResearchRoutes } from "./research";
import { sendAdminLeadAlert, sendBookingConfirmation } from "./notify";
import { seedCoaches } from "./seed";
import { registerSessionRoutes } from "./sessions";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "demo-admin";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const provided =
    req.header("x-admin-token") ||
    (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  if (provided && provided === ADMIN_TOKEN) return next();
  res.status(401).json({ message: "Unauthorized" });
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const assistantChatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
});

const ASSISTANT_MODEL = process.env.ASSISTANT_MODEL || "gpt-5.4";
const ASSISTANT_FALLBACK_MODEL = "gpt-5-mini";

// Simple in-memory rate limit: max N requests per IP per window.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count++;
  return true;
}

const ASSISTANT_SYSTEM_PROMPT = `You are the in-app AI assistant for DebateMastery, an online platform that helps students get better at competitive debate and public speaking.

You play three roles in every conversation:
1. SITE GUIDE — help users navigate the app, explain features, and point them to the right page or section.
2. DEBATE COACH — give concrete, practical coaching on argument construction, rebuttals, cross-examination, case structure, signposting, delivery, common fallacies, and topic framing across formats (Lincoln-Douglas, Public Forum, Policy, Parliamentary, World Schools, etc.).
3. GENERAL HELPER — answer broader questions about debate strategy, study habits, tournaments, and speaking confidence.

# App inventory
The site is currently a single-page experience anchored by section IDs you can link to with anchor URLs (e.g. "/#services"). The known sections are:
- "/#home" — Hero / landing
- "/#about" — About the head coach
- "/#services" — Coaching packages
- "/#formats" — Debate formats covered
- "/#tournaments" — Tournament prep info
- "/#how-it-works" — How coaching engagements work
- "/#testimonials" — Student testimonials
- "/#faq" — Frequently asked questions
- "/#contact" — Contact form / book a free consultation

The team is also planning these dedicated pages (mention them as "coming soon" if asked, and link to the placeholder route):
- "/practice" — AI voice & video debate practice bot
- "/drill" — Drill mode (rapid skill drills)
- "/history" — Session history & progress dashboard
- "/topics" — Topic & format library
- "/judge" — Live judge mode
- "/coaches" — Coach booking
- "/team" — Team & classroom mode
- "/clips" — Shareable highlight clips
- "/research" — Topic research assistant

# Style
- Be concise, warm, and high-signal. Default to short answers; expand only when the question warrants it.
- Use light Markdown: short bullet lists, **bold** for key terms, and inline links like [drill mode](/drill) when recommending a destination.
- For "take me to X" requests, reply with one short sentence and a Markdown link to the right path.
- For coaching questions, give specific, actionable advice with examples — never generic platitudes.
- If you don't know something about the user's specific account or data, say so briefly and suggest the closest in-app action.
- Keep responses under ~200 words unless the user asks for depth.`;

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  setupSession(app);

  app.post("/api/inquiries", async (req, res) => {
    try {
      const data = insertInquirySchema.parse(req.body);
      const inquiry = await storage.createInquiry(data);
      res.status(201).json(inquiry);
    } catch (error) {
      res.status(400).json({ message: "Invalid inquiry data" });
    }
  });

  app.get("/api/topics", (_req, res) => {
    res.json(TOPICS);
  });

  app.get("/api/topics/:id", (req, res) => {
    const topic = getTopicById(req.params.id);
    if (!topic) return res.status(404).json({ message: "Topic not found" });
    res.json(topic);
  });

  registerAuthRoutes(app);
  app.get("/api/coaches", async (_req, res) => {
    try {
      const coaches = await storage.listCoaches();
      res.json(coaches);
    } catch (err) {
      console.error("listCoaches error", err);
      res.status(500).json({ message: "Failed to load coaches" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    const parsed = insertLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid booking",
        errors: parsed.error.flatten(),
      });
    }
    const coach = await storage.getCoach(parsed.data.coachId);
    if (!coach) return res.status(404).json({ message: "Coach not found" });
    if (!coach.availability.includes(parsed.data.slot)) {
      return res.status(400).json({ message: "Slot is no longer available" });
    }
    try {
      const lead = await storage.createLead(parsed.data);
      await Promise.all([
        sendBookingConfirmation(lead, coach),
        sendAdminLeadAlert(lead, coach),
      ]);
      res.status(201).json(lead);
    } catch (err) {
      console.error("createLead error", err);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/admin/leads", requireAdmin, async (_req, res) => {
    const all = await storage.listLeads();
    const coaches = await storage.listCoaches();
    const byId = new Map(coaches.map((c) => [c.id, c]));
    res.json(
      all.map((l) => ({
        ...l,
        coachName: byId.get(l.coachId)?.name ?? "Unknown",
      })),
    );
  });

  app.patch("/api/admin/leads/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Bad id" });
    const parsed = updateLeadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid update" });
    const updated = await storage.updateLead(id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  function requireUserId(req: Request, res: Response): string | null {
    const raw = req.header("x-user-id");
    const userId = typeof raw === "string" ? raw.trim() : "";
    if (!userId || userId.length > 128) {
      res.status(400).json({ message: "Missing or invalid x-user-id header" });
      return null;
    }
    return userId;
  }

  app.get("/api/saved-topics", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;
    try {
      const rows = await storage.listSavedTopics(userId);
      res.json(rows);
    } catch (err) {
      console.error("listSavedTopics failed", err);
      res.status(500).json({ message: "Failed to load saved topics" });
    }
  });

  const savedTopicBodySchema = z.object({
    topicId: z.string().min(1).max(128),
  });

  app.post("/api/saved-topics", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const parsed = savedTopicBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid topicId" });
    }
    if (!getTopicById(parsed.data.topicId)) {
      return res.status(404).json({ message: "Unknown topic" });
    }
    try {
      const row = await storage.addSavedTopic({
        userId,
        topicId: parsed.data.topicId,
      });
      res.status(201).json(row);
    } catch (err) {
      console.error("addSavedTopic failed", err);
      res.status(500).json({ message: "Failed to save topic" });
    }
  });

  app.delete("/api/saved-topics/:topicId", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const topicId = req.params.topicId;
    if (!topicId || topicId.length > 128) {
      return res.status(400).json({ message: "Invalid topicId" });
    }
    try {
      await storage.removeSavedTopic(userId, topicId);
      res.status(204).end();
    } catch (err) {
      console.error("removeSavedTopic failed", err);
      res.status(500).json({ message: "Failed to remove saved topic" });
    }
  });

  registerPracticeRoutes(app);
  registerSessionRoutes(app);
  registerBillingRoutes(app);
  registerResearchRoutes(app);

  app.post("/api/assistant/chat", async (req, res) => {
    const ip = (req.ip || req.socket.remoteAddress || "unknown").toString();
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ message: "Too many requests, please slow down." });
    }

    const parseResult = assistantChatSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid chat payload" });
    }
    const parsed = parseResult.data;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const chatMessages = [
      { role: "system" as const, content: ASSISTANT_SYSTEM_PROMPT },
      ...parsed.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    async function openStream(model: string) {
      return openai.chat.completions.create({
        model,
        stream: true,
        max_completion_tokens: 1200,
        messages: chatMessages,
      });
    }

    try {
      let stream;
      try {
        stream = await openStream(ASSISTANT_MODEL);
      } catch (modelErr) {
        console.warn(
          `Assistant model "${ASSISTANT_MODEL}" failed, falling back to "${ASSISTANT_FALLBACK_MODEL}"`,
          modelErr,
        );
        stream = await openStream(ASSISTANT_FALLBACK_MODEL);
      }

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Assistant chat error:", error);
      if (!res.headersSent) {
        return res.status(500).json({ message: "AI assistant failed" });
      }
      res.write(`data: ${JSON.stringify({ error: "AI assistant failed" })}\n\n`);
      res.end();
    }
  });

  app.post("/api/practice/rounds", requireAuth, async (req: Request, res: Response) => {
    const parsed = savePracticeRoundSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid round data" });
    try {
      const round = await storage.createPracticeRound(req.session.userId!, {
        topic: parsed.data.topic,
        side: parsed.data.side,
        format: parsed.data.format,
        transcript: parsed.data.transcript,
        feedback: parsed.data.feedback ?? null,
      });
      res.status(201).json(round);
    } catch (err) {
      console.error("save round error", err);
      res.status(500).json({ error: "Failed to save round" });
    }
  });

  app.get("/api/practice/rounds", requireAuth, async (req, res) => {
    try {
      const rounds = await storage.listPracticeRounds(req.session.userId!);
      res.json(rounds);
    } catch (err) {
      console.error("list rounds error", err);
      res.status(500).json({ error: "Failed to load rounds" });
    }
  });

  app.get("/api/practice/rounds/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const round = await storage.getPracticeRound(req.session.userId!, id);
    if (!round) return res.status(404).json({ error: "Not found" });
    res.json(round);
  });

  app.delete("/api/practice/rounds/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const ok = await storage.deletePracticeRound(req.session.userId!, id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  // Seed sample coaches in the background; don't block startup if it fails.
  seedCoaches().catch((err) => console.error("[seed] failed:", err));

  return httpServer;
}
