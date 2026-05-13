import { Link, useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Mic,
  Clock,
  GraduationCap,
  BookOpen,
  ListChecks,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import {
  type DebateTopic,
  type TopicDifficulty,
  FORMAT_LABELS,
} from "@shared/topics";

const DIFFICULTY_BADGE: Record<TopicDifficulty, string> = {
  Beginner: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  Intermediate: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  Advanced: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export default function TopicDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = params.id;

  const { data: topic, isLoading, isError } = useQuery<DebateTopic>({
    queryKey: ["/api/topics", id],
    enabled: !!id,
  });

  function launchPractice(side: "Aff" | "Neg") {
    if (!topic) return;
    navigate(
      `/practice?topicId=${encodeURIComponent(topic.id)}&side=${side}&format=${topic.format}`,
    );
  }

  return (
    <div
      className="min-h-screen bg-background font-body text-foreground"
      data-testid="page-topic-detail"
    >
      <Navigation />

      <section className="relative pt-32 pb-10 px-4 overflow-hidden bg-primary">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb orb-delay-1 absolute -top-24 -right-24 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px]" />
          <div className="orb orb-delay-2 absolute -bottom-20 left-1/4 w-[400px] h-[400px] bg-white/[0.05] rounded-full blur-[90px]" />
        </div>
        <div className="container relative z-10 mx-auto max-w-5xl">
          <Link
            href="/topics"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors"
            data-testid="link-back-topics"
          >
            <ArrowLeft className="w-4 h-4" /> Back to topic library
          </Link>

          {isLoading ? (
            <Skeleton className="h-12 w-2/3 bg-white/10" />
          ) : isError || !topic ? (
            <h1 className="text-2xl font-display font-bold text-white">
              Topic not found
            </h1>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge className="bg-white/10 text-white border-white/20">
                  {FORMAT_LABELS[topic.format]}
                </Badge>
                <Badge
                  variant="outline"
                  className={DIFFICULTY_BADGE[topic.difficulty]}
                  data-testid="badge-difficulty"
                >
                  <GraduationCap className="w-3 h-3 mr-1" />
                  {topic.difficulty}
                </Badge>
                <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
                  <Clock className="w-3 h-3" /> {topic.suggestedTime}
                </span>
              </div>
              <h1
                className="text-2xl md:text-4xl font-display font-bold text-white leading-tight"
                data-testid="text-resolution"
              >
                {topic.resolution}
              </h1>
              <p className="text-white/75 mt-3 max-w-3xl">{topic.context}</p>
            </>
          )}
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-10">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : isError || !topic ? (
          <Card className="p-10 text-center">
            <p className="text-muted-foreground">
              We couldn't find that topic.{" "}
              <Link
                href="/topics"
                className="text-accent font-semibold hover:underline"
              >
                Browse the library
              </Link>
              .
            </p>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Background */}
              <Card className="p-6" data-testid="card-background">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h2 className="font-display text-xl font-bold text-primary">
                    Background
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {topic.background}
                </p>
              </Card>

              {/* Key terms */}
              <Card className="p-6" data-testid="card-key-terms">
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="w-4 h-4 text-primary" />
                  <h2 className="font-display text-xl font-bold text-primary">
                    Key terms
                  </h2>
                </div>
                <dl className="space-y-3">
                  {topic.keyTerms.map((kt) => (
                    <div
                      key={kt.term}
                      className="border-l-2 border-primary/30 pl-3"
                      data-testid={`term-${kt.term}`}
                    >
                      <dt className="text-sm font-semibold text-foreground">
                        {kt.term}
                      </dt>
                      <dd className="text-sm text-muted-foreground leading-relaxed">
                        {kt.definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>

              {/* Arguments */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-5" data-testid="card-aff-args">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Aff / Pro
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {topic.affArguments.map((a, i) => (
                      <li
                        key={i}
                        className="text-sm text-foreground/90 leading-relaxed flex gap-2"
                        data-testid={`arg-aff-${i}`}
                      >
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {i + 1}.
                        </span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-5" data-testid="card-neg-args">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Neg / Con
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {topic.negArguments.map((a, i) => (
                      <li
                        key={i}
                        className="text-sm text-foreground/90 leading-relaxed flex gap-2"
                        data-testid={`arg-neg-${i}`}
                      >
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          {i + 1}.
                        </span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              {/* Prep questions */}
              <Card className="p-6" data-testid="card-prep">
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  <h2 className="font-display text-xl font-bold text-primary">
                    Prep questions
                  </h2>
                </div>
                <ol className="space-y-2">
                  {topic.prepQuestions.map((q, i) => (
                    <li
                      key={i}
                      className="text-sm text-foreground/90 leading-relaxed flex gap-2"
                      data-testid={`prep-${i}`}
                    >
                      <span className="text-primary font-bold">{i + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>

            {/* Sticky CTA sidebar */}
            <div className="space-y-4">
              <Card className="p-6 sticky top-24" data-testid="card-practice-cta">
                <h3 className="font-display text-lg font-bold text-primary mb-2">
                  Practice this topic
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Launch the AI practice bot pre-loaded with this resolution
                  and format. Pick your side:
                </p>
                <div className="grid gap-2">
                  <Button
                    onClick={() => launchPractice("Aff")}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    data-testid="button-practice-aff"
                  >
                    <Mic className="w-4 h-4 mr-2" /> Debate as Affirmative
                  </Button>
                  <Button
                    onClick={() => launchPractice("Neg")}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    data-testid="button-practice-neg"
                  >
                    <Mic className="w-4 h-4 mr-2" /> Debate as Negative
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t border-border space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{topic.suggestedTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-3 h-3" />
                    <span>{topic.difficulty}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
