import { useState } from "react";
import { Link, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Search, FileText, Loader2, ArrowRight, Mic, BookOpen, Sparkles, Trash2,
} from "lucide-react";

interface SavedRow {
  id: number;
  topic: string;
  side: string;
  format: string;
  depth: string;
  createdAt: string;
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    });
  } catch { return d; }
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [pendingDelete, setPendingDelete] = useState<SavedRow | null>(null);
  const { data, isLoading, isError } = useQuery<SavedRow[]>({
    queryKey: ["/api/research"],
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/research/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
      toast({ title: "Packet deleted" });
      setPendingDelete(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't delete packet",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Navigation />

      <section className="relative pt-32 pb-10 px-4 overflow-hidden bg-primary">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb orb-delay-1 absolute -top-24 -right-24 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px]" />
        </div>
        <div className="container relative z-10 mx-auto max-w-5xl">
          <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight">
            Your <span className="gradient-text">Prep Hub</span>
          </h1>
          <p className="text-white/75 mt-3 max-w-2xl">
            Pick up where you left off. Build a packet, jump into a practice round, and revisit anything you've researched.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-10 space-y-8">
        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/research" data-testid="card-action-research">
            <Card className="p-5 hover-elevate active-elevate-2 cursor-pointer h-full">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent/10 text-accent"><Search className="w-5 h-5" /></div>
                <div className="flex-1">
                  <h3 className="font-display text-base font-bold text-foreground">Research a Topic</h3>
                  <p className="text-sm text-muted-foreground mt-1">Generate a sourced prep packet from the live web.</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground mt-2" />
              </div>
            </Card>
          </Link>
          <Link href="/practice" data-testid="card-action-practice">
            <Card className="p-5 hover-elevate active-elevate-2 cursor-pointer h-full">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary"><Mic className="w-5 h-5" /></div>
                <div className="flex-1">
                  <h3 className="font-display text-base font-bold text-foreground">Practice Bot</h3>
                  <p className="text-sm text-muted-foreground mt-1">Run a timed round with AI judging and feedback.</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground mt-2" />
              </div>
            </Card>
          </Link>
        </div>

        {/* My Research */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="font-display text-xl font-bold text-primary">My Research</h2>
              {data && data.length > 0 && (
                <span className="text-xs text-muted-foreground" data-testid="text-saved-count">
                  · {data.length} saved {data.length === 1 ? "packet" : "packets"}
                </span>
              )}
            </div>
            <Link href="/research">
              <Button size="sm" className="bg-accent hover:bg-accent/90" data-testid="button-new-research">
                <Search className="w-4 h-4 mr-2" /> New research
              </Button>
            </Link>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading your packets…
            </div>
          )}

          {isError && (
            <Card className="p-6"><p className="text-sm text-muted-foreground">Couldn't load saved research right now.</p></Card>
          )}

          {data && data.length === 0 && (
            <Card className="p-10 text-center" data-testid="empty-state">
              <Sparkles className="w-10 h-10 mx-auto text-accent mb-3" />
              <h3 className="font-display text-lg font-bold text-primary mb-1">No research yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Build your first packet to start prepping smarter.</p>
              <Link href="/research">
                <Button className="bg-accent hover:bg-accent/90" data-testid="button-empty-start">
                  <Search className="w-4 h-4 mr-2" /> Research a topic
                </Button>
              </Link>
            </Card>
          )}

          {data && data.length > 0 && (
            <div className="grid gap-3">
              {data.map((r) => (
                <Card key={r.id} className="p-5 hover-elevate" data-testid={`row-research-${r.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <Link
                      href={`/research/${r.id}`}
                      className="flex-1 min-w-0"
                      data-testid={`link-research-${r.id}`}
                    >
                      <h3 className="font-display text-base font-bold text-foreground leading-snug truncate">
                        {r.topic}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] uppercase tracking-wider font-bold">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{r.format}</span>
                        <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent">{r.side}</span>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{r.depth}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{formatDate(r.createdAt)}</p>
                    </Link>
                    <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <Link href={`/research/${r.id}`} aria-label="Open packet">
                        <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPendingDelete(r);
                        }}
                        data-testid={`button-delete-research-${r.id}`}
                        aria-label="Delete packet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPendingDelete(null);
        }}
      >
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this research packet?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? (
                <>“{pendingDelete.topic}” will be permanently removed from your saved research. This can't be undone.</>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              data-testid="button-cancel-delete"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting…</>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
