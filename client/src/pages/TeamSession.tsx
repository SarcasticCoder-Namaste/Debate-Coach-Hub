import { useState } from "react";
import { Link, Redirect, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ArrowLeft, MessageSquare } from "lucide-react";
import type { FeedbackReport, PracticeTurn } from "@shared/schema";

type RoundData = {
  round: {
    id: number;
    userId: number;
    topic: string;
    side: string;
    format: string;
    transcript: PracticeTurn[];
    feedback: FeedbackReport | null;
    createdAt: string;
  };
  comments: { id: number; body: string; createdAt: string; authorName: string | null; authorEmail: string }[];
};

export default function TeamSession() {
  const { user, isLoading } = useAuth();
  const [, params] = useRoute<{ id: string; roundId: string }>("/teams/:id/sessions/:roundId");
  const teamId = Number(params?.id);
  const roundId = Number(params?.roundId);
  const { toast } = useToast();
  const [body, setBody] = useState("");

  const q = useQuery<RoundData>({
    queryKey: ["/api/teams", teamId, "rounds", roundId],
    enabled: !!user && Number.isFinite(teamId) && Number.isFinite(roundId),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/rounds/${roundId}/comments`, { body });
    },
    onSuccess: () => {
      setBody("");
      toast({ title: "Comment posted" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "rounds", roundId] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading || q.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!q.data) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-32 text-center text-muted-foreground">Round not found or you don't have access.</div>
      </div>
    );
  }

  const { round, comments } = q.data;
  const fb = round.feedback;

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Navigation />
      <section className="pt-32 pb-6 px-4 bg-primary">
        <div className="container mx-auto max-w-5xl">
          <Link href={`/teams/${teamId}`} className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-3" data-testid="link-back-team">
            <ArrowLeft className="w-4 h-4" /> Back to team
          </Link>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white">{round.topic}</h1>
          <p className="text-white/75 text-sm mt-1">
            {round.format} · {round.side} · {new Date(round.createdAt).toLocaleString()}
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {fb && (
            <Card className="p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display font-bold text-lg">Score</h2>
                <span className="text-3xl font-display font-bold">{fb.overallScore}</span>
              </div>
              <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Strengths</div>
                  <ul className="list-disc pl-4">
                    {fb.strengths.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Improve</div>
                  <ul className="list-disc pl-4">
                    {fb.weaknesses.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-display font-bold text-lg mb-3">Transcript</h2>
            <div className="space-y-3 max-h-[480px] overflow-auto">
              {round.transcript.map((t, i) => (
                <div key={i} className={`p-3 rounded-md text-sm ${t.role === "user" ? "bg-accent/10" : "bg-muted"}`}>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    {t.role === "user" ? "Student" : "Bot"}
                  </div>
                  <div className="whitespace-pre-wrap">{t.content}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-5">
            <h3 className="font-display font-bold flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4" /> Coach comments
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-auto">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="empty-comments">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="text-sm border-l-2 border-accent/40 pl-3" data-testid={`comment-${c.id}`}>
                    <div className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{c.authorName || c.authorEmail}</span>{" "}
                      · {new Date(c.createdAt).toLocaleString()}
                    </div>
                    <div className="whitespace-pre-wrap">{c.body}</div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 space-y-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="Leave coaching feedback…"
                data-testid="input-comment-body"
              />
              <Button
                className="w-full"
                onClick={() => addComment.mutate()}
                disabled={!body.trim() || addComment.isPending}
                data-testid="button-post-comment"
              >
                {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post comment"}
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
