import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  Mic,
  ArrowRight,
  Library,
  Clock,
  GraduationCap,
} from "lucide-react";
import {
  type DebateTopic,
  type TopicFormat,
  type TopicDifficulty,
  FORMAT_LABELS,
  FORMAT_DESCRIPTIONS,
  DIFFICULTIES,
} from "@shared/topics";

const FORMATS: TopicFormat[] = [
  "PF",
  "LD",
  "Policy",
  "Parli",
  "Congress",
  "Worlds",
];

const DIFFICULTY_BADGE: Record<TopicDifficulty, string> = {
  Beginner: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  Intermediate: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  Advanced: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export default function Topics() {
  const [formatFilter, setFormatFilter] = useState<TopicFormat | "all">("all");
  const [difficultyFilter, setDifficultyFilter] =
    useState<TopicDifficulty | "all">("all");
  const [search, setSearch] = useState("");

  const { data: topics = [], isLoading } = useQuery<DebateTopic[]>({
    queryKey: ["/api/topics"],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return topics.filter((t) => {
      if (formatFilter !== "all" && t.format !== formatFilter) return false;
      if (difficultyFilter !== "all" && t.difficulty !== difficultyFilter)
        return false;
      if (
        q &&
        !t.resolution.toLowerCase().includes(q) &&
        !t.context.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [topics, formatFilter, difficultyFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<TopicFormat, DebateTopic[]>();
    for (const f of FORMATS) map.set(f, []);
    for (const t of filtered) map.get(t.format)?.push(t);
    return map;
  }, [filtered]);

  return (
    <div
      className="min-h-screen bg-background font-body text-foreground"
      data-testid="page-topics"
    >
      <Navigation />

      <section className="relative pt-32 pb-10 px-4 overflow-hidden bg-primary">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb orb-delay-1 absolute -top-24 -right-24 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px]" />
          <div className="orb orb-delay-2 absolute -bottom-20 left-1/4 w-[400px] h-[400px] bg-white/[0.05] rounded-full blur-[90px]" />
        </div>
        <div className="container relative z-10 mx-auto max-w-6xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors"
            data-testid="link-back-home"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-medium mb-3">
            <Library className="w-3.5 h-3.5 text-accent" /> Topic Library
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight">
            Browse Resolutions Across <span className="gradient-text">Every Format.</span>
          </h1>
          <p className="text-white/75 mt-3 max-w-2xl">
            Curated debate topics with context, arguments, and prep questions —
            launch a practice round in one click.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-10">
        {/* Filters */}
        <Card className="p-4 md:p-6 mb-8">
          <div className="grid md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                data-testid="input-search-topics"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search resolutions or keywords…"
                className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-3">
              <Select
                value={formatFilter}
                onValueChange={(v) =>
                  setFormatFilter(v as TopicFormat | "all")
                }
              >
                <SelectTrigger data-testid="select-format-filter">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All formats</SelectItem>
                  {FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {FORMAT_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Select
                value={difficultyFilter}
                onValueChange={(v) =>
                  setDifficultyFilter(v as TopicDifficulty | "all")
                }
              >
                <SelectTrigger data-testid="select-difficulty-filter">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground" data-testid="text-results-count">
            {isLoading
              ? "Loading topics…"
              : `${filtered.length} topic${filtered.length === 1 ? "" : "s"} match your filters`}
          </div>
        </Card>

        {/* Format groups */}
        <div className="space-y-12">
          {FORMATS.map((format) => {
            const items = grouped.get(format) ?? [];
            if (items.length === 0) return null;
            return (
              <div key={format} data-testid={`section-format-${format}`}>
                <div className="flex items-end justify-between mb-4 gap-4">
                  <div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-primary">
                      {FORMAT_LABELS[format]}
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-2xl mt-1">
                      {FORMAT_DESCRIPTIONS[format]}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {items.length} topic{items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((t) => (
                    <TopicCard key={t.id} topic={t} />
                  ))}
                </div>
              </div>
            );
          })}

          {!isLoading && filtered.length === 0 && (
            <Card className="p-10 text-center" data-testid="empty-state">
              <p className="text-muted-foreground">
                No topics match those filters. Try clearing the search or
                widening difficulty.
              </p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

function TopicCard({ topic }: { topic: DebateTopic }) {
  return (
    <Card
      className="p-5 flex flex-col h-full hover-elevate transition-all"
      data-testid={`card-topic-${topic.id}`}
    >
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge
          variant="outline"
          className="bg-primary/10 text-primary border-primary/20"
        >
          {FORMAT_LABELS[topic.format]}
        </Badge>
        <Badge
          variant="outline"
          className={DIFFICULTY_BADGE[topic.difficulty]}
          data-testid={`badge-difficulty-${topic.id}`}
        >
          <GraduationCap className="w-3 h-3 mr-1" />
          {topic.difficulty}
        </Badge>
      </div>

      <h3
        className="font-display text-base font-bold text-foreground leading-snug mb-2 line-clamp-3"
        data-testid={`text-resolution-${topic.id}`}
      >
        {topic.resolution}
      </h3>

      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">
        {topic.context}
      </p>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-4">
        <Clock className="w-3 h-3" />
        <span className="line-clamp-1">{topic.suggestedTime}</span>
      </div>

      <div className="mt-auto flex items-center gap-2">
        <Link href={`/topics/${topic.id}`} className="flex-1">
          <Button
            variant="outline"
            className="w-full"
            data-testid={`button-view-${topic.id}`}
          >
            View details <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
        <Link
          href={`/practice?topicId=${encodeURIComponent(topic.id)}&format=${topic.format}`}
          className="flex-1"
        >
          <Button
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            data-testid={`button-practice-${topic.id}`}
          >
            <Mic className="w-3.5 h-3.5 mr-1" /> Practice
          </Button>
        </Link>
      </div>
    </Card>
  );
}
