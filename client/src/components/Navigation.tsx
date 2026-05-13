import { useState, useEffect } from "react";
import { Menu, X, Sun, Moon, Monitor, LogIn, LogOut, Mic, Library, History as HistoryIcon, Tag, Crown, Search, LayoutDashboard, CalendarDays, Trophy, Zap, Users } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentSubscription } from "@/lib/plan";
import { useQuery } from "@tanstack/react-query";

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme, resolved } = useTheme();
  const [location, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const onHome = location === "/";
  const { plan, subscription } = useCurrentSubscription();
  const onPaidPlan = subscription?.status === "active" && plan.id !== "free";
  const sessionAuth = useQuery<{ email: string | null; signedIn: boolean }>({
    queryKey: ["/api/auth/session"],
  });
  const signedIn = !!sessionAuth.data?.signedIn;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    if (!onHome) {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 80);
      setMobileMenuOpen(false);
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  const isDarkHero = !isScrolled && resolved === "light";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-md shadow-md py-3 border-b border-border/40"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          data-testid="button-logo-home"
          className="flex items-center gap-2.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
          onClick={() => scrollToSection("home")}
          aria-label="DebateMastery home"
        >
          <LogoMark size={36} />
          <span
            className={`text-xl font-bold font-display tracking-tight leading-none ${
              isDarkHero ? "text-white" : "text-primary"
            }`}
          >
            Debate<span className="text-accent">Mastery</span>
          </span>
        </button>

        {/* Desktop Links */}
        <div className="hidden xl:flex items-center gap-3">
          {/* In-page marketing anchors — only show on the home page to avoid clutter on app pages */}
          {onHome &&
            ["About", "Services", "How It Works", "FAQ"].map((item) => (
              <button
                key={item}
                onClick={() =>
                  scrollToSection(item.toLowerCase().replace(/ /g, "-"))
                }
                data-testid={`nav-link-${item.toLowerCase().replace(/ /g, "-")}`}
                className={`text-sm font-medium hover:text-accent transition-colors whitespace-nowrap ${
                  isDarkHero
                    ? "text-white/90 hover:text-white"
                    : "text-foreground/80 hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}

          <Link
            href="/topics"
            data-testid="nav-link-topics"
            className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors whitespace-nowrap ${
              isDarkHero
                ? "text-white/90 hover:text-white"
                : "text-foreground/80 hover:text-foreground"
            }`}
          >
            <Library className="w-3.5 h-3.5" /> Topics
          </Link>

          <Link
            href="/research"
            data-testid="nav-link-research"
            className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
              isDarkHero
                ? "text-white/90 hover:text-white"
                : "text-foreground/80 hover:text-foreground"
            }`}
          >
            <Search className="w-3.5 h-3.5" /> Research
          </Link>

          <Link
            href="/drills"
            data-testid="nav-link-drills"
            className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
              isDarkHero
                ? "text-white/90 hover:text-white"
                : "text-foreground/80 hover:text-foreground"
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Drills
          </Link>

          <Link
            href="/dashboard"
            data-testid="nav-link-dashboard"
            className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
              isDarkHero
                ? "text-white/90 hover:text-white"
                : "text-foreground/80 hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </Link>

          <Link
            href="/practice"
            data-testid="nav-link-practice-bot"
            className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors whitespace-nowrap ${
              isDarkHero
                ? "text-white hover:text-accent"
                : "text-accent hover:text-accent/80"
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> Practice
          </Link>

          {signedIn && (
            <Link
              href="/teams"
              data-testid="nav-link-teams"
              className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                isDarkHero
                  ? "text-white/90 hover:text-white"
                  : "text-foreground/80 hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Teams
            </Link>
          )}

          {signedIn && (
            <Link
              href="/history"
              data-testid="nav-link-history"
              className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                isDarkHero
                  ? "text-white/90 hover:text-white"
                  : "text-foreground/80 hover:text-foreground"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" /> My Practice
            </Link>
          )}

          <Link
            href="/pricing"
            data-testid="nav-link-pricing"
            className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
              isDarkHero
                ? "text-white/90 hover:text-white"
                : "text-foreground/80 hover:text-foreground"
            }`}
          >
            <Tag className="w-3.5 h-3.5" /> Pricing
          </Link>
          {/* Theme Toggle */}
          <div className="flex items-center gap-1 rounded-full bg-muted p-1 border border-border">
            <button
              onClick={() => setTheme("light")}
              className={`p-1.5 rounded-full transition-colors ${
                theme === "light" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Light mode"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`p-1.5 rounded-full transition-colors ${
                theme === "dark" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Dark mode"
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`p-1.5 rounded-full transition-colors ${
                theme === "system" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="System theme"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>

          {user ? (
            <button
              onClick={() => signOut.mutate()}
              data-testid="button-signout"
              className={`text-sm font-medium hover:text-accent transition-colors flex items-center gap-1.5 ${
                isDarkHero ? "text-white/90 hover:text-white" : "text-foreground/80 hover:text-foreground"
              }`}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          ) : (
            <Link
              href="/signin"
              data-testid="link-signin"
              className={`text-sm font-medium hover:text-accent transition-colors flex items-center gap-1.5 ${
                isDarkHero ? "text-white/90 hover:text-white" : "text-foreground/80 hover:text-foreground"
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Link>
          )}

          <Button
            data-testid="button-start-free"
            onClick={() => scrollToSection("contact")}
            className={
              isDarkHero
                ? "bg-accent text-white hover:bg-accent/90 shadow-lg shadow-black/20"
                : "bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20"
            }
          >
            Start Free
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="xl:hidden flex items-center gap-2">
          <button
            onClick={() =>
              setTheme(resolved === "light" ? "dark" : "light")
            }
            className="p-2 rounded-lg text-foreground"
            aria-label="Toggle theme"
          >
            {resolved === "light" ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>
          <button
            data-testid="button-mobile-menu"
            className="p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X />
            ) : (
              <Menu className={isScrolled ? "text-primary" : "text-primary"} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-5 max-h-[85vh] overflow-y-auto">
          {[
            "Home",
            "About",
            "Services",
            "How It Works",
            "Testimonials",
            "FAQ",
            "Contact",
          ].map((item) => (
            <button
              data-testid={`button-nav-${item
                .toLowerCase()
                .replace(/ /g, "-")}`}
              key={item}
              onClick={() =>
                scrollToSection(item.toLowerCase().replace(/ /g, "-"))
              }
              className="text-left text-lg font-medium text-foreground py-2 border-b border-border/50 last:border-0"
            >
              {item}
            </button>
          ))}
          <Link
            href="/topics"
            data-testid="button-nav-topics"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 text-left text-lg font-semibold text-foreground py-2 border-b border-border/50"
          >
            <Library className="w-4 h-4" /> Topics
          </Link>
          <Link
            href="/research"
            data-testid="button-nav-research"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 text-left text-lg font-semibold text-foreground py-2 border-b border-border/50"
          >
            <Search className="w-4 h-4" /> Research a Topic
          </Link>
          <Link
            href="/drills"
            data-testid="button-nav-drills"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 text-left text-lg font-semibold text-foreground py-2 border-b border-border/50"
          >
            <Zap className="w-4 h-4" /> Drills
          </Link>
          <Link
            href="/dashboard"
            data-testid="button-nav-dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 text-left text-lg font-semibold text-foreground py-2 border-b border-border/50"
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          <Link
            href="/practice"
            data-testid="button-nav-practice-bot"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 text-left text-lg font-semibold text-accent py-2 border-b border-border/50"
          >
            <Mic className="w-4 h-4" /> Practice Bot
          </Link>
          {signedIn && (
            <Link
              href="/history"
              data-testid="button-nav-history"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-left text-lg font-semibold text-foreground py-2 border-b border-border/50"
            >
              <Trophy className="w-4 h-4" /> My Practice
            </Link>
          )}
          <Link
            href="/pricing"
            data-testid="button-nav-pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 text-left text-lg font-medium text-foreground py-2 border-b border-border/50"
          >
            <Tag className="w-4 h-4" /> Pricing
            {onPaidPlan && (
              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider">
                <Crown className="w-3 h-3" /> {plan.name}
              </span>
            )}
          </Link>
          <Link
            href="/coaches"
            data-testid="button-nav-coaches"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 text-left text-lg font-semibold text-foreground py-2 border-b border-border/50"
          >
            <CalendarDays className="w-4 h-4" /> Book a Coach
          </Link>
          {user ? (
            <button
              onClick={() => { setMobileMenuOpen(false); signOut.mutate(); }}
              data-testid="button-mobile-signout"
              className="w-full mt-2 inline-flex items-center justify-center h-10 rounded-md border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          ) : (
            <Link
              href="/signin"
              data-testid="link-mobile-signin"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full mt-2 inline-flex items-center justify-center h-10 rounded-md border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Link>
          )}
          <Button
            data-testid="button-book-session"
            className="w-full bg-accent text-white shadow-lg shadow-accent/25"
            onClick={() => scrollToSection("contact")}
          >
            Start Practicing Free
          </Button>
        </div>
      )}
    </nav>
  );
}
