import { useEffect } from "react";
import { Link, Redirect, useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Users } from "lucide-react";

export default function TeamJoin() {
  const [, params] = useRoute<{ code: string }>("/teams/join/:code");
  const code = params?.code || "";
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const teamQ = useQuery<{ team: { id: number; name: string; joinCode: string } }>({
    queryKey: ["/api/teams/join", code],
    enabled: !!code,
  });

  const join = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/teams/join/${code}`);
      return r.json();
    },
    onSuccess: (d: any) => {
      toast({ title: `Joined ${d?.team?.name ?? "team"}` });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my/assignments"] });
      navigate(`/teams/${d?.team?.id ?? ""}`);
    },
    onError: (e: any) => toast({ title: "Could not join", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Navigation />
      <section className="pt-32 px-4">
        <div className="container mx-auto max-w-md">
          <Card className="p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-primary" />
            </div>
            {teamQ.isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : teamQ.data ? (
              <>
                <h1 className="text-xl font-display font-bold">Join {teamQ.data.team.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  You'll be added as a student. Your coach will see your practice rounds and assignments.
                </p>
                <Button
                  className="mt-4 w-full"
                  onClick={() => join.mutate()}
                  disabled={join.isPending}
                  data-testid="button-confirm-join"
                >
                  {join.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join team"}
                </Button>
                <Link href="/teams" className="block text-xs text-muted-foreground mt-3 hover:underline">
                  Cancel
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Invalid join code.</p>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
