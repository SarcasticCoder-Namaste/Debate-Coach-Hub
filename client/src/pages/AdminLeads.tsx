import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@shared/schema";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

type LeadWithCoach = Lead & { coachName: string };

const TOKEN_KEY = "dm.adminToken";

async function adminFetch(url: string, init: RequestInit, token: string) {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      "Content-Type": "application/json",
      "x-admin-token": token,
    },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res;
}

export default function AdminLeads() {
  const { toast } = useToast();
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) || "");
  const [tokenInput, setTokenInput] = useState("");
  const [authed, setAuthed] = useState<boolean>(!!token);

  const { data: leads = [], isLoading, error, refetch } = useQuery<LeadWithCoach[]>({
    queryKey: ["/api/admin/leads"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/leads", { method: "GET" }, token);
      return await res.json();
    },
    enabled: authed && !!token,
    retry: false,
  });

  useEffect(() => {
    if (error?.message === "Unauthorized") {
      setAuthed(false);
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [error]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status?: LeadStatus; notes?: string }) => {
      const res = await adminFetch(
        `/api/admin/leads/${id}`,
        { method: "PATCH", body: JSON.stringify({ status, notes }) },
        token,
      );
      return (await res.json()) as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
    },
    onError: (e: any) => {
      toast({ title: "Update failed", description: e?.message || "Try again", variant: "destructive" });
    },
  });

  function tryLogin(e: React.FormEvent) {
    e.preventDefault();
    setToken(tokenInput.trim());
    localStorage.setItem(TOKEN_KEY, tokenInput.trim());
    setAuthed(true);
    setTokenInput("");
    setTimeout(() => refetch(), 0);
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-background font-body text-foreground" data-testid="page-admin-login">
        <Navigation />
        <section className="container mx-auto max-w-md px-4 pt-32 pb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-accent" />
              <h1 className="font-display text-xl font-bold text-primary">Admin sign-in</h1>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enter the admin token to view coaching leads. Default token for the demo is
              {" "}<code className="px-1.5 py-0.5 bg-muted rounded text-xs">demo-admin</code>.
            </p>
            <form onSubmit={tryLogin} className="space-y-3">
              <input
                data-testid="input-admin-token"
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Admin token"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="submit" data-testid="button-admin-signin" className="w-full bg-primary">
                Sign in
              </Button>
            </form>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground" data-testid="page-admin-leads">
      <Navigation />
      <section className="container mx-auto max-w-6xl px-4 pt-32 pb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-2">
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
            <h1 className="font-display text-2xl font-bold text-primary">Coaching leads</h1>
            <p className="text-sm text-muted-foreground">
              {leads.length} {leads.length === 1 ? "lead" : "leads"} in the queue
            </p>
          </div>
          <Button
            variant="outline"
            data-testid="button-admin-signout"
            onClick={() => {
              localStorage.removeItem(TOKEN_KEY);
              setToken("");
              setAuthed(false);
            }}
          >
            Sign out
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading leads…
          </div>
        ) : leads.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground" data-testid="text-no-leads">
            No leads yet. New booking requests will appear here.
          </Card>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} onUpdate={updateStatus.mutate} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function statusVariant(s: string): "default" | "secondary" | "outline" {
  if (s === "Booked") return "default";
  if (s === "Closed") return "outline";
  return "secondary";
}

function LeadRow({
  lead,
  onUpdate,
}: {
  lead: LeadWithCoach;
  onUpdate: (v: { id: number; status?: LeadStatus; notes?: string }) => void;
}) {
  const [notes, setNotes] = useState(lead.notes || "");
  const [open, setOpen] = useState(false);

  return (
    <Card className="p-5" data-testid={`row-lead-${lead.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-bold text-primary" data-testid={`text-lead-name-${lead.id}`}>
              {lead.studentName}
            </h3>
            <Badge variant={statusVariant(lead.status)} data-testid={`badge-status-${lead.id}`}>
              {lead.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {lead.email} · {lead.format} · {lead.durationMin} min · {lead.slot}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Coach: <span className="font-semibold text-foreground">{lead.coachName}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {LEAD_STATUSES.map((s) => (
            <button
              key={s}
              data-testid={`button-set-status-${s}-${lead.id}`}
              onClick={() => onUpdate({ id: lead.id, status: s })}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                lead.status === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        data-testid={`button-toggle-details-${lead.id}`}
        className="text-xs font-semibold text-primary mt-3 hover:underline"
      >
        {open ? "Hide" : "Show"} goals & notes
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Goals</p>
            <p className="text-sm whitespace-pre-wrap text-foreground/90">{lead.goals}</p>
            {lead.sessionLink && (
              <a
                href={lead.sessionLink}
                target="_blank"
                rel="noreferrer"
                data-testid={`link-session-${lead.id}`}
                className="text-xs text-accent hover:underline mt-1 inline-block"
              >
                Practice round: {lead.sessionLink}
              </a>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Internal notes</p>
            <textarea
              data-testid={`input-notes-${lead.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              size="sm"
              data-testid={`button-save-notes-${lead.id}`}
              onClick={() => onUpdate({ id: lead.id, notes })}
              className="mt-2 bg-primary"
            >
              Save notes
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
