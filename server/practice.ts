import type { Express, Request, Response } from "express";
import { z } from "zod";
import type {
  ChatCompletionMessageParam,
  ChatCompletionAudioParam,
} from "openai/resources/chat/completions";
import { openai, ensureCompatibleFormat, speechToText } from "./replit_integrations/audio/client";

const FORMAT_GUIDES: Record<string, string> = {
  LD: "Lincoln-Douglas (1-on-1, value debate, framework + contentions, ~6 min constructive).",
  PF: "Public Forum (2-on-2, accessible argumentation, evidence-driven, 4-min cases).",
  Policy: "Policy Debate (CX, plan-focused, evidence comparison, fast delivery acceptable but clarity required).",
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

const turnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

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

/**
 * Shape of a chat completion message that includes an audio response.
 * The Replit AI Integrations gpt-audio model returns this on the message.
 */
interface AudioReplyMessage {
  content?: string | null;
  audio?: { transcript?: string; data?: string } | null;
}

export function registerPracticeRoutes(app: Express) {
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
}
