import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Mode = "signin" | "signup";

export default function SignIn() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const { toast } = useToast();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === "signup" && !name)) {
      toast({ title: "Missing info", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    toast({
      title: "Accounts coming soon",
      description: "Sign-in is in setup. Book a free consult below to get early access.",
    });
  };

  const googleSignIn = () => {
    toast({
      title: "Google sign-in coming soon",
      description: "We're finalizing Google sign-in. Use email or book a free consult for early access.",
    });
  };

  return (
    <div className="min-h-screen bg-background font-body text-foreground flex flex-col lg:flex-row">
      {/* Left side — branded panel */}
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
            Practice rounds that <span className="gradient-text">actually push you.</span>
          </h1>
          <p className="text-white/80 text-lg leading-relaxed mb-8">
            Sign in to launch live AI debate rounds, save your research, and track your progress across every tournament you prep for.
          </p>

          <div className="space-y-3 text-white/80">
            {[
              "12,000+ practice rounds completed",
              "98% of students recommend us",
              "Available 24/7 — no scheduling needed",
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

      {/* Right side — form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
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
              ? "Sign in to continue your debate practice."
              : "Start practicing in under a minute. No card required."}
          </p>

          {/* Google */}
          <button
            onClick={googleSignIn}
            data-testid="button-google-signin"
            className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-medium text-foreground"
          >
            <SiGoogle className="w-5 h-5 text-[#EA4335]" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email form */}
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
                {mode === "signin" && (
                  <button
                    type="button"
                    data-testid="button-forgot-password"
                    className="text-xs text-accent hover:underline"
                    onClick={() =>
                      toast({ title: "Reset link sent", description: "Check your inbox if an account exists." })
                    }
                  >
                    Forgot?
                  </button>
                )}
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
              data-testid="button-submit"
              className="w-full h-12 rounded-xl bg-accent text-white hover:bg-accent/90 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5"
            >
              {mode === "signin" ? "Sign in" : "Create account"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Mode toggle */}
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

          <p className="text-center text-xs text-muted-foreground mt-8">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
