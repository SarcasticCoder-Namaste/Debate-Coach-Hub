import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Menu, X, GraduationCap, Sun, Moon, Monitor, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme, resolved } = useTheme();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
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
            href="/signin"
            data-testid="link-mobile-signin"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full mt-2 inline-flex items-center justify-center h-10 rounded-md border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Sign In
          </Link>
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
