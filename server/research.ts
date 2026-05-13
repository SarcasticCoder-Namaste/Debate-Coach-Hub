import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { randomUUID, createHash } from "crypto";
import { openai } from "./replit_integrations/audio/client";
import { storage } from "./storage";
import {
  researchRequestSchema,
  researchBundleSchema,
  type ResearchBundle,
  type ResearchSafety,
} from "@shared/schema";

/* ---------- Owner key (cookie-based, anonymous identity) ---------- */

const OWNER_COOKIE = "dm_owner";
const COOKIE_MAX_AGE_SECS = 60 * 60 * 24 * 365 * 2; // 2 years

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = decodeURIComponent(part.slice(idx + 1).trim());
    if (k) out[k] = v;
  }
  return out;
}

function ownerKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const cookies = parseCookies(req.headers.cookie);
  let owner = cookies[OWNER_COOKIE];
  if (!owner || owner.length < 16 || owner.length > 200) {
    owner = randomUUID();
    res.cookie(OWNER_COOKIE, owner, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE_SECS * 1000,
      path: "/",
    });
  }
  res.locals.ownerKey = owner;
  next();
}

function getOwnerKey(res: Response): string {
  return String(res.locals.ownerKey || "");
}

// The "owner" stored on a research row is one of:
//   user:<id>   -> belongs to a signed-in account
//   anon:<hash> -> belongs to an anonymous browser cookie
// When a signed-in user makes a request we always use their account key.
// Anonymous packets that match their cookie hash get claimed on first hit.
// Note: rows written before this prefix scheme stored a bare cookie hash and
// were unreachable from the app. They were removed by the one-time cleanup in
// scripts/cleanup-orphaned-research.ts.
function userOwner(userId: number): string {
  return `user:${userId}`;
}

async function effectiveOwner(req: Request, res: Response): Promise<string> {
  const cookieHash = createHash("sha256").update(getOwnerKey(res)).digest("hex");
  const legacy = cookieHash; // pre-prefix rows stored the bare hash
  const anon = "anon:" + cookieHash;
  const userId = req.session?.userId;
  if (userId) {
    const account = userOwner(userId);
    // Migrate any packets created before this user signed in (both the
    // current `anon:<hash>` rows and any legacy bare-hash rows).
    try {
      await storage.claimResearchForUser(anon, account);
      await storage.claimResearchForUser(legacy, account);
    } catch (err) {
      console.warn("[research] claim on sign-in failed:", (err as Error).message);
    }
    return account;
  }
  // For anonymous visitors, migrate any pre-prefix legacy rows up to the
  // current `anon:` namespace so they keep showing up on /my-research.
  try {
    await storage.claimResearchForUser(legacy, anon);
  } catch (err) {
    console.warn("[research] anon legacy claim failed:", (err as Error).message);
  }
  return anon;
}

/* ---------- Safety pre-check ---------- */

const DISALLOWED_PATTERNS = [
  /\b(genocide|exterminat|ethnic cleansing)\b.*\b(should|ought|justified)\b/i,
  /\b(should|ought)\b.*\b(kill|murder|attack)\b.*\b(group|people|race|religion)\b/i,
  /\bhow to\b.*\b(make|build)\b.*\b(bomb|weapon|virus|poison)\b/i,
  /\b(child|minors?)\b.*\b(sexual|porn)\b/i,
  /\b(racial|ethnic)\b.*\b(superior|inferior)/i,
];

const SENSITIVE_HINTS = [
  /abortion/i, /gun control/i, /gun rights/i, /israel/i, /palestin/i,
  /immigration/i, /transgender/i, /lgbt/i, /vaccine/i, /trump/i, /biden/i,
  /capital punishment/i, /death penalty/i, /assisted suicide/i, /euthanas/i,
  /police\b.*reform/i, /defund.*police/i, /critical race/i,
];

function preCheckSafety(topic: string): ResearchSafety {
  for (const re of DISALLOWED_PATTERNS) {
    if (re.test(topic)) {
      return {
        level: "refused",
        message:
          "This topic appears to advocate for harm against a group, which we can't generate research for.",
        suggestion:
          "Try rephrasing as a balanced policy question (e.g. focus on a specific law, program, or international response).",
      };
    }
  }
  for (const re of SENSITIVE_HINTS) {
    if (re.test(topic)) {
      return {
        level: "warn",
        message:
          "Heads up: this topic is politically charged. We've focused the research on widely reported, sourced perspectives from multiple sides.",
        suggestion: "",
      };
    }
  }
  return { level: "ok", message: "", suggestion: "" };
}

/* ---------- Live web search (OpenAI Responses API) ---------- */

interface HarvestedSource {
  title: string;
  url: string;
  snippet: string;
}

interface HarvestResult {
  used: "web_search";
  notes: string;
  sources: HarvestedSource[];
  excerpts: { url: string; title: string; text: string }[];
}

class WebSearchUnavailableError extends Error {
  constructor(message: string) { super(message); this.name = "WebSearchUnavailableError"; }
}

const SEARCH_INSTRUCTIONS = `You are a research librarian. Use the web_search tool to find 12-18 high-quality, currently accessible sources covering the given debate topic.

For each source you cite, output a single line in this format on its own line:
SOURCE | <publisher or domain> | <article title> | <date if known else ""> | <one-sentence summary> | <stance: for|against|neutral> | <full URL>

Rules:
- Cover both sides: include sources arguing FOR the resolution, AGAINST it, and at least 2 NEUTRAL/background sources.
- Prefer reputable outlets (major newspapers, wires, magazines, think tanks, gov, peer-reviewed). No social media, no Wikipedia.
- Use only URLs that came from your web_search results. Never invent.
- After the SOURCE lines, write a short paragraph (3-5 sentences) summarising the current state of the debate.

No other prose. No markdown. No citation footnote markers.`;

async function fetchExcerpt(url: string, title: string): Promise<{ url: string; title: string; text: string } | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DebateMasteryResearchBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("xhtml")) return null;
    const html = (await res.text()).slice(0, 200_000);
    // Strip script/style/nav/footer/header blocks, then tags.
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<(nav|footer|header|aside|form|figure)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped.length < 200) return null;
    const text = stripped.slice(0, 1500);
    return { url, title, text };
  } catch {
    return null;
  }
}

async function harvestFromWeb(topic: string): Promise<HarvestResult> {
  // OpenAI Responses API + web_search_preview tool. If unavailable on the
  // proxy or it fails to return enough sources we throw — the route surfaces
  // a recoverable error rather than fabricating links.
  const responsesApi = (openai as unknown as {
    responses?: {
      create: (args: unknown) => Promise<{ output_text?: string; output?: unknown }>;
    };
  }).responses;
  if (!responsesApi) {
    throw new WebSearchUnavailableError("Web search tool is not available on this server.");
  }

  let text = "";
  try {
    const result = await responsesApi.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      tool_choice: "auto",
      input: `${SEARCH_INSTRUCTIONS}\n\nDebate topic: ${topic}`,
    });
    text = result.output_text ?? "";
  } catch (err) {
    throw new WebSearchUnavailableError(
      `Live web search failed: ${(err as Error).message}`
    );
  }

  const sources: HarvestedSource[] = [];
  let notes = "";
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("SOURCE")) {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 7) {
        const url = parts[6];
        const title = parts[2];
        const summary = parts[4];
        if (url.startsWith("http") && title) {
          sources.push({ title, url, snippet: `${parts[1]} — ${summary}` });
        }
      }
    } else if (line && !line.startsWith("SOURCE")) {
      notes += (notes ? " " : "") + line;
    }
  }

  if (sources.length < 4) {
    throw new WebSearchUnavailableError(
      "Live web search did not return enough usable sources."
    );
  }

  // Fetch + extract the top results so synthesis can quote real article text.
  const top = sources.slice(0, 6);
  const fetched = await Promise.all(top.map((s) => fetchExcerpt(s.url, s.title)));
  const excerpts = fetched.filter(
    (e): e is { url: string; title: string; text: string } => !!e
  );

  return { used: "web_search", notes, sources, excerpts };
}

/* ---------- Synthesis prompt ---------- */

const SYSTEM_PROMPT = `You are an expert debate research assistant. You produce well-organized debate research packets for high-school and college competitive debaters.

Hard rules:
- Output ONE valid JSON object that EXACTLY matches the provided schema. No prose, no markdown, no comments.
- You MUST use ONLY the URLs from the "Harvested sources" block below. Never invent, modify, or guess URLs. Every "url" field in your output must appear verbatim in that block.
- When article excerpts are provided, base every quote in "evidenceQuotes" and the "evidence" arrays on those excerpts. Quotes must be lifted (or tightly paraphrased) from the excerpt text — never fabricated.
- The "stat" inside keyFacts must be supported by an excerpt or by the source's summary line.
- Sources must be grouped by stance: "for" (supports the resolution), "against" (opposes it), and "neutral" (background / mixed).
- Provide BOTH "for" and "against" evidence quotes regardless of which side the student picked. The case outline is for the student's chosen side.
- Stats and quotes must be specific: include numbers, dates, and the named source.
- Write for a competitive debater: tight, evidentiary, no fluff. No fields outside the schema.
- If a source date is unknown, leave it blank — don't guess.`;

function buildUserPrompt(opts: {
  topic: string;
  side: "For" | "Against" | "Both";
  format: string;
  depth: "Quick" | "Deep";
  harvest: HarvestResult;
}): string {
  const sourceCount = opts.depth === "Deep" ? "12-15" : "8-10";
  const factCount = opts.depth === "Deep" ? "7-9" : "5-7";
  const quoteCount = opts.depth === "Deep" ? "5-6" : "3-4";
  const sideLine =
    opts.side === "Both"
      ? "The student wants to be ready for BOTH sides. Build the case outline as a balanced 'either-side' brief: 3 contentions that work for the For side."
      : `The student is debating the ${opts.side.toUpperCase()} side. Write the case outline FOR THAT SIDE.`;

  let harvestBlock =
    `\n\nHarvested sources (USE THESE EXACT URLs — pick the ${sourceCount.split("-")[0]}+ most relevant and group by stance):\n` +
    opts.harvest.sources
      .map((s, i) => `[${i + 1}] ${s.title}\n   URL: ${s.url}\n   Note: ${s.snippet}`)
      .join("\n");
  if (opts.harvest.notes) harvestBlock += `\n\nLandscape notes: ${opts.harvest.notes}`;
  if (opts.harvest.excerpts.length > 0) {
    harvestBlock +=
      "\n\nArticle excerpts (use these to ground quotes & key facts — do not fabricate beyond them):\n" +
      opts.harvest.excerpts
        .map((e, i) => `[E${i + 1}] ${e.title}\n   URL: ${e.url}\n   Excerpt: ${e.text}`)
        .join("\n\n");
  }

  return `Topic / Resolution: ${opts.topic}
Format: ${opts.format} debate
Depth: ${opts.depth}
${sideLine}${harvestBlock}

Produce ${sourceCount} source cards (mix of for/against/neutral), ${factCount} key facts, ${quoteCount} evidence quotes per side, 3 contentions for the case outline (each with claim, warrant, and 1-2 supporting evidence quotes with sources), 3-5 anticipated opposition arguments with one-line rebuttal hints, and 6-10 key terms (definitions, organizations, and people).

Return ONLY the JSON object.`;
}

const JSON_SCHEMA = {
  name: "research_bundle",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["overview", "keyFacts", "sources", "evidenceQuotes", "caseOutline", "opposition", "keyTerms"],
    properties: {
      overview: { type: "string" },
      keyFacts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["stat", "source", "url"],
          properties: { stat: { type: "string" }, source: { type: "string" }, url: { type: "string" } },
        },
      },
      sources: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "publisher", "date", "summary", "url", "stance"],
          properties: {
            title: { type: "string" },
            publisher: { type: "string" },
            date: { type: "string" },
            summary: { type: "string" },
            url: { type: "string" },
            stance: { type: "string", enum: ["for", "against", "neutral"] },
          },
        },
      },
      evidenceQuotes: {
        type: "object",
        additionalProperties: false,
        required: ["for", "against"],
        properties: { for: { type: "array", items: quoteItem() }, against: { type: "array", items: quoteItem() } },
      },
      caseOutline: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "claim", "warrant", "evidence"],
          properties: {
            title: { type: "string" },
            claim: { type: "string" },
            warrant: { type: "string" },
            evidence: { type: "array", items: quoteItem() },
          },
        },
      },
      opposition: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["argument", "rebuttalHint"],
          properties: { argument: { type: "string" }, rebuttalHint: { type: "string" } },
        },
      },
      keyTerms: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["term", "kind", "description"],
          properties: {
            term: { type: "string" },
            kind: { type: "string", enum: ["definition", "organization", "person"] },
            description: { type: "string" },
          },
        },
      },
    },
  },
};

function quoteItem() {
  return {
    type: "object" as const,
    additionalProperties: false,
    required: ["quote", "source", "url"],
    properties: { quote: { type: "string" }, source: { type: "string" }, url: { type: "string" } },
  };
}

async function generateBundle(opts: {
  topic: string;
  side: "For" | "Against" | "Both";
  format: string;
  depth: "Quick" | "Deep";
  harvest: HarvestResult;
}): Promise<ResearchBundle> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(opts) },
    ],
    response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
    temperature: 0.4,
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  return researchBundleSchema.parse(JSON.parse(raw));
}

/* ---------- Routes ---------- */

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export function registerResearchRoutes(app: Express) {
  app.use("/api/research", ownerKeyMiddleware);

  app.post("/api/research/generate", async (req: Request, res: Response) => {
    const parsed = researchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }
    const { topic, side, format, depth } = parsed.data;
    const owner = await effectiveOwner(req, res);

    const safety = preCheckSafety(topic);
    if (safety.level === "refused") {
      return res.status(200).json({ safety, bundle: null, id: null });
    }

    try {
      const harvest = await harvestFromWeb(topic);
      const bundle = await generateBundle({ topic, side, format, depth, harvest });
      const row = await storage.createResearch({
        userId: owner,
        topic,
        side,
        format,
        depth,
        bundle,
        safety,
      });
      res.json({
        id: row.id,
        safety,
        bundle,
        sourcing: { mode: harvest.used, harvestedCount: harvest.sources.length },
        createdAt: row.createdAt,
      });
    } catch (err) {
      if (err instanceof WebSearchUnavailableError) {
        console.warn("[research] web search unavailable:", err.message);
        return res.status(503).json({
          error: "Live web search is temporarily unavailable, so we can't pull verified sources right now. Please try again in a moment.",
        });
      }
      console.error("research generate error", err);
      res.status(500).json({ error: "Research generation failed. Please try again." });
    }
  });

  app.get("/api/research", async (req: Request, res: Response) => {
    const owner = await effectiveOwner(req, res);
    const rows = await storage.listResearch(owner);
    res.json(
      rows.map((r) => ({
        id: r.id,
        topic: r.topic,
        side: r.side,
        format: r.format,
        depth: r.depth,
        createdAt: r.createdAt,
      }))
    );
  });

  app.get("/api/research/:id", async (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) return res.status(400).json({ error: "Invalid id" });
    const owner = await effectiveOwner(req, res);
    const row = await storage.getResearch(parsed.data.id);
    if (!row || row.userId !== owner) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(row);
  });

  app.delete("/api/research/:id", async (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) return res.status(400).json({ error: "Invalid id" });
    const owner = await effectiveOwner(req, res);
    const row = await storage.getResearch(parsed.data.id);
    if (!row || row.userId !== owner) {
      return res.status(404).json({ error: "Not found" });
    }
    await storage.deleteResearch(parsed.data.id);
    res.json({ ok: true });
  });
}
