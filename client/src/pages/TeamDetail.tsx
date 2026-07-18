import { useState } from "react";
import { Link, Redirect, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Loader2,
  Users,
  ArrowLeft,
  Mail,
  Plus,
  Trash2,
  Flame,
  ClipboardList,
  ChartBar,
  ArrowRight,
  Copy,
} from "lucide-react";

type Member = {
  userId: number;
  email: string;
  name: string | null;
  role: "coach" | "student";
  joinedAt: string;
  totalRounds: number;
  avgScore: number | null;
  streakDays: number;
  assignmentsAssigned: number;
  assignmentsCompleted: number;
  recent: { id: number; topic: string; format: string; side: string; score: number | null; createdAt: string }[];
};
type Assignment = {
  id: number;
  kind: "topic" | "drill";
  title: string;
  topic: string | null;
  format: string | null;
  side: string | null;
  description: string | null;
  dueDate: string | null;
  targetUserIds: number[] | null;
  createdAt: string;
  completionCount: number;
};
type TeamDetail = {
  team: { id: number; name: string; joinCode: string; ownerId: number };
  isCoach: boolean;
  members: Member[];
  invites: { id: number; email: string; createdAt: string }[];
  assignments: Assignment[];
  joinUrl: string;
};

export default function TeamDetail() {
  const { user, isLoading } = useAuth();
  const [, params] = useRoute<{ id: string }>("/teams/:id");
  const teamId = Number(params?.id);
  const { toast } = useToast();
  const [inviteEmails, setInviteEmails] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);

  const detailQ = useQuery<TeamDetail>({
    queryKey: ["/api/teams", teamId],
    enabled: !!user && Number.isFinite(teamId),
  });

  const invite = useMutation({
    mutationFn: async () => {
      const emails = inviteEmails
        .split(/[\s,]+/)
        .map((e) => e.trim())
        .filter(Boolean);
      await apiRequest("POST", `/api/teams/${teamId}/invites`, { emails });
    },
    onSuccess: () => {
      setInviteEmails("");
      toast({ title: "Invites sent" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
    },
    onError: (e: any) => toast({ title: "Could not invite", description: e.message, variant: "destructive" }),
  });

  const removeMember = useMutation({
    mutationFn: async (uid: number) => {
      await apiRequest("DELETE", `/api/teams/${teamId}/members/${uid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
    },
  });

  if (isLoading || detailQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!detailQ.data) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-32 text-center text-muted-foreground">Team not found.</div>
      </div>
    );
  }
  const d = detailQ.data;
  const isCoach = d.isCoach;
  const joinLink = `${window.location.origin}/teams/join/${d.team.joinCode}`;

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Navigation />
      <section className="pt-32 pb-8 px-4 bg-primary">
        <div className="container mx-auto max-w-6xl">
          <Link href="/teams" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-3" data-testid="link-back-teams">
            <ArrowLeft className="w-4 h-4" /> All teams
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white">{d.team.name}</h1>
              <p className="text-white/75 mt-1 text-sm">
                {d.members.length} member{d.members.length === 1 ? "" : "s"} · join code{" "}
                <span className="font-mono">{d.team.joinCode}</span>
              </p>
            </div>
            {isCoach && (
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(joinLink);
                  toast({ title: "Join link copied" });
                }}
                data-testid="button-copy-join"
                variant="secondary"
              >
                <Copy className="w-4 h-4 mr-1" /> Copy join link
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Roster
              </h2>
            </div>
            <div className="grid gap-3">
              {d.members.map((m) => (
                <Card key={m.userId} className="p-4" data-testid={`row-member-${m.userId}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{m.name || m.email}</span>
                        <span className="text-[10px] uppercase tracking-wide rounded-full bg-muted px-2 py-0.5">
                          {m.role}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <ChartBar className="w-3 h-3" /> {m.totalRounds} rounds
                        </span>
                        <span>
                          Avg: {m.avgScore == null ? "—" : <span className="font-bold text-foreground">{m.avgScore}</span>}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Flame className="w-3 h-3" /> {m.streakDays}d streak
                        </span>
                        <span>
                          <ClipboardList className="w-3 h-3 inline" /> {m.assignmentsCompleted}/{m.assignmentsAssigned} done
                        </span>
                      </div>
                    </div>
                    {isCoach && m.role !== "coach" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember.mutate(m.userId)}
                        data-testid={`button-remove-${m.userId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {m.recent.length > 0 && (
                    <div className="mt-3 border-t border-border pt-3 grid gap-1">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Recent rounds</div>
                      {m.recent.slice(0, 3).map((r) => (
                        <Link
                          key={r.id}
                          href={isCoach ? `/teams/${teamId}/sessions/${r.id}` : "#"}
                          data-testid={`link-round-${r.id}`}
                        >
                          <div className={`flex items-center justify-between text-sm py-1 ${isCoach ? "hover-elevate active-elevate-2 rounded" : ""}`}>
                            <span className="truncate">
                              <span className="font-medium">{r.topic}</span>{" "}
                              <span className="text-muted-foreground text-xs">{r.format} · {r.side}</span>
                            </span>
                            <span className="text-xs text-muted-foreground">{r.score ?? "—"}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-accent" /> Assignments
              </h2>
              {isCoach && (
                <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-new-assignment">
                      <Plus className="w-4 h-4 mr-1" /> New assignment
                    </Button>
                  </DialogTrigger>
                  <AssignmentDialog
                    teamId={teamId}
                    members={d.members}
                    onClose={() => setAssignOpen(false)}
                  />
                </Dialog>
              )}
            </div>
            {d.assignments.length === 0 ? (
              <Card className="p-6 text-sm text-muted-foreground" data-testid="empty-assignments">
                No assignments yet.
              </Card>
            ) : (
              <div className="grid gap-3">
                {d.assignments.map((a) => (
                  <Card key={a.id} className="p-4" data-testid={`row-assignment-${a.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{a.title}</span>
                          <span className="text-[10px] uppercase tracking-wide rounded-full bg-muted px-2 py-0.5">{a.kind}</span>
                        </div>
                        {a.topic && <div className="text-sm text-muted-foreground mt-1">Topic: {a.topic}</div>}
                        {a.format && <div className="text-xs text-muted-foreground">{a.format}{a.side ? ` · ${a.side}` : ""}</div>}
                        {a.dueDate && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Due {new Date(a.dueDate).toLocaleString(undefined, { month: "short", day: "numeric" })}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        <div className="font-bold text-foreground text-base">
                          {a.completionCount}/{(a.targetUserIds?.length || d.members.filter((m) => m.role !== "coach").length)} done
                        </div>
                        <div>{a.targetUserIds?.length ? `${a.targetUserIds.length} targeted` : "Whole team"}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {isCoach && (
            <Card className="p-5">
              <h3 className="font-display font-bold flex items-center gap-2"><Mail className="w-4 h-4" /> Invite students</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Drop in emails (comma or space separated) — we'll record the invite and you can also share the join code.
              </p>
              <Textarea
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                rows={3}
                placeholder="alice@school.edu, bob@school.edu"
                data-testid="input-invite-emails"
              />
              <Button
                className="mt-2 w-full"
                size="sm"
                onClick={() => invite.mutate()}
                disabled={invite.isPending || !inviteEmails.trim()}
                data-testid="button-send-invites"
              >
                {invite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send invites"}
              </Button>
              {d.invites.length > 0 && (
                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Recent</div>
                  <div className="grid gap-1 max-h-40 overflow-auto">
                    {d.invites.slice(0, 10).map((i) => (
                      <div key={i.id} className="text-xs flex items-center justify-between" data-testid={`invite-${i.id}`}>
                        <span className="truncate">{i.email}</span>
                        <span className="text-muted-foreground">{new Date(i.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-display font-bold">Share join link</h3>
            <p className="text-xs text-muted-foreground mt-1">Anyone with this link can join as a student.</p>
            <div className="mt-2 text-xs font-mono break-all bg-muted p-2 rounded" data-testid="text-join-link">
              {joinLink}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function AssignmentDialog({
  teamId,
  members,
  onClose,
}: {
  teamId: number;
  members: Member[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [kind, setKind] = useState<"topic" | "drill">("topic");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("");
  const [side, setSide] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [targetIds, setTargetIds] = useState<number[]>([]);
  const [allTeam, setAllTeam] = useState(true);

  const create = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/teams/${teamId}/assignments`, {
        kind,
        title: title.trim() || topic.trim() || "Assignment",
        topic: topic.trim() || null,
        format: format || null,
        side: side || null,
        description: description.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        targetUserIds: allTeam ? null : targetIds,
      });
    },
    onSuccess: () => {
      toast({ title: "Assignment created" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
      onClose();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const students = members.filter((m) => m.role !== "coach");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New assignment</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as "topic" | "drill")}>
              <SelectTrigger data-testid="select-kind"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="topic">Topic prep</SelectItem>
                <SelectItem value="drill">Drill round</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Format</Label>
            <Select value={format || "any"} onValueChange={(v) => setFormat(v === "any" ? "" : v)}>
              <SelectTrigger data-testid="select-format"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="LD">LD</SelectItem>
                <SelectItem value="PF">PF</SelectItem>
                <SelectItem value="Policy">Policy</SelectItem>
                <SelectItem value="Parli">Parli</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Prep AC for Friday" data-testid="input-title" />
        </div>
        <div>
          <Label>Topic</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Resolved: Universal basic income…" data-testid="input-topic" />
        </div>
        <div>
          <Label>Side</Label>
          <Select value={side || "any"} onValueChange={(v) => setSide(v === "any" ? "" : v)}>
            <SelectTrigger data-testid="select-side"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Either</SelectItem>
              <SelectItem value="Aff">Aff</SelectItem>
              <SelectItem value="Neg">Neg</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} data-testid="input-description" />
        </div>
        <div>
          <Label>Due date (optional)</Label>
          <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="input-due" />
        </div>
        <div>
          <Label className="flex items-center gap-2">
            <Checkbox checked={allTeam} onCheckedChange={(v) => setAllTeam(!!v)} data-testid="checkbox-all-team" />
            Assign to whole team
          </Label>
          {!allTeam && (
            <div className="grid gap-1 mt-2 max-h-40 overflow-auto border border-border rounded p-2">
              {students.map((s) => (
                <label key={s.userId} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={targetIds.includes(s.userId)}
                    onCheckedChange={(v) => {
                      setTargetIds((prev) =>
                        v ? [...prev, s.userId] : prev.filter((id) => id !== s.userId),
                      );
                    }}
                    data-testid={`checkbox-target-${s.userId}`}
                  />
                  {s.name || s.email}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending} data-testid="button-create-assignment">
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
