import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import {
  DRILLS,
  drillScoreRequestSchema,
  drillScoreSchema,
  getDailyDrill,
  getDailyPromptIndex,
  getDrillById,
} from "@shared/drills";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const DRILL_MODEL = process.env.DRILL_MODEL || "gpt-5-mini";

function buildDrillScoringPrompt(
  drillName: string,
  skill: string,
  scoringFocus: string,
): string {
  return `You are an expert competitive debate coach grading a 60-second skill drill.

Drill: ${drillName} (skill being trained: ${skill}).

You must judge ONLY this specific skill, not general delivery. Specifically focus on: ${scoringFocus}

Be honest and specific. Reference what the student actually said. No platitudes.

Return ONLY JSON in exactly this shape, no prose:
{
  "score": 0-100,
  "headline": "one short sentence summarizing how it went",
  "whatWorked": ["1-3 short bullets of specific things they did well"],
  "whatToFix": ["1-3 short bullets of specific issues to address"],
  "oneTip": "one concrete, actionable tip they can apply on the next rep"
}`;
}

export function registerDrillRoutes(app: Express) {
  app.get("/api/drills", (_req: Request, res: Response) => {
    res.json({
      drills: DRILLS.map((d) => ({
        id: d.id,
        name: d.name,
        tagline: d.tagline,
        skill: d.skill,
        durationSec: d.durationSec,
        instructions: d.instructions,
        promptCount: d.prompts.length,
      })),
    });
  });

  app.get("/api/drills/daily", (_req: Request, res: Response) => {
    const drill = getDailyDrill();
    const promptIndex = getDailyPromptIndex(drill);
    res.json({
      drillId: drill.id,
      name: drill.name,
      tagline: drill.tagline,
      skill: drill.skill,
      durationSec: drill.durationSec,
      prompt: drill.prompts[promptIndex],
      promptIndex,
    });
  });

  app.get("/api/drills/:id", (req: Request, res: Response) => {
    const drill = getDrillById(req.params.id);
    if (!drill) return res.status(404).json({ error: "Drill not found" });
    res.json({
      id: drill.id,
      name: drill.name,
      tagline: drill.tagline,
      skill: drill.skill,
      durationSec: drill.durationSec,
      instructions: drill.instructions,
      scoringFocus: drill.scoringFocus,
      prompts: drill.prompts,
    });
  });

  app.post("/api/drills/score", async (req: Request, res: Response) => {
    const parsed = drillScoreRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid drill submission" });
    }
    const { drillId, prompt, response: studentResponse, durationSec } = parsed.data;

    const drill = getDrillById(drillId);
    if (!drill) return res.status(404).json({ error: "Drill not found" });

    const wordCount = studentResponse.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 8) {
      return res.status(422).json({
        error: "Response too short to score. Speak (or type) at least a couple of sentences.",
      });
    }

    try {
      const completion = await openai.chat.completions.create({
        model: DRILL_MODEL,
        messages: [
          {
            role: "system",
            content: buildDrillScoringPrompt(drill.name, drill.skill, drill.scoringFocus),
          },
          {
            role: "user",
            content: `PROMPT GIVEN TO STUDENT:\n${prompt}\n\nSTUDENT RESPONSE (${wordCount} words${
              durationSec ? `, ${Math.round(durationSec)}s` : ""
            }):\n${studentResponse}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        return res.status(502).json({ error: "Model returned invalid JSON" });
      }
      const validated = drillScoreSchema.safeParse(json);
      if (!validated.success) {
        return res.status(502).json({ error: "Feedback did not match expected shape" });
      }

      const clamped = {
        ...validated.data,
        score: Math.max(0, Math.min(100, Math.round(validated.data.score))),
      };
      res.json(clamped);
    } catch (err) {
      console.error("drill score error", err);
      res.status(500).json({ error: "Drill scoring failed" });
    }
  });
}
