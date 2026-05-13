import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type Mode = "signin" | "signup";

export default function SignIn() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();
  const [, navigate] = useLocation();

  const pending = signIn.isPending || signUp.isPending;


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === "signup" && !name)) {
      toast({ title: "Missing info", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    try {
      if (mode === "signin") {
        await signIn.mutateAsync({ email, password });
        toast({ title: "Welcome back", description: "You're signed in." });
      } else {
        if (password.length < 6) {
          toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
          return;
        }
        await signUp.mutateAsync({ email, password, name });
        toast({
          title: "Account created",
          description: "Your practice rounds will now be saved and shared clips won't expire.",
        });
      }
      navigate("/practice");
    } catch (err: any) {
      const msg = String(err?.message || "");
      const friendly = msg.includes("409")
        ? "An account with this email already exists."
        : msg.includes("401")
        ? "Incorrect email or password."
        : "Something went wrong. Please try again.";
      toast({ title: "Sign-in failed", description: friendly, variant: "destructive" });
    }
  };

  const googleSignIn = () => {
    toast({
      title: "Google sign-in coming soon",
      description: "For now, please continue with email.",
    });
  };

  return (
    <div className="min-h-screen bg-background font-body text-foreground flex flex-col lg:flex-row">
      <div className="lg:w-1/2 bg-primary text-white relative overflow-hidden hidden lg:flex flex-col justify-between p-12">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-accent/20 rounded-full blur-3xl orb orb-delay-1" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl orb orb-delay-2" />
        </div>

        <Link href="/" data-testid="link-home-logo">
          <span className="relative z-10 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <GraduationCap className="w-8 h-8" />
            <span className="text-2xl font-bold font-display">DebateMastery</span>
          </span>
        </Link>

        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium tracking-wide uppercase">AI-Powered Coaching</span>
          </div>
          <h1 className="text-4xl xl:text-5xl font-display font-bold mb-6 leading-tight">
            Save every round. <span className="gradient-text">Track your growth.</span>
          </h1>
          <p className="text-white/80 text-lg leading-relaxed mb-8">
            Sign in to save your practice rounds, revisit feedback, and watch your scores climb across every tournament you prep for.
          </p>

          <div className="space-y-3 text-white/80">
            {[
              "Save transcripts and feedback for every round",
              "Revisit past speeches and replay your best ones",
              "Practice anonymously anytime — sign-in is optional",
            ].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-sm">{s}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} DebateMastery
        </p>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <Link href="/" data-testid="link-mobile-logo">
            <span className="lg:hidden flex items-center gap-2 mb-8 text-primary cursor-pointer">
              <GraduationCap className="w-7 h-7" />
              <span className="text-xl font-bold font-display">DebateMastery</span>
            </span>
          </Link>

          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary mb-2">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {mode === "signin"
              ? "Sign in to see your saved practice rounds."
              : "Create a free account to save your practice rounds and track progress."}
          </p>

          <button
            onClick={googleSignIn}
            data-testid="button-google-signin"
            className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-foreground"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path fill="#EA4335" d="M12 5c1.6 0 3 .55 4.1 1.6l3-3C17.2 1.6 14.8.5 12 .5 7.3.5 3.3 3.2 1.4 7.1l3.5 2.7C5.8 7 8.7 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.7-2.4 3.5l3.7 2.9c2.2-2 3.7-5 3.7-8.5z" />
              <path fill="#FBBC05" d="M4.9 14.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2L1.4 7.1C.5 8.6 0 10.3 0 12s.5 3.4 1.4 4.9l3.5-2.7z" />
              <path fill="#34A853" d="M12 23.5c3.2 0 5.9-1.1 7.8-2.9l-3.7-2.9c-1 .7-2.4 1.1-4.1 1.1-3.3 0-6.2-2-7.1-4.8L1.4 16.9C3.3 20.8 7.3 23.5 12 23.5z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Debater"
                  autoComplete="name"
                  data-testid="input-name"
                  className="w-full h-12 px-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  data-testid="input-email"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  data-testid="input-password"
                  className="w-full h-12 pl-11 pr-11 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  data-testid="button-toggle-password"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={pending}
              data-testid="button-submit"
              className="w-full h-12 rounded-xl bg-accent text-white hover:bg-accent/90 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "signin" ? "New here? " : "Already have an account? "}
            <button
              onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
              data-testid="button-toggle-mode"
              className="text-accent font-semibold hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>

          <p className="text-center text-sm text-muted-foreground mt-4">
            <Link href="/practice" data-testid="link-practice-anonymous" className="hover:underline">
              Or continue without an account →
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground mt-8">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
