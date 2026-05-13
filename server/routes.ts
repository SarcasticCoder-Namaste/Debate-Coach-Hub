import type { Express } from "express";
import type { Server } from "http";
import OpenAI from "openai";
import { z } from "zod";
import { storage } from "./storage";
import { insertInquirySchema } from "@shared/schema";
import { registerPracticeRoutes } from "./practice";

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
  app.post("/api/inquiries", async (req, res) => {
    try {
      const data = insertInquirySchema.parse(req.body);
      const inquiry = await storage.createInquiry(data);
      res.status(201).json(inquiry);
    } catch (error) {
      res.status(400).json({ message: "Invalid inquiry data" });
    }
  });

  registerPracticeRoutes(app);

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

  return httpServer;
}
