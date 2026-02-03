import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Menu, X, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
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

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-md py-3"
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
          <span className={`text-xl font-bold font-display ${isScrolled ? "text-primary" : "text-primary md:text-white"}`}>
            DebateMastery
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {["About", "Services", "Testimonials"].map((item) => (
            <button
              key={item}
              onClick={() => scrollToSection(item.toLowerCase())}
              className={`text-sm font-medium hover:text-accent transition-colors ${
                isScrolled ? "text-foreground" : "text-white/90 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
          <Button
            onClick={() => scrollToSection("contact")}
            className={
              isScrolled 
                ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" 
                : "bg-white text-primary hover:bg-white/90 shadow-lg"
            }
          >
            Free Consultation
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu className={isScrolled ? "text-primary" : "text-primary"} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-border shadow-xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-5">
          {["Home", "About", "Services", "Testimonials", "Contact"].map((item) => (
            <button
              key={item}
              onClick={() => scrollToSection(item.toLowerCase())}
              className="text-left text-lg font-medium text-foreground py-2 border-b border-border/50 last:border-0"
            >
              {item}
            </button>
          ))}
          <Button 
            className="w-full mt-2 bg-primary text-white shadow-lg shadow-primary/25"
            onClick={() => scrollToSection("contact")}
          >
            Book a Session
          </Button>
        </div>
      )}
    </nav>
  );
}
