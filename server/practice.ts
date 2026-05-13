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

function buildSystemPrompt(topic: string, side: "Aff" | "Neg", format: string) {
  const opposing = side === "Aff" ? "Negative" : "Affirmative";
  return `You are an experienced competitive debate coach and a sharp ${opposing} opponent.

Resolution / Topic: "${topic}"
Student is debating: ${side === "Aff" ? "Affirmative" : "Negative"}
Format: ${FORMAT_GUIDES[format] ?? format}

Your job each turn:
1. Listen to the student's speech.
2. Respond as a tough but fair ${opposing} opponent. Give 2-3 concise counter-arguments with reasoning (and brief example evidence where appropriate).
3. Keep responses to 60-90 seconds when spoken aloud (about 130-200 words). Conversational, clear, and focused. No lists, no headings — speak as a debater would in-round.
4. End with a probing question or challenge that pushes them to defend their position.

Stay in character as the opponent. Do NOT add coaching tips inside this response — feedback is delivered separately.`;
}

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
});

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
    const { topic, side, format, history, voice } = parsed.data;

    try {
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: buildSystemPrompt(topic, side, format) },
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
