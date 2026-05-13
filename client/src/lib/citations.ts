import type { ResearchBundle } from "@shared/schema";

export type CitationStyle = "MLA" | "APA";

export interface BibEntry {
  url: string;
  title: string;
  publisher: string;
  date: string;
}

function normalizeDate(date: string): { year: string; full: string } {
  const trimmed = (date || "").trim();
  if (!trimmed) return { year: "n.d.", full: "n.d." };
  const yearMatch = trimmed.match(/\b(19|20)\d{2}\b/);
  return { year: yearMatch ? yearMatch[0] : trimmed, full: trimmed };
}

function stripTrailingPeriod(s: string): string {
  return s.replace(/\.+\s*$/, "");
}

export function formatCitation(entry: BibEntry, style: CitationStyle): string {
  const title = stripTrailingPeriod(entry.title || "Untitled source");
  const publisher = stripTrailingPeriod(entry.publisher || "");
  const { year, full } = normalizeDate(entry.date);
  const url = (entry.url || "").trim();

  if (style === "APA") {
    const parts: string[] = [];
    parts.push(publisher ? `${publisher}.` : "Unknown author.");
    parts.push(`(${year}).`);
    parts.push(`${title}.`);
    if (url) parts.push(url);
    return parts.join(" ");
  }

  const parts: string[] = [];
  parts.push(`"${title}."`);
  if (publisher) parts.push(`${publisher},`);
  if (full && full !== "n.d.") parts.push(`${full},`);
  if (url) parts.push(`${url}.`);
  else if (parts.length) parts[parts.length - 1] = stripTrailingPeriod(parts[parts.length - 1]) + ".";
  return parts.join(" ");
}

export function buildBibliography(bundle: ResearchBundle): BibEntry[] {
  const seen = new Map<string, BibEntry>();
  const add = (url: string, title: string, publisher: string, date: string) => {
    const u = (url || "").trim();
    if (!u) return;
    if (seen.has(u)) return;
    seen.set(u, { url: u, title: title || publisher || "Untitled source", publisher: publisher || "", date: date || "" });
  };

  for (const s of bundle.sources || []) {
    add(s.url, s.title, s.publisher, s.date || "");
  }
  for (const f of bundle.keyFacts || []) {
    add(f.url || "", f.source, f.source, "");
  }
  for (const q of bundle.evidenceQuotes?.for || []) {
    add(q.url || "", q.source, q.source, "");
  }
  for (const q of bundle.evidenceQuotes?.against || []) {
    add(q.url || "", q.source, q.source, "");
  }
  for (const c of bundle.caseOutline || []) {
    for (const e of c.evidence || []) add(e.url || "", e.source, e.source, "");
  }
  return Array.from(seen.values());
}

export function indexOfUrl(bib: BibEntry[], url: string | undefined): number {
  if (!url) return -1;
  const u = url.trim();
  if (!u) return -1;
  return bib.findIndex((b) => b.url === u);
}
