import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertLeadSchema, type Coach, type Lead } from "@shared/schema";
import { z } from "zod";
import {
  ArrowLeft, CalendarDays, CheckCircle2, Clock3, GraduationCap,
  Loader2, Sparkles,
} from "lucide-react";

type Stage = "browse" | "intake" | "done";

const formSchema = insertLeadSchema;
type FormValues = z.infer<typeof formSchema>;

export default function Coaches() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Coach | null>(null);
  const [slot, setSlot] = useState<string>("");
  const [duration, setDuration] = useState<30 | 60>(30);
  const [stage, setStage] = useState<Stage>("browse");
  const [confirmedLead, setConfirmedLead] = useState<Lead | null>(null);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const prefillFormat = params.get("format") || "";
  const prefillScore = params.get("score");

  const { data: coaches = [], isLoading } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
  });

  const [form, setForm] = useState({
    studentName: "",
    email: "",
    format: prefillFormat || "LD",
    goals: prefillScore
      ? `Just finished a practice round and scored ${prefillScore}/10 — want help leveling up.`
      : "",
    sessionLink: "",
  });

  useEffect(() => {
    if (selected && !selected.formats.includes(form.format)) {
      setForm((f) => ({ ...f, format: selected.formats[0] }));
    }
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const createLead = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest("POST", "/api/leads", values);
      return (await res.json()) as Lead;
    },
    onSuccess: (lead) => {
      setConfirmedLead(lead);
      setStage("done");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
    },
    onError: (e: any) => {
      toast({
        title: "Couldn't book that slot",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  function startBooking(coach: Coach) {
    setSelected(coach);
    setSlot(coach.availability[0] ?? "");
    setStage("intake");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }

  function submitIntake(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !slot) return;
    const payload: FormValues = {
      coachId: selected.id,
      studentName: form.studentName.trim(),
      email: form.email.trim(),
      format: form.format,
      slot,
      durationMin: duration,
      goals: form.goals.trim(),
      sessionLink: form.sessionLink.trim() || undefined,
    };
    const parsed = formSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.errors[0]?.message || "Please fill out the form";
      toast({ title: "Check your details", description: first, variant: "destructive" });
      return;
    }
    createLead.mutate(parsed.data);
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground" data-testid="page-coaches">
      <Navigation />

      <section className="relative pt-32 pb-10 px-4 overflow-hidden bg-primary">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb orb-delay-1 absolute -top-24 -right-24 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px]" />
          <div className="orb orb-delay-2 absolute -bottom-20 left-1/4 w-[400px] h-[400px] bg-white/[0.05] rounded-full blur-[90px]" />
        </div>
        <div className="container relative z-10 mx-auto max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors"
            data-testid="link-back-home"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-medium mb-3">
            <GraduationCap className="w-3.5 h-3.5 text-accent" /> Book A Coach
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight">
            Practiced With AI? <span className="gradient-text">Now Train With A Human.</span>
          </h1>
          <p className="text-white/75 mt-3 max-w-2xl">
            Pick a coach who matches your format, choose a slot, and tell us what you want to work
            on. We'll confirm by email within 24 hours.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-10">
        {stage === "done" && confirmedLead && selected && (
          <Card className="p-8 text-center border-accent/40" data-testid="card-confirmation">
            <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-accent" />
            </div>
            <h2 className="font-display text-2xl font-bold text-primary mb-2">
              Request sent!
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {selected.name} will email <span className="font-semibold text-foreground">{confirmedLead.email}</span> within
              24 hours to confirm <span className="font-semibold text-foreground">{confirmedLead.slot}</span> ({confirmedLead.durationMin}-min {confirmedLead.format}).
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <Link href="/practice" data-testid="link-back-to-practice">
                <Button variant="outline">Back to practice</Button>
              </Link>
              <Button
                data-testid="button-book-another"
                onClick={() => {
                  setStage("browse");
                  setSelected(null);
                  setConfirmedLead(null);
                }}
                className="bg-primary"
              >
                Book another session
              </Button>
            </div>
          </Card>
        )}

        {stage === "intake" && selected && (
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="p-6 lg:col-span-1" data-testid="card-coach-summary">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={selected.photoUrl}
                  alt={selected.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-accent/40"
                />
                <div>
                  <h3 className="font-display font-bold text-primary">{selected.name}</h3>
                  <p className="text-xs text-muted-foreground">${selected.pricePerHour}/hr</p>
                </div>
              </div>
              <p className="text-sm text-foreground/80 mb-4">{selected.bio}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selected.specialties.map((s) => (
                  <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                ))}
              </div>
              <button
                onClick={() => setStage("browse")}
                data-testid="button-change-coach"
                className="text-xs text-primary font-semibold hover:underline"
              >
                ← Pick a different coach
              </button>
            </Card>

            <Card className="p-6 lg:col-span-2">
              <h2 className="font-display text-xl font-bold text-primary mb-4">Tell us about your session</h2>
              <form onSubmit={submitIntake} className="space-y-4" data-testid="form-intake">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Your name</label>
                    <input
                      data-testid="input-name"
                      value={form.studentName}
                      onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Email</label>
                    <input
                      data-testid="input-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Format</label>
                  <div className="flex flex-wrap gap-2">
                    {selected.formats.map((f) => (
                      <button
                        type="button"
                        key={f}
                        data-testid={`button-format-${f}`}
                        onClick={() => setForm({ ...form, format: f })}
                        className={`px-4 py-2 rounded-md text-sm font-semibold border transition-all ${
                          form.format === f
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Session length</label>
                  <div className="flex gap-2">
                    {([30, 60] as const).map((d) => (
                      <button
                        type="button"
                        key={d}
                        data-testid={`button-duration-${d}`}
                        onClick={() => setDuration(d)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold border transition-all ${
                          duration === d
                            ? "bg-accent text-accent-foreground border-accent"
                            : "bg-background border-border hover:border-accent"
                        }`}
                      >
                        <Clock3 className="w-3.5 h-3.5" /> {d} min
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Pick a slot</label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {selected.availability.map((s) => (
                      <button
                        type="button"
                        key={s}
                        data-testid={`button-slot-${s.replace(/\W+/g, "-")}`}
                        onClick={() => setSlot(s)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm border text-left transition-all ${
                          slot === s
                            ? "bg-primary/10 border-primary text-primary font-semibold"
                            : "bg-background border-border hover:border-primary/60"
                        }`}
                      >
                        <CalendarDays className="w-4 h-4 flex-shrink-0" /> {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">What do you want to work on?</label>
                  <textarea
                    data-testid="input-goals"
                    value={form.goals}
                    onChange={(e) => setForm({ ...form, goals: e.target.value })}
                    rows={3}
                    placeholder="e.g. Sharpen my framework, drill 1AR efficiency, prep for state quals…"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Link to a recent practice round (optional)</label>
                  <input
                    data-testid="input-session-link"
                    value={form.sessionLink}
                    onChange={(e) => setForm({ ...form, sessionLink: e.target.value })}
                    placeholder="https://…"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    Estimated cost: <span className="font-semibold text-foreground">${(selected.pricePerHour * duration) / 60}</span>
                  </p>
                  <Button
                    type="submit"
                    data-testid="button-submit-booking"
                    disabled={createLead.isPending || !slot}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {createLead.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Request booking</>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {stage === "browse" && (
          <>
            <h2 className="font-display text-2xl font-bold text-primary mb-6">Choose your coach</h2>
            {isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading coaches…
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-5">
              {coaches.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Card className="p-6 h-full hover:shadow-lg transition-shadow" data-testid={`card-coach-${c.id}`}>
                    <div className="flex items-start gap-4 mb-4">
                      <img
                        src={c.photoUrl}
                        alt={c.name}
                        data-testid={`img-coach-${c.id}`}
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-accent/30 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="font-display text-lg font-bold text-primary" data-testid={`text-coach-name-${c.id}`}>{c.name}</h3>
                        <p className="text-xs text-muted-foreground" data-testid={`text-coach-price-${c.id}`}>
                          ${c.pricePerHour}/hr · {c.formats.join(" · ")}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/80 mb-4">{c.bio}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {c.specialties.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" /> {c.availability.length} slots open
                      </span>
                    </div>
                    <Button
                      onClick={() => startBooking(c)}
                      data-testid={`button-book-coach-${c.id}`}
                      className="w-full bg-primary"
                    >
                      Book {c.name.split(" ")[0]}
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
