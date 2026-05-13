import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Search, Loader2, Download, Copy, ArrowLeft, ArrowRight, Mic, Sparkles,
  ExternalLink, BookOpen, Quote, Users, Target, AlertTriangle, ShieldAlert,
  CheckCircle2, FileText, Lightbulb,
} from "lucide-react";
import type { ResearchBundle, ResearchSafety } from "@shared/schema";

type Side = "For" | "Against" | "Both";
type FormatKey = "Generic" | "PF" | "LD" | "Policy" | "Parli";
type Depth = "Quick" | "Deep";

interface GenerateResponse {
  id: number | null;
  safety: ResearchSafety;
  bundle: ResearchBundle | null;
  createdAt?: string;
}

interface SavedRow {
  id: number;
  topic: string;
  side: Side;
  format: FormatKey;
  depth: Depth;
  bundle: ResearchBundle;
  safety: ResearchSafety;
  createdAt: string;
}

const SAMPLE_TOPICS = [
  "Resolved: The U.S. should ban TikTok",
  "AI in schools",
  "Resolved: Public colleges ought not consider standardized tests",
  "Universal basic income",
];

function StanceBadge({ stance }: { stance: "for" | "against" | "neutral" }) {
  const map = {
    for: { label: "For", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
    against: { label: "Against", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
    neutral: { label: "Background", cls: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" },
  } as const;
  const v = map[stance];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${v.cls}`}>
      {v.label}
    </span>
  );
}

function bundleToText(topic: string, side: Side, b: ResearchBundle): string {
  const lines: string[] = [];
  lines.push(`TOPIC RESEARCH PACKET`);
  lines.push(`Topic: ${topic}`);
  lines.push(`Side: ${side}`);
  lines.push("");
  lines.push("OVERVIEW");
  lines.push(b.overview);
  lines.push("");
  lines.push("KEY FACTS & STATS");
  b.keyFacts.forEach((f, i) => lines.push(`${i + 1}. ${f.stat} — ${f.source}${f.url ? ` (${f.url})` : ""}`));
  lines.push("");
  lines.push("SOURCES");
  b.sources.forEach((s) => lines.push(`- [${s.stance.toUpperCase()}] ${s.title} — ${s.publisher}${s.date ? ` (${s.date})` : ""}\n  ${s.summary}\n  ${s.url}`));
  lines.push("");
  lines.push("EVIDENCE — FOR");
  b.evidenceQuotes.for.forEach((q) => lines.push(`- "${q.quote}" — ${q.source}${q.url ? ` (${q.url})` : ""}`));
  lines.push("");
  lines.push("EVIDENCE — AGAINST");
  b.evidenceQuotes.against.forEach((q) => lines.push(`- "${q.quote}" — ${q.source}${q.url ? ` (${q.url})` : ""}`));
  lines.push("");
  lines.push(`CASE OUTLINE (${side})`);
  b.caseOutline.forEach((c, i) => {
    lines.push(`Contention ${i + 1}: ${c.title}`);
    lines.push(`  Claim: ${c.claim}`);
    lines.push(`  Warrant: ${c.warrant}`);
    c.evidence.forEach((e) => lines.push(`  Evidence: "${e.quote}" — ${e.source}${e.url ? ` (${e.url})` : ""}`));
  });
  lines.push("");
  lines.push("ANTICIPATED OPPOSITION");
  b.opposition.forEach((o, i) => lines.push(`${i + 1}. ${o.argument}\n   Rebuttal: ${o.rebuttalHint}`));
  lines.push("");
  lines.push("KEY TERMS & STAKEHOLDERS");
  b.keyTerms.forEach((t) => lines.push(`- (${t.kind}) ${t.term}: ${t.description}`));
  return lines.join("\n");
}

/* ---------- Form ---------- */

function ResearchForm({
  onResult,
}: {
  onResult: (r: GenerateResponse, req: { topic: string; side: Side; format: FormatKey; depth: Depth }) => void;
}) {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [side, setSide] = useState<Side>("For");
  const [format, setFormat] = useState<FormatKey>("Generic");
  const [depth, setDepth] = useState<Depth>("Quick");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/research/generate", {
        topic: topic.trim(),
        side,
        format,
        depth,
      });
      return (await res.json()) as GenerateResponse;
    },
    onSuccess: (data) => {
      onResult(data, { topic: topic.trim(), side, format, depth });
    },
    onError: () => {
      toast({ title: "Couldn't build the packet", description: "Please try again in a moment.", variant: "destructive" });
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim().length < 3) {
      toast({ title: "Add a topic", description: "Enter a debate resolution or topic to research.", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  return (
    <Card className="p-6 md:p-8 shadow-xl border-border/60" data-testid="card-research-form">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
            Topic / Resolution
          </label>
          <input
            data-testid="input-research-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder='e.g. "Resolved: The U.S. should ban TikTok" or just "AI in schools"'
            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {SAMPLE_TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                data-testid={`button-sample-${t.slice(0, 12)}`}
                className="text-[11px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
              Side
            </label>
            <div className="flex gap-1.5">
              {(["For", "Against", "Both"] as Side[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  data-testid={`button-side-${s.toLowerCase()}`}
                  onClick={() => setSide(s)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md border transition-all ${
                    side === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:border-primary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
              Format
            </label>
            <Select value={format} onValueChange={(v) => setFormat(v as FormatKey)}>
              <SelectTrigger data-testid="select-format"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Generic">Generic</SelectItem>
                <SelectItem value="PF">Public Forum</SelectItem>
                <SelectItem value="LD">Lincoln-Douglas</SelectItem>
                <SelectItem value="Policy">Policy</SelectItem>
                <SelectItem value="Parli">Parliamentary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
              Depth
            </label>
            <Select value={depth} onValueChange={(v) => setDepth(v as Depth)}>
              <SelectTrigger data-testid="select-depth"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Quick">Quick brief</SelectItem>
                <SelectItem value="Deep">Deep dive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="submit"
          disabled={mutation.isPending}
          data-testid="button-generate-research"
          className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground text-base font-semibold"
        >
          {mutation.isPending ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Building your packet…</>
          ) : (
            <><Search className="w-5 h-5 mr-2" /> Build Research Packet</>
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          Typical generation time: ~15 seconds. Always verify cited links before round.
        </p>
      </form>
    </Card>
  );
}

/* ---------- Results ---------- */

function Results({
  topic,
  side,
  format,
  depth,
  bundle,
  safety,
  id,
}: {
  topic: string;
  side: Side;
  format: FormatKey;
  depth: Depth;
  bundle: ResearchBundle;
  safety: ResearchSafety;
  id: number | null;
}) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [sidePickerOpen, setSidePickerOpen] = useState(false);

  const sectionFor = bundle.sources.filter((s) => s.stance === "for");
  const sectionAgainst = bundle.sources.filter((s) => s.stance === "against");
  const sectionNeutral = bundle.sources.filter((s) => s.stance === "neutral");

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(bundleToText(topic, side, bundle));
      toast({ title: "Copied!", description: "Full packet copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "destructive" });
    }
  };

  const downloadPdf = async () => {
    if (!bundle) return;
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const margin = 48;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - margin * 2;
      let y = margin;

      const writeLine = (text: string, size: number, bold = false, gap = 4) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(text, maxWidth);
        for (const ln of lines) {
          if (y + size > pageHeight - margin) { doc.addPage(); y = margin; }
          doc.text(ln, margin, y);
          y += size + gap;
        }
      };
      const sectionHeader = (t: string) => { y += 10; writeLine(t, 14, true, 6); };
      const para = (t: string) => writeLine(t, 11, false, 5);

      writeLine(topic, 18, true, 8);
      writeLine(`${format} • ${side} • ${depth}`, 10, false, 12);

      sectionHeader("Overview");
      para(bundle.overview);

      sectionHeader("Key Facts");
      bundle.keyFacts.forEach((f, i) => para(`${i + 1}. ${f.stat}  — ${f.source} (${f.url})`));

      sectionHeader("Sources");
      (["for", "against", "neutral"] as const).forEach((stance) => {
        const list = bundle.sources.filter((s) => s.stance === stance);
        if (!list.length) return;
        writeLine(stance.toUpperCase(), 12, true, 4);
        list.forEach((s) => para(`• ${s.title} — ${s.publisher}${s.date ? `, ${s.date}` : ""}\n  ${s.summary}\n  ${s.url}`));
      });

      sectionHeader("Evidence — For");
      bundle.evidenceQuotes.for.forEach((q) => para(`“${q.quote}” — ${q.source} (${q.url})`));
      sectionHeader("Evidence — Against");
      bundle.evidenceQuotes.against.forEach((q) => para(`“${q.quote}” — ${q.source} (${q.url})`));

      sectionHeader("Case Outline");
      bundle.caseOutline.forEach((c, i) => {
        writeLine(`Contention ${i + 1}: ${c.title}`, 12, true, 4);
        para(`Claim: ${c.claim}`);
        para(`Warrant: ${c.warrant}`);
        c.evidence.forEach((e) => para(`  • “${e.quote}” — ${e.source}`));
      });

      sectionHeader("Anticipated Opposition");
      bundle.opposition.forEach((o, i) => {
        para(`${i + 1}. ${o.argument}`);
        para(`   Rebuttal: ${o.rebuttalHint}`);
      });

      sectionHeader("Key Terms");
      bundle.keyTerms.forEach((t) => para(`• ${t.term} (${t.kind}): ${t.description}`));

      const safe = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50) || "research";
      doc.save(`${safe}.pdf`);
    } catch (err) {
      console.error("pdf error", err);
      toast({ title: "PDF failed", description: "Couldn't build the PDF — try Copy all instead.", variant: "destructive" });
    }
  };

  const launchPractice = (overrideSide?: "Aff" | "Neg") => {
    if (!id) {
      toast({ title: "Can't launch", description: "Save your packet first.", variant: "destructive" });
      return;
    }
    let sideForBot: "Aff" | "Neg";
    if (overrideSide) sideForBot = overrideSide;
    else if (side === "For") sideForBot = "Aff";
    else if (side === "Against") sideForBot = "Neg";
    else {
      setSidePickerOpen(true);
      return;
    }
    const fmt = format === "PF" || format === "LD" || format === "Policy" ? format : "LD";
    navigate(`/practice?researchId=${id}&topic=${encodeURIComponent(topic)}&side=${sideForBot}&format=${fmt}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 print:space-y-4"
      data-testid="research-results"
    >
      {/* Header card */}
      <Card className="p-6 md:p-8 print:shadow-none print:border-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold uppercase tracking-wider">{format}</span>
              <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold uppercase tracking-wider">{side}</span>
              <span className="px-2 py-0.5 rounded-full bg-muted font-semibold uppercase tracking-wider">{depth}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-primary leading-tight" data-testid="text-research-topic">
              {topic}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button onClick={copyAll} variant="outline" size="sm" data-testid="button-copy-all">
              <Copy className="w-4 h-4 mr-1.5" /> Copy all
            </Button>
            <Button onClick={downloadPdf} variant="outline" size="sm" data-testid="button-download-pdf">
              <Download className="w-4 h-4 mr-1.5" /> PDF
            </Button>
            <Button onClick={() => launchPractice()} size="sm" className="bg-accent hover:bg-accent/90" data-testid="button-launch-practice">
              <Mic className="w-4 h-4 mr-1.5" /> Start practice round
            </Button>
          </div>
        </div>

        {safety.level === "warn" && safety.message && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm" data-testid="banner-safety-warn">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <span>{safety.message}</span>
          </div>
        )}
      </Card>

      {/* Overview */}
      <Card className="p-6 md:p-8 print:shadow-none print:border print:border-border">
        <h2 className="font-display text-xl font-bold text-primary mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent" /> Topic Overview
        </h2>
        <p className="text-foreground/85 leading-relaxed whitespace-pre-line" data-testid="text-overview">
          {bundle.overview}
        </p>
      </Card>

      {/* Key facts */}
      {bundle.keyFacts.length > 0 && (
        <Card className="p-6 md:p-8 print:shadow-none print:border print:border-border">
          <h2 className="font-display text-xl font-bold text-primary mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" /> Key Facts & Stats
          </h2>
          <ul className="space-y-2.5">
            {bundle.keyFacts.map((f, i) => (
              <li key={i} className="flex gap-3 items-start text-sm" data-testid={`fact-${i}`}>
                <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-foreground/90">
                  {f.stat}{" "}
                  <span className="text-muted-foreground">
                    — {f.source}
                    {f.url && (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:text-accent ml-1"
                        data-testid={`link-fact-${i}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Sources */}
      <Card className="p-6 md:p-8 print:shadow-none print:border print:border-border">
        <h2 className="font-display text-xl font-bold text-primary mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent" /> Source Library
        </h2>
        {[
          { label: "Supports the resolution (For)", items: sectionFor, key: "for" as const },
          { label: "Opposes the resolution (Against)", items: sectionAgainst, key: "against" as const },
          { label: "Background / Neutral", items: sectionNeutral, key: "neutral" as const },
        ].map((group) =>
          group.items.length === 0 ? null : (
            <div key={group.key} className="mb-5 last:mb-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <StanceBadge stance={group.key} /> {group.label}
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {group.items.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 rounded-lg border border-border bg-card hover-elevate active-elevate-2"
                    data-testid={`source-${group.key}-${i}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-semibold text-sm text-foreground leading-snug">{s.title}</h4>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    </div>
                    <p className="text-[11px] uppercase tracking-wider text-accent font-bold mb-1.5">
                      {s.publisher}{s.date ? ` · ${s.date}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.summary}</p>
                  </a>
                ))}
              </div>
            </div>
          )
        )}
      </Card>

      {/* Evidence quotes */}
      <div className="grid md:grid-cols-2 gap-6 print:grid-cols-1">
        {(["for", "against"] as const).map((stance) => (
          <Card key={stance} className="p-6 print:shadow-none print:border print:border-border">
            <h2 className="font-display text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <Quote className="w-4 h-4 text-accent" /> Evidence — {stance === "for" ? "For" : "Against"}
            </h2>
            <div className="space-y-3">
              {bundle.evidenceQuotes[stance].map((q, i) => (
                <blockquote
                  key={i}
                  className={`border-l-4 pl-3 py-1 text-sm ${stance === "for" ? "border-emerald-500/50" : "border-rose-500/50"}`}
                  data-testid={`quote-${stance}-${i}`}
                >
                  <p className="text-foreground/90 italic">"{q.quote}"</p>
                  <footer className="text-xs text-muted-foreground mt-1">
                    — {q.source}
                    {q.url && (
                      <a href={q.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:text-accent ml-1">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </footer>
                </blockquote>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Case outline */}
      {bundle.caseOutline.length > 0 && (
        <Card className="p-6 md:p-8 print:shadow-none print:border print:border-border">
          <h2 className="font-display text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Case Outline — {side === "Both" ? "For" : side}
          </h2>
          <div className="space-y-5">
            {bundle.caseOutline.map((c, i) => (
              <div key={i} className="p-4 rounded-lg border border-border bg-muted/30" data-testid={`contention-${i}`}>
                <h3 className="font-display text-base font-bold text-primary mb-2">
                  Contention {i + 1}: {c.title}
                </h3>
                <p className="text-sm text-foreground/90 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent mr-1.5">Claim:</span>{c.claim}
                </p>
                <p className="text-sm text-foreground/90 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent mr-1.5">Warrant:</span>{c.warrant}
                </p>
                {c.evidence.length > 0 && (
                  <div className="space-y-1.5">
                    {c.evidence.map((e, j) => (
                      <blockquote key={j} className="text-xs text-muted-foreground italic border-l-2 border-accent/40 pl-2">
                        "{e.quote}" — <span className="not-italic">{e.source}</span>
                        {e.url && (
                          <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:text-accent ml-1">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </blockquote>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Opposition */}
      {bundle.opposition.length > 0 && (
        <Card className="p-6 md:p-8 print:shadow-none print:border print:border-border">
          <h2 className="font-display text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-accent" /> Anticipated Opposition
          </h2>
          <div className="space-y-3">
            {bundle.opposition.map((o, i) => (
              <div key={i} className="p-3 rounded-lg border border-border" data-testid={`opposition-${i}`}>
                <p className="text-sm font-semibold text-foreground mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mr-1.5">They'll argue:</span>
                  {o.argument}
                </p>
                <p className="text-sm text-foreground/80">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mr-1.5">Rebuttal hint:</span>
                  {o.rebuttalHint}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Key terms */}
      {bundle.keyTerms.length > 0 && (
        <Card className="p-6 md:p-8 print:shadow-none print:border print:border-border">
          <h2 className="font-display text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" /> Key Terms & Stakeholders
          </h2>
          <div className="flex flex-wrap gap-2">
            {bundle.keyTerms.map((t, i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-lg border border-border bg-card max-w-xs"
                data-testid={`term-${i}`}
                title={t.description}
              >
                <div className="text-xs font-bold uppercase tracking-wider text-accent">{t.kind}</div>
                <div className="text-sm font-semibold text-foreground">{t.term}</div>
                <div className="text-xs text-muted-foreground leading-tight mt-0.5">{t.description}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Footer CTA */}
      <Card className="p-6 md:p-8 bg-primary text-white print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-accent" /> Ready to spar?
            </h3>
            <p className="text-white/80 text-sm mt-1">
              Launch the Practice Bot pre-loaded with this topic and your prep packet on the side.
            </p>
          </div>
          <Button onClick={() => launchPractice()} className="bg-accent hover:bg-accent/90 text-accent-foreground" data-testid="button-launch-practice-footer">
            Start practice round <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>

      {sidePickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSidePickerOpen(false)}
          data-testid="dialog-side-picker"
        >
          <Card className="p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-primary mb-1">Which side will you debate?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You researched both sides — pick which one to defend in this practice round. Your prep packet covers both.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => { setSidePickerOpen(false); launchPractice("Aff"); }}
                className="bg-accent hover:bg-accent/90"
                data-testid="button-pick-aff"
              >
                Affirmative
              </Button>
              <Button
                onClick={() => { setSidePickerOpen(false); launchPractice("Neg"); }}
                variant="outline"
                data-testid="button-pick-neg"
              >
                Negative
              </Button>
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  );
}

/* ---------- Page ---------- */

export default function Research() {
  const { toast } = useToast();
  const [matchView, paramsView] = useRoute("/research/:id");
  const viewingId = matchView ? Number(paramsView?.id) : null;

  const [result, setResult] = useState<{
    topic: string; side: Side; format: FormatKey; depth: Depth;
    bundle: ResearchBundle; safety: ResearchSafety; id: number | null;
  } | null>(null);

  const [refusal, setRefusal] = useState<ResearchSafety | null>(null);

  const savedQuery = useQuery<SavedRow>({
    queryKey: ["/api/research", viewingId],
    enabled: !!viewingId,
  });

  useEffect(() => {
    if (savedQuery.data && viewingId) {
      const r = savedQuery.data;
      setResult({
        topic: r.topic,
        side: r.side as Side,
        format: r.format as FormatKey,
        depth: r.depth as Depth,
        bundle: r.bundle,
        safety: r.safety,
        id: r.id,
      });
    }
  }, [savedQuery.data, viewingId]);

  const handleResult = (
    r: GenerateResponse,
    req: { topic: string; side: Side; format: FormatKey; depth: Depth }
  ) => {
    if (r.safety.level === "refused" || !r.bundle) {
      setRefusal(r.safety);
      setResult(null);
      return;
    }
    setRefusal(null);
    setResult({ ...req, bundle: r.bundle, safety: r.safety, id: r.id });
    if (r.safety.level === "warn") {
      toast({ title: "Heads up", description: r.safety.message });
    }
    setTimeout(() => {
      document.getElementById("research-results-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Navigation />

      {/* Hero */}
      <section className="relative pt-32 pb-10 px-4 overflow-hidden bg-primary print:hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb orb-delay-1 absolute -top-24 -right-24 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px]" />
          <div className="orb orb-delay-2 absolute -bottom-20 left-1/4 w-[400px] h-[400px] bg-white/[0.05] rounded-full blur-[90px]" />
        </div>
        <div className="container relative z-10 mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
              data-testid="link-back-home"
            >
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
              data-testid="link-my-research"
            >
              My Research <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-medium mb-3">
            <Search className="w-3.5 h-3.5 text-accent" /> Topic Research Assistant
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight">
            Walk Into Round <span className="gradient-text">Fully Prepped.</span>
          </h1>
          <p className="text-white/75 mt-3 max-w-2xl">
            Drop in any topic and get a curated research packet — overview, sourced stats,
            article cards by stance, evidence quotes, a case outline for your side, and the
            counter-arguments you'll need to answer.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-10 space-y-8">
        {!viewingId && (
          <ResearchForm onResult={handleResult} />
        )}

        {refusal && refusal.level === "refused" && (
          <Card className="p-6 border-rose-500/40" data-testid="card-refusal">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-foreground mb-1">We can't research this topic</h3>
                <p className="text-sm text-foreground/80 mb-2">{refusal.message}</p>
                {refusal.suggestion && (
                  <p className="text-sm text-muted-foreground"><strong>Try instead:</strong> {refusal.suggestion}</p>
                )}
              </div>
            </div>
          </Card>
        )}

        <div id="research-results-anchor" />
        {viewingId && savedQuery.isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading saved packet…
          </div>
        )}
        {viewingId && savedQuery.isError && (
          <Card className="p-6"><p className="text-sm text-muted-foreground">Couldn't load that packet. <Link href="/research" className="text-primary underline">Start a new one</Link>.</p></Card>
        )}
        {result && (
          <Results {...result} />
        )}
      </section>
    </div>
  );
}
