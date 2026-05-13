import { useState } from "react";
import { Link, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Users, Plus, ArrowRight, GraduationCap, ClipboardCheck } from "lucide-react";

type TeamRow = {
  id: number;
  name: string;
  joinCode: string;
  ownerId: number;
  memberRole: "coach" | "student";
  createdAt: string;
};

type Assignment = {
  id: number;
  teamId: number;
  teamName: string;
  kind: "topic" | "drill";
  title: string;
  topic: string | null;
  format: string | null;
  side: string | null;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
};

export default function Teams() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const teamsQ = useQuery<{ teams: TeamRow[] }>({
    queryKey: ["/api/teams"],
    enabled: !!user,
  });

  const assignmentsQ = useQuery<{ assignments: Assignment[] }>({
    queryKey: ["/api/my/assignments"],
    enabled: !!user,
  });

  const createTeam = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/teams", { name });
      return r.json();
    },
    onSuccess: () => {
      setName("");
      toast({ title: "Team created" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (e: any) => toast({ title: "Could not create team", description: e.message, variant: "destructive" }),
  });

  const joinTeam = useMutation({
    mutationFn: async () => {
      const code = joinCode.trim().toUpperCase();
      const r = await apiRequest("POST", `/api/teams/join/${code}`);
      return r.json();
    },
    onSuccess: () => {
      setJoinCode("");
      toast({ title: "Joined team" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my/assignments"] });
    },
    onError: (e: any) => toast({ title: "Could not join team", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Redirect to="/signin?next=/teams" />;

  const myAssignments = assignmentsQ.data?.assignments ?? [];
  const teams = teamsQ.data?.teams ?? [];

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Navigation />
      <section className="pt-32 pb-10 px-4 bg-primary">
        <div className="container mx-auto max-w-5xl">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white">Teams &amp; Classroom</h1>
          <p className="text-white/75 mt-2">Coach a squad, track assignments, and review student rounds.</p>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-lg">Create a team</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Start a classroom or club. You'll become its coach automatically.
            </p>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lincoln HS PF Team"
                data-testid="input-team-name"
              />
              <Button
                onClick={() => createTeam.mutate()}
                disabled={!name.trim() || createTeam.isPending}
                data-testid="button-create-team"
              >
                {createTeam.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-lg">Join a team</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Enter the join code your coach shared with you.
            </p>
            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="JOIN CODE"
                data-testid="input-join-code"
              />
              <Button
                onClick={() => joinTeam.mutate()}
                disabled={!joinCode.trim() || joinTeam.isPending}
                data-testid="button-join-team"
              >
                {joinTeam.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
              </Button>
            </div>
          </Card>
        </div>

        <div>
          <h2 className="font-display text-xl font-bold mb-3">Your teams</h2>
          {teamsQ.isLoading ? (
            <div className="text-muted-foreground text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : teams.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground" data-testid="empty-teams">
              You're not on any team yet. Create one or join with a code above.
            </Card>
          ) : (
            <div className="grid gap-3">
              {teams.map((t) => (
                <Link key={t.id} href={`/teams/${t.id}`} data-testid={`card-team-${t.id}`}>
                  <Card className="p-4 hover-elevate active-elevate-2 cursor-pointer flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{t.name}</span>
                        <span className="text-[10px] uppercase tracking-wide rounded-full bg-muted px-2 py-0.5">
                          {t.memberRole}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Join code: <span className="font-mono">{t.joinCode}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="w-5 h-5 text-accent" />
            <h2 className="font-display text-xl font-bold">Your assignments</h2>
          </div>
          {assignmentsQ.isLoading ? (
            <div className="text-muted-foreground text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : myAssignments.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground" data-testid="empty-assignments">
              No assignments yet. When a coach assigns work, it'll appear here.
            </Card>
          ) : (
            <div className="grid gap-3">
              {myAssignments.map((a) => (
                <AssignmentCard key={a.id} a={a} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function AssignmentCard({ a }: { a: Assignment }) {
  const { toast } = useToast();
  const complete = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/my/assignments/${a.id}/complete`, {});
    },
    onSuccess: () => {
      toast({ title: "Marked complete" });
      queryClient.invalidateQueries({ queryKey: ["/api/my/assignments"] });
    },
  });

  const due = a.dueDate ? new Date(a.dueDate) : null;
  const overdue = due && !a.completedAt && due.getTime() < Date.now();
  return (
    <Card className="p-4" data-testid={`card-assignment-${a.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">{a.title}</span>
            <span className="text-[10px] uppercase tracking-wide rounded-full bg-muted px-2 py-0.5">{a.kind}</span>
            <span className="text-xs text-muted-foreground">{a.teamName}</span>
            {a.completedAt ? (
              <span className="text-[10px] uppercase tracking-wide rounded-full bg-green-500/15 text-green-600 dark:text-green-400 px-2 py-0.5">
                Done
              </span>
            ) : overdue ? (
              <span className="text-[10px] uppercase tracking-wide rounded-full bg-destructive/15 text-destructive px-2 py-0.5">
                Overdue
              </span>
            ) : null}
          </div>
          {a.topic && (
            <div className="text-sm text-muted-foreground mt-1">Topic: {a.topic}</div>
          )}
          {a.format && (
            <div className="text-xs text-muted-foreground">
              Format: {a.format}{a.side ? ` · ${a.side}` : ""}
            </div>
          )}
          {a.description && (
            <p className="text-sm mt-2">{a.description}</p>
          )}
          {due && (
            <div className="text-xs text-muted-foreground mt-1">
              Due {due.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {a.kind === "drill" ? (
            <Link href={`/practice?topic=${encodeURIComponent(a.topic ?? a.title)}${a.format ? `&format=${a.format}` : ""}${a.side ? `&side=${a.side}` : ""}`}>
              <Button variant="secondary" size="sm" data-testid={`button-start-${a.id}`}>Start</Button>
            </Link>
          ) : (
            <Link href={`/research?topic=${encodeURIComponent(a.topic ?? a.title)}`}>
              <Button variant="secondary" size="sm" data-testid={`button-prep-${a.id}`}>Prep</Button>
            </Link>
          )}
          {!a.completedAt && (
            <Button
              size="sm"
              onClick={() => complete.mutate()}
              disabled={complete.isPending}
              data-testid={`button-complete-${a.id}`}
            >
              {complete.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark done"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
