import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { motion, useInView, useMotionValue, useTransform, animate, useScroll, useSpring } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { ServiceCard } from "@/components/ServiceCard";
import { ContactForm } from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  Users, Trophy, Mic, Quote, CheckCircle2, Calendar, ArrowRight,
  GraduationCap, BookOpen, FileText, MessageSquare, Award, Star,
  ShieldCheck, Clock3, ArrowUp, Search, Target, Zap,
  Megaphone, Gavel, Scale, CalendarDays, MapPin,
  Mail, Send, Sparkles, Heart, Lightbulb, Compass
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  AnimatedCounter                                                    */
/* ------------------------------------------------------------------ */
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, value, { duration: 2, ease: "easeOut" });
      return controls.stop;
    }
  }, [isInView, value, count]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

/* ------------------------------------------------------------------ */
/*  Reusable motion wrappers                                         */
/* ------------------------------------------------------------------ */
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: (delay = 0) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: (delay = 0) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (delay = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const staggerChild = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

/* ------------------------------------------------------------------ */
/*  Newsletter Form                                                    */
/* ------------------------------------------------------------------ */
function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success">("idle");

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (email) {
            setStatus("success");
            setEmail("");
          }
        }}
        className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
      >
        <input
          type="email"
          name="newsletter-email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address"
          data-testid="input-newsletter-email"
          className="flex-1 px-4 py-3 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
        />
        <button
          type="submit"
          data-testid="button-newsletter-submit"
          className="px-6 py-3 rounded-full bg-accent text-white font-semibold hover:bg-accent/90 transition-all hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
        >
          Subscribe <Send className="w-4 h-4" />
        </button>
      </form>
      <p
        role="status"
        aria-live="polite"
        data-testid="text-newsletter-status"
        className={`mt-4 text-sm font-medium transition-opacity ${
          status === "success" ? "text-accent opacity-100" : "opacity-0 h-0"
        }`}
      >
        {status === "success" ? "Thanks! Check your inbox to confirm." : ""}
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Typewriter Effect                                                  */
/* ------------------------------------------------------------------ */
function Typewriter({ text, speed = 60, delay = 0, className = "" }: { text: string; speed?: number; delay?: number; className?: string }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const start = setTimeout(() => {
      const timer = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) { clearInterval(timer); setDone(true); }
      }, speed);
      return () => clearInterval(timer);
    }, delay);
    return () => clearTimeout(start);
  }, [text, speed, delay]);
  return (
    <span className={className}>
      {displayed}
      {!done && <span className="inline-block w-[2px] h-[1em] bg-current ml-1 animate-pulse align-middle" />}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Scroll Progress Bar                                                */
/* ------------------------------------------------------------------ */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-accent origin-left z-[60]"
      style={{ scaleX }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Spotlight Card Effect                                              */
/* ------------------------------------------------------------------ */
function SpotlightCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, active: false });
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, active: true });
  }, []);
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setPos((p) => ({ ...p, active: false }))}
      className={`relative overflow-hidden ${className}`}
      style={{ background: pos.active
        ? `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, hsl(var(--accent) / 0.12), transparent 40%)`
        : undefined }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper with scroll reveal                               */
/* ------------------------------------------------------------------ */
function Section({
  id,
  children,
  className = "",
  bg = "bg-background",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  bg?: string;
}) {
  return (
    <section id={id} className={`${bg} ${className}`}>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeInUp}
        className="container mx-auto px-4"
      >
        {children}
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function Home() {
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToContact = () =>
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });

  const scrollToSection = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background font-body text-foreground overflow-x-hidden">
      <Navigation />

      {/* Reading Progress Bar */}
      <ScrollProgress />

      {/* ===================== HERO ===================== */}
      <section
        id="home"
        className="relative min-h-[92vh] flex items-center justify-center pt-24 pb-16 px-4 overflow-hidden bg-primary"
      >
        {/* Floating Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb-delay-1 absolute -top-24 -right-24 w-[600px] h-[600px] bg-white/[0.04] rounded-full blur-[100px]" />
          <div className="orb orb-delay-2 absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[80px]" />
          <div className="orb orb-delay-3 absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-white/[0.03] rounded-full blur-[90px]" />
          <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-background to-transparent z-10" />
        </div>

        <div className="container relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-6 text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div variants={staggerChild} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 border border-white/20 backdrop-blur-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
              </span>
              <span className="text-sm font-medium tracking-wide" data-testid="badge-hero">AI-Powered Debate Coaching · Now in Beta</span>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={staggerChild} className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white leading-[1.05]">
              <Typewriter text="Win More Debates." speed={70} />
              <br />
              <span className="gradient-text">
                <Typewriter text="Speak With Confidence." speed={70} delay={900} />
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p variants={staggerChild} className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto lg:mx-0 font-light leading-relaxed">
              We coach with <span className="text-accent font-semibold">AI</span> — practice live rounds, get instant feedback on your arguments, delivery, and structure, and walk into tournaments ready to win.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={staggerChild} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <Button
                onClick={scrollToContact}
                size="lg"
                data-testid="button-hero-start-free"
                className="bg-accent text-white hover:bg-accent/90 text-lg h-14 px-8 rounded-xl shadow-xl shadow-black/20 transition-transform hover:-translate-y-1"
              >
                Start Practicing Free
              </Button>
              <Link href="/research" data-testid="link-hero-research">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-transparent border-white/30 text-white hover:bg-white/10 text-lg h-14 px-8 rounded-xl backdrop-blur-sm w-full sm:w-auto"
                >
                  <Search className="w-5 h-5 mr-2 text-accent" />
                  Research a Topic
                </Button>
              </Link>
              <Link href="/practice" data-testid="link-hero-practice-bot">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-transparent border-white/30 text-white hover:bg-white/10 text-lg h-14 px-8 rounded-xl backdrop-blur-sm w-full sm:w-auto"
                >
                  <Mic className="w-5 h-5 mr-2 text-accent" />
                  Try the AI Practice Bot
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                data-testid="button-hero-how-it-works"
                className="bg-transparent border-white/30 text-white hover:bg-white/10 text-lg h-14 px-8 rounded-xl backdrop-blur-sm"
                onClick={() => scrollToSection("how-it-works")}
              >
                See How It Works
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div variants={staggerChild} className="pt-6 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-white/70">
              {[
                ["No credit card required", CheckCircle2],
                ["Built with debate champions", CheckCircle2],
                ["Private & secure", ShieldCheck],
              ].map(([label, Icon]) => (
                <div key={String(label)} className="flex items-center gap-2 text-sm">
                  <Icon className="w-4 h-4 text-accent" />
                  <span>{String(label)}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: 80, rotate: 6 }}
            animate={{ opacity: 1, x: 0, rotate: 2 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 aspect-[4/5] max-w-md mx-auto hover:rotate-0 transition-transform duration-700">
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent z-10" />
              <img
                src="https://pixabay.com/get/g74b9001f9ea7dd55757fba843e2dd46476e3cd59a17a528ba03b98d6513ca709fe81de0d86e6ecf80adab5c875ab51e1_1280.jpg"
                alt="Debate Speaker"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-8 left-8 right-8 z-20 text-white">
                <p className="font-display text-2xl font-bold italic">"Debate is the sport of the mind."</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===================== ABOUT — WE COACH WITH AI ===================== */}
      <Section id="about" className="py-24" bg="bg-background">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.span variants={fadeInUp} custom={0} className="text-accent font-bold tracking-wider uppercase text-sm">
            How We're Different
          </motion.span>
          <motion.h2 variants={fadeInUp} custom={0.1} className="text-3xl md:text-5xl font-display font-bold text-primary mt-2 mb-4">
            We Coach With AI
          </motion.h2>
          <motion.div variants={fadeInUp} custom={0.15} className="h-1 w-20 bg-accent mx-auto rounded-full mb-6" />
          <motion.p variants={fadeInUp} custom={0.2} className="text-lg text-muted-foreground leading-relaxed">
            Built by debate champions, powered by AI. Practice anytime, get instant feedback, and walk in
            confident — without waiting for your next session.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-5 gap-10 items-center">
          {/* Visual */}
          <motion.div variants={fadeInLeft} custom={0.2} className="lg:col-span-2 relative order-2 lg:order-1">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-primary to-accent/40 p-8 shadow-2xl aspect-square max-w-md mx-auto">
              <div className="absolute inset-0 opacity-30 shimmer pointer-events-none" />
              <div className="relative h-full flex flex-col justify-between text-white">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
                  </span>
                  <span className="text-xs uppercase tracking-widest font-semibold opacity-80">Live Coaching Session</span>
                </div>

                <div className="space-y-3">
                  <div className="bg-white/10 backdrop-blur p-3 rounded-2xl rounded-tl-sm border border-white/10">
                    <p className="text-xs opacity-70 mb-1">You</p>
                    <p className="text-sm">"Resolved: AI does more harm than good in education..."</p>
                  </div>
                  <div className="bg-accent/30 backdrop-blur p-3 rounded-2xl rounded-tr-sm border border-accent/30 ml-6">
                    <p className="text-xs opacity-70 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Coach
                    </p>
                    <p className="text-sm">Strong opener. Try sharpening your warrant — what evidence backs the harm claim?</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/10 rounded-xl p-2">
                    <p className="text-xl font-bold">9.2</p>
                    <p className="text-[10px] uppercase opacity-70">Clarity</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2">
                    <p className="text-xl font-bold">8.7</p>
                    <p className="text-[10px] uppercase opacity-70">Structure</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2">
                    <p className="text-xl font-bold">7.9</p>
                    <p className="text-[10px] uppercase opacity-70">Delivery</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Features list */}
          <motion.div variants={fadeInRight} custom={0.2} className="lg:col-span-3 space-y-6 order-1 lg:order-2">
            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid gap-4">
              {[
                { icon: Mic, title: "Practice Real Rounds, Anytime", desc: "Speak any topic, any side. The AI listens, responds in real time, and pushes you with sharp counter-arguments." },
                { icon: Sparkles, title: "Instant, Honest Feedback", desc: "Every round ends with scores on clarity, structure, evidence, and delivery — plus one specific tip to fix next." },
                { icon: BookOpen, title: "Researched For You", desc: "Drop in a topic and get sources, evidence quotes, and a full case outline pulled from the live web in under 15 seconds." },
                { icon: ShieldCheck, title: "Backed by Champion Coaches", desc: "Trained on real strategies from former NSDA finalists and university coaches — not generic chat scripts." },
              ].map((item, i) => (
                <motion.div key={i} variants={staggerChild} className="flex gap-4 items-start p-4 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                  <div className="bg-accent/10 p-3 rounded-lg text-accent shrink-0">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-lg">{item.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Trust stats row */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { id: "rounds", value: 12000, suffix: "+", label: "Practice rounds completed" },
            { id: "recommend", value: 98, suffix: "%", label: "Students recommend us" },
            { id: "availability", value: 24, suffix: "/7", label: "Available, no scheduling" },
            { id: "speed", value: 60, suffix: "s", label: "From topic to first round" },
          ].map((s) => (
            <motion.div
              key={s.label}
              variants={staggerChild}
              data-testid={`stat-card-${s.id}`}
              className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-border text-center"
            >
              <p className="text-3xl md:text-4xl font-bold text-primary font-display" data-testid={`stat-value-${s.id}`}>
                <AnimatedCounter value={s.value} />{s.suffix}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground mt-2 font-medium uppercase tracking-wide">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ===================== MARQUEE STRIP ===================== */}
      <div className="bg-accent py-4 overflow-hidden relative">
        <motion.div
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="flex gap-12 whitespace-nowrap text-white/90 font-medium text-sm tracking-widest uppercase"
        >
          {[...Array(10)].map((_, i) => (
            <span key={i} className="flex items-center gap-3">
              <Sparkles className="w-4 h-4" /> AI-Powered Practice
              <Star className="w-4 h-4" /> 4.9/5 Student Rating
              <ShieldCheck className="w-4 h-4" /> Built By Champion Coaches
              <Zap className="w-4 h-4" /> Instant Feedback
              <Award className="w-4 h-4" /> Topic Research Included
            </span>
          ))}
        </motion.div>
      </div>

      {/* ===================== SERVICES ===================== */}
      <Section id="services" className="py-24" bg="bg-muted/40">
        <div className="text-center mb-16">
          <motion.span variants={fadeInUp} custom={0} className="text-accent font-bold tracking-wider uppercase text-sm">
            Services offered
          </motion.span>
          <motion.h2 variants={fadeInUp} custom={0.1} className="text-3xl md:text-5xl font-display font-bold text-primary mt-2 mb-6">
            Ways to Work Together
          </motion.h2>
          <motion.p variants={fadeInUp} custom={0.15} className="text-muted-foreground max-w-2xl mx-auto">
            Whether you need intensive preparation for an upcoming tournament or regular weekly coaching to build skills.
          </motion.p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          <motion.div variants={staggerChild}>
            <ServiceCard
              title="1-on-1 Coaching"
              description="Personalized attention to refine your case writing and speaking style."
              price="$75"
              icon={Mic}
              features={[
                "Individualized improvement plan",
                "Case editing and review",
                "Practice rounds with feedback",
                "Video analysis of past rounds",
              ]}
              onBook={scrollToContact}
            />
          </motion.div>
          <motion.div variants={staggerChild}>
            <ServiceCard
              title="Tournament Prep"
              description="Intensive bootcamp-style preparation before major competitions."
              price="$250"
              icon={Trophy}
              recommended={true}
              features={[
                "4 x 1-hour intensive sessions",
                "Topic analysis & block writing",
                "Opponent research strategies",
                "Mock tournament simulation",
                "Mental game preparation",
              ]}
              onBook={scrollToContact}
            />
          </motion.div>
          <motion.div variants={staggerChild}>
            <ServiceCard
              title="Group Classes"
              description="Small group workshops focused on specific debate skills and theory."
              price="$40"
              icon={Users}
              features={[
                "Maximum 6 students per class",
                "Collaborative skill drills",
                "Peer review and feedback",
                "Available for beginner to advanced",
                "Weekly 90-minute sessions",
              ]}
              onBook={scrollToContact}
            />
          </motion.div>
        </motion.div>
      </Section>

      {/* ===================== HOW IT WORKS ===================== */}
      <Section id="how-it-works" className="py-24" bg="bg-background">
        <div className="text-center mb-16">
          <motion.span variants={fadeInUp} custom={0} className="text-accent font-bold tracking-wider uppercase text-sm">
            Process
          </motion.span>
          <motion.h2 variants={fadeInUp} custom={0.1} className="text-3xl md:text-5xl font-display font-bold text-primary mt-2 mb-4">
            How It Works
          </motion.h2>
          <motion.p variants={fadeInUp} custom={0.15} className="text-muted-foreground max-w-2xl mx-auto">
            A simple 4-step path from first contact to tournament success.
          </motion.p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-4 gap-6 relative"
        >
          <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-border -z-0" />
          {[
            { step: "1", icon: Calendar, title: "Book a Consultation", desc: "Schedule a free 20-minute call to discuss your goals." },
            { step: "2", icon: Search, title: "Skill Assessment", desc: "We review your past rounds and identify key growth areas." },
            { step: "3", icon: Target, title: "Custom Plan", desc: "Receive a tailored coaching roadmap based on your format." },
            { step: "4", icon: Zap, title: "Compete & Win", desc: "Apply strategies in tournaments and iterate with feedback." },
          ].map((item) => (
            <motion.div key={item.step} variants={staggerChild} data-testid={`step-${item.step}`} className="relative z-10 text-center group">
              <motion.div
                whileHover={{ scale: 1.08 }}
                className="w-24 h-24 rounded-full bg-primary/5 border-2 border-primary/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:border-primary transition-colors cursor-default"
              >
                <item.icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
              </motion.div>
              <div className="text-sm font-bold text-accent mb-2">Step {item.step}</div>
              <h3 className="text-xl font-bold text-primary mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ===================== STATS ===================== */}
      {/* ===================== DEBATE FORMATS ===================== */}
      <Section id="formats" className="py-24" bg="bg-background">
        <div className="text-center mb-16">
          <motion.span variants={fadeInUp} custom={0} className="text-accent font-bold tracking-wider uppercase text-sm">
            What We Coach
          </motion.span>
          <motion.h2 variants={fadeInUp} custom={0.1} className="text-3xl md:text-5xl font-display font-bold text-primary mt-2 mb-4">
            Debate Formats Covered
          </motion.h2>
          <motion.p variants={fadeInUp} custom={0.15} className="text-muted-foreground max-w-2xl mx-auto">
            Expert-level coaching across all major competitive debate formats.
          </motion.p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            { icon: Gavel, title: "Lincoln-Douglas", desc: "Value-based one-on-one debate focusing on philosophical frameworks, ethical reasoning, and persuasive speaking.", level: "Beginner to Advanced", color: "from-amber-500/20 to-orange-500/20" },
            { icon: Scale, title: "Public Forum", desc: "Accessible team debate on current events. Emphasis on clear argumentation, evidence analysis, and rebuttal strategy.", level: "All Skill Levels", color: "from-emerald-500/20 to-teal-500/20" },
            { icon: Megaphone, title: "Policy Debate", desc: "High-speed, evidence-intensive format. Deep dive into complex policy analysis, counterplans, and kritiks.", level: "Intermediate to Elite", color: "from-sky-500/20 to-blue-500/20" },
          ].map((fmt) => (
            <motion.div key={fmt.title} variants={staggerChild}>
              <SpotlightCard className="h-full p-8 rounded-2xl border border-border bg-card hover:shadow-xl transition-shadow group">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${fmt.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <fmt.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-primary mb-2">{fmt.title}</h3>
                <p className="text-sm text-accent font-semibold mb-3">{fmt.level}</p>
                <p className="text-muted-foreground leading-relaxed">{fmt.desc}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ===================== UPCOMING TOURNAMENTS ===================== */}
      <Section id="tournaments" className="py-24" bg="bg-muted/40">
        <div className="text-center mb-16">
          <motion.span variants={fadeInUp} custom={0} className="text-accent font-bold tracking-wider uppercase text-sm">
            On The Circuit
          </motion.span>
          <motion.h2 variants={fadeInUp} custom={0.1} className="text-3xl md:text-5xl font-display font-bold text-primary mt-2 mb-4">
            Upcoming Tournaments
          </motion.h2>
          <motion.p variants={fadeInUp} custom={0.15} className="text-muted-foreground max-w-2xl mx-auto">
            Major competitions where our students are training to compete. Book prep now.
          </motion.p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            { name: "NSDA National Championship", date: "June 2026", loc: "Phoenix, AZ", tag: "Elite", icon: Trophy },
            { name: "State Forensics Invitational", date: "October 2026", loc: "Statewide", tag: "Qualifying", icon: Award },
            { name: "Holiday Classic Tournament", date: "December 2026", loc: "Virtual", tag: "Open", icon: CalendarDays },
          ].map((t) => (
            <motion.div key={t.name} variants={staggerChild}>
              <SpotlightCard className="h-full p-6 rounded-2xl border border-border bg-card hover:shadow-xl transition-shadow group">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider">
                    {t.tag}
                  </span>
                  <t.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">{t.name}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-4 h-4" /> {t.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {t.loc}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <button
                    onClick={scrollToContact}
                    className="text-sm font-semibold text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                  >
                    Book Prep <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ===================== STATS ===================== */}
      <Section id="stats" className="py-20" bg="bg-background">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-4 gap-6 text-center"
        >
          {[
            { icon: Award, value: 150, suffix: "+", label: "Students Coached" },
            { icon: Star, value: 4.9, suffix: "/5", label: "Average Rating" },
            { icon: ShieldCheck, value: 90, suffix: "%", label: "Break Rate" },
            { icon: Clock3, value: 10, suffix: "+", label: "Years Experience" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={staggerChild}
              whileHover={{ y: -6 }}
              className="p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow"
            >
              <stat.icon className="w-8 h-8 text-accent mx-auto mb-3" />
              <div className="text-3xl font-bold font-display text-primary">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                {stat.value >= 10 && stat.suffix === "+" ? stat.suffix : stat.value < 10 && stat.suffix === "/5" ? "/5" : stat.value < 100 && stat.suffix === "%" ? "%" : ""}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ===================== TESTIMONIALS ===================== */}
      <section id="testimonials" className="py-24 bg-primary text-white overflow-hidden relative">
        {/* Shimmer overlay */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none shimmer" />
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="w-[800px] h-[800px] bg-white rounded-full blur-[100px] absolute -top-1/2 -left-1/4" />
          <div className="w-[600px] h-[600px] bg-accent rounded-full blur-[100px] absolute -bottom-1/2 -right-1/4" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-5xl font-display font-bold mb-4"
            >
              Student Success Stories
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="text-white/70 max-w-2xl mx-auto"
            >
              Don't just take my word for it. Here is what students and parents have to say about our work together.
            </motion.p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              { quote: "The strategic insights I gained completely changed how I approach rebuttal. I went from struggling to break to winning my district qualifier.", author: "Sarah J.", role: "High School Senior", award: "State Finalist 2024" },
              { quote: "My son was terrified of public speaking. After just a few months of coaching, he's not only competing but enjoying it. The confidence boost is incredible.", author: "Michael R.", role: "Parent", award: "Proud Dad" },
              { quote: "The best investment in my debate career. The focus on efficiency and word economy helped me clear my biggest hurdles in Lincoln-Douglas.", author: "David L.", role: "College Sophomore", award: "NDT Qualifier" },
              { quote: "I was consistently dropping rounds in rebuttal. The targeted drills turned my weakest point into my strongest. I broke at state for the first time.", author: "Emily T.", role: "High School Junior", award: "State Qualifier" },
              { quote: "As a parent, I appreciate the detailed progress reports after every session. I can see exactly what my daughter is improving on.", author: "Jennifer W.", role: "Parent", award: "Debate Mom" },
              { quote: "The coach doesn't just tell you what's wrong—he teaches you how to fix it. My cross-examination skills improved dramatically.", author: "Alex K.", role: "College Freshman", award: "First-Year Competitor" },
            ].map((t, i) => (
              <motion.div
                key={i}
                variants={staggerChild}
                whileHover={{ y: -6, scale: 1.01 }}
                data-testid={`testimonial-${i}`}
                className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors"
              >
                <Quote className="w-10 h-10 text-accent mb-4 opacity-80" />
                <p className="text-lg leading-relaxed text-white/90 mb-6 font-light italic">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-white">
                    {t.author[0]}
                  </div>
                  <div>
                    <h4 className="font-bold">{t.author}</h4>
                    <p className="text-sm text-white/60">
                      {t.role} • {t.award}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===================== RESOURCES ===================== */}
      <Section id="resources" className="py-24" bg="bg-background">
        <div className="text-center mb-16">
          <motion.span variants={fadeInUp} custom={0} className="text-accent font-bold tracking-wider uppercase text-sm">
            Resources
          </motion.span>
          <motion.h2 variants={fadeInUp} custom={0.1} className="text-3xl md:text-5xl font-display font-bold text-primary mt-2 mb-4">
            Tools to Level Up Faster
          </motion.h2>
          <motion.p variants={fadeInUp} custom={0.15} className="text-muted-foreground max-w-2xl mx-auto">
            Free guides and templates to help students prepare between sessions.
          </motion.p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            { icon: BookOpen, title: "Beginner Debate Guide", desc: "Learn core structure, flow, and prep habits." },
            { icon: FileText, title: "Case Building Template", desc: "Organize evidence and arguments efficiently." },
            { icon: MessageSquare, title: "Practice Round Checklist", desc: "Arrive prepared with a pre-round routine." },
          ].map((resource) => (
            <motion.div
              key={resource.title}
              variants={staggerChild}
              whileHover={{ y: -6, scale: 1.01 }}
              className="p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow cursor-default"
            >
              <resource.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-bold text-primary mb-2">{resource.title}</h3>
              <p className="text-muted-foreground">{resource.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ===================== COACHING PHILOSOPHY ===================== */}
      <Section id="philosophy" className="py-24" bg="bg-background">
        <div className="text-center mb-16">
          <motion.span variants={fadeInUp} custom={0} className="text-accent font-bold tracking-wider uppercase text-sm">
            Our Philosophy
          </motion.span>
          <motion.h2 variants={fadeInUp} custom={0.1} className="text-3xl md:text-5xl font-display font-bold text-primary mt-2 mb-4">
            Built On Four Core Principles
          </motion.h2>
          <motion.p variants={fadeInUp} custom={0.15} className="text-muted-foreground max-w-2xl mx-auto">
            Every session is anchored in values that turn good debaters into champions.
          </motion.p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            { icon: Lightbulb, title: "Critical Thinking", desc: "Train students to question assumptions and build arguments from first principles." },
            { icon: Heart, title: "Confidence", desc: "Develop a poised, persuasive presence that carries beyond the debate room." },
            { icon: Compass, title: "Strategy", desc: "Master frameworks, flow, and game theory for any topic or opponent." },
            { icon: Sparkles, title: "Authenticity", desc: "Find your unique voice instead of mimicking generic debate styles." },
          ].map((p) => (
            <motion.div
              key={p.title}
              variants={staggerChild}
              whileHover={{ y: -6 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-border text-center hover:shadow-xl transition-shadow"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-primary text-white flex items-center justify-center mb-5 shadow-lg">
                <p.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-2">{p.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ===================== FAQ ===================== */}
      <Section id="faq" className="py-24" bg="bg-muted/40">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <motion.h2 variants={fadeInUp} custom={0} className="text-3xl md:text-5xl font-display font-bold text-primary mb-4">
            Frequently Asked Questions
          </motion.h2>
          <motion.p variants={fadeInUp} custom={0.1} className="text-muted-foreground">
            Quick answers about sessions, scheduling, and coaching style.
          </motion.p>
        </div>

        <motion.div variants={scaleIn} custom={0.15} className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border p-2">
            {[
              ["Who do you coach?", "Middle school, high school, and college debaters in Lincoln-Douglas, Public Forum, and Policy formats."],
              ["Do you offer virtual sessions?", "Yes, Zoom coaching is available worldwide with flexible evening and weekend scheduling."],
              ["How do I get started?", "Book a free consultation and we'll map out next steps tailored to your goals."],
              ["What formats do you specialize in?", "Lincoln-Douglas, Public Forum, and Policy Debate at all skill levels."],
              ["How long is each session?", "Standard sessions are 60 minutes. Tournament prep intensives are 90 minutes."],
            ].map(([q, a]) => (
              <AccordionItem key={q} value={q} className="px-4">
                <AccordionTrigger className="text-left font-bold text-primary hover:no-underline">{q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </Section>

      {/* ===================== CONTACT ===================== */}
      <Section id="contact" className="py-24" bg="bg-muted/40">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <motion.div variants={fadeInLeft} custom={0.1} className="space-y-8">
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-primary mb-6">
                Let's Start Winning
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                The first consultation is completely free. We'll discuss your goals, assess your current skill level, and create a roadmap for your success.
              </p>

              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4 text-foreground/80">
                  <div className="w-12 h-12 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-primary">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold">Flexible Scheduling</h4>
                    <p className="text-sm text-muted-foreground">Evenings and weekends available</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-foreground/80">
                  <div className="w-12 h-12 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-primary">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold">Virtual Coaching</h4>
                    <p className="text-sm text-muted-foreground">Zoom sessions available worldwide</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-primary/5 rounded-xl border border-primary/10">
              <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                FAQ: Is the first session really free?
              </h4>
              <p className="text-sm text-muted-foreground">
                Yes! It's a 20-minute discovery call to see if we're a good fit. No commitment required.
              </p>
            </div>
          </motion.div>

          <motion.div variants={fadeInRight} custom={0.2}>
            <ContactForm />
          </motion.div>
        </div>
      </Section>

      {/* ===================== NEWSLETTER ===================== */}
      <section className="py-20 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl mx-auto text-center text-white"
          >
            <Mail className="w-12 h-12 mx-auto mb-4 text-accent" />
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
              Weekly Debate Tips, Free
            </h2>
            <p className="text-white/80 mb-8">
              Join 2,000+ debaters getting strategy breakdowns, topic analysis, and tournament prep in their inbox every Sunday.
            </p>
            <NewsletterForm />
            <p className="text-xs text-white/50 mt-4">No spam. Unsubscribe anytime.</p>
          </motion.div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="bg-primary text-white py-12 border-t border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none shimmer opacity-5" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-2 mb-6 opacity-90"
          >
            <GraduationCap className="w-8 h-8" />
            <span className="text-2xl font-bold font-display">DebateMastery</span>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm text-white/70">
            {["home", "about", "services", "how-it-works", "testimonials", "faq", "contact"].map((id) => (
              <button key={id} onClick={() => scrollToSection(id)} className="hover:text-white transition-colors capitalize">
                {id.replace(/-/g, " ")}
              </button>
            ))}
          </div>

          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} DebateMastery Coaching. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Back to top */}
      {showTopBtn && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          data-testid="button-back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 bg-primary text-white p-3 rounded-full shadow-xl hover:bg-primary/90 transition-all hover:-translate-y-1"
          aria-label="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );
}
