import { useState, useEffect } from "react";
import { Menu, X, GraduationCap, Sun, Moon, Monitor, LogIn, LogOut, Mic, Library, History as HistoryIcon, Tag, Crown, Search, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentSubscription } from "@/lib/plan";

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme, resolved } = useTheme();
  const [location, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const onHome = location === "/";
  const { plan, subscription } = useCurrentSubscription();
  const onPaidPlan = subscription?.status === "active" && plan.id !== "free";

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
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => scrollToSection("home")}
        >
          <div className="bg-primary/10 p-2 rounded-lg">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <span
            className={`text-xl font-bold font-display ${
              isDarkHero ? "text-white" : "text-primary"
            }`}
          >
            DebateMastery
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          {["About", "Services", "Formats", "Tournaments", "How It Works", "Testimonials", "FAQ"].map(
            (item) => (
              <button
                key={item}
                onClick={() =>
                  scrollToSection(item.toLowerCase().replace(/ /g, "-"))
                }
                data-testid={`nav-link-${item.toLowerCase().replace(/ /g, "-")}`}
                className={`text-sm font-medium hover:text-accent transition-colors ${
                  isDarkHero
                    ? "text-white/90 hover:text-white"
                    : "text-foreground/80 hover:text-foreground"
                }`}
              >
                {item}
              </button>
            )
          )}

          <Link
            href="/dashboard"
            data-testid="nav-link-dashboard"
            className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
              isDarkHero
                ? "text-white/90 hover:text-white"
                : "text-foreground/80 hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </Link>

          <Link
            href="/topics"
            data-testid="nav-link-topics"
            className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
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
            className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
              isDarkHero
                ? "text-white/90 hover:text-white"
                : "text-foreground/80 hover:text-foreground"
            }`}
          >
            <Search className="w-3.5 h-3.5" /> Research
          </Link>

          <Link
            href="/dashboard"
            data-testid="nav-link-dashboard"
            className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
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
            className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
              isDarkHero
                ? "text-white hover:text-accent"
                : "text-accent hover:text-accent/80"
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> Practice Bot
          </Link>

          <Link
            href="/pricing"
            data-testid="nav-link-pricing"
            className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
              isDarkHero
                ? "text-white/90 hover:text-white"
                : "text-foreground/80 hover:text-foreground"
            }`}
          >
            <Tag className="w-3.5 h-3.5" /> Pricing
          </Link>

          {onPaidPlan && (
            <Link
              href="/pricing"
              data-testid="nav-plan-badge"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/10 text-accent text-[11px] font-bold uppercase tracking-wider hover:bg-accent/15 transition-colors"
            >
              <Crown className="w-3 h-3" /> {plan.name}
            </Link>
          )}

          {user && (
            <Link
              href="/history"
              data-testid="nav-link-history"
              className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isDarkHero
                  ? "text-white/90 hover:text-white"
                  : "text-foreground/80 hover:text-foreground"
              }`}
            >
              <HistoryIcon className="w-3.5 h-3.5" /> My History
            </Link>
          )}

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
        <div className="md:hidden flex items-center gap-2">
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
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-5">
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
            href="/dashboard"
            data-testid="button-nav-dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 text-left text-lg font-semibold text-foreground py-2 border-b border-border/50"
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
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
          {user && (
            <Link
              href="/history"
              data-testid="button-nav-history"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-left text-lg font-medium text-foreground py-2 border-b border-border/50"
            >
              <HistoryIcon className="w-4 h-4" /> My History
            </Link>
          )}
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
