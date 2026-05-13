import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { ServiceCard } from "@/components/ServiceCard";
import { ContactForm } from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { 
  Users, 
  Trophy, 
  Mic, 
  Quote, 
  CheckCircle2, 
  Calendar,
  ArrowRight,
  GraduationCap,
  BookOpen,
  FileText,
  MessageSquare,
  Award,
  Star,
  ShieldCheck,
  Clock3,
  ArrowUp,
  Search,
  Target,
  Zap
} from "lucide-react";

export default function Home() {
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowTopBtn(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="min-h-screen bg-background font-body text-foreground overflow-x-hidden">
      <Navigation />

      {/* HERO SECTION */}
      <section id="home" className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-16 px-4 overflow-hidden bg-primary">
        {/* Abstract Background Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-accent/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent z-10"></div>
        </div>

        <div className="container relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-6 text-center lg:text-left"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 border border-white/20 backdrop-blur-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
              </span>
              <span className="text-sm font-medium tracking-wide">Accepting New Students for Fall 2025</span>
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="text-4xl md:text-5xl lg:text-7xl font-display font-bold text-white leading-[1.1]">
              Win More Debates. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-red-400">
                Speak With Confidence.
              </span>
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto lg:mx-0 font-light leading-relaxed">
              Professional coaching for competitive debaters and public speakers. 
              Unlock your potential with personalized strategies proven to win tournaments.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <Button 
                onClick={scrollToContact}
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 text-lg h-14 px-8 rounded-xl shadow-xl shadow-black/10 transition-transform hover:-translate-y-1"
              >
                Book a Free Consultation
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="bg-transparent border-white/30 text-white hover:bg-white/10 text-lg h-14 px-8 rounded-xl backdrop-blur-sm"
                onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
              >
                Explore Services
              </Button>
            </motion.div>

            <motion.div variants={fadeInUp} className="pt-8 flex items-center justify-center lg:justify-start gap-8 text-white/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>State Finalist Coach</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>10+ Years Experience</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block relative"
          >
            {/* Debate/Speaking Stock Image */}
            {/* person speaking at podium public speaking conference */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 aspect-[4/5] max-w-md mx-auto transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent z-10"></div>
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

      {/* ABOUT SECTION */}
      <section id="about" className="py-24 bg-white relative">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary mb-4">Meet Your Coach</h2>
            <div className="h-1 w-20 bg-accent mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              I believe that communication is the most powerful skill a young person can develop. 
              My coaching philosophy centers on finding your unique voice, not just winning arguments.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 md:order-1">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-xl bg-muted max-w-md mx-auto">
                {/* professional headshot man glasses suit library background */}
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop" 
                  alt="Coach Portrait" 
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Experience Badge */}
              <div className="absolute -bottom-6 -right-6 md:right-10 bg-white p-6 rounded-xl shadow-lg border border-border max-w-[200px]">
                <p className="text-4xl font-bold text-accent font-display">150+</p>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Students Coached</p>
              </div>
            </div>

            <div className="space-y-8 order-1 md:order-2">
              <div>
                <h3 className="text-2xl font-bold text-primary mb-2">Academic & Coaching Credentials</h3>
                <p className="text-muted-foreground">
                  With over a decade of experience in competitive debate formats including Lincoln-Douglas, Public Forum, and Policy Debate.
                </p>
              </div>

              <div className="grid gap-6">
                {[
                  { icon: Trophy, title: "National Tournament Finalist", desc: "Top 10 speaker award at NSDA Nationals 2018" },
                  { icon: GraduationCap, title: "Former University Coach", desc: "Head Coach for State University Debate Society" },
                  { icon: Users, title: "Student Success", desc: "90% of long-term students break to elimination rounds" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start p-4 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="bg-primary/10 p-3 rounded-lg text-primary shrink-0">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-lg">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section id="services" className="py-24 bg-muted/30 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-accent font-bold tracking-wider uppercase text-sm">Services offered</span>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-primary mt-2 mb-6">Ways to Work Together</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you need intensive preparation for an upcoming tournament or regular weekly coaching to build skills.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <ServiceCard 
              title="1-on-1 Coaching"
              description="Personalized attention to refine your case writing and speaking style."
              price="$75"
              icon={Mic}
              features={[
                "Individualized improvement plan",
                "Case editing and review",
                "Practice rounds with feedback",
                "Video analysis of past rounds"
              ]}
              onBook={scrollToContact}
            />
            
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
                "Mental game preparation"
              ]}
              onBook={scrollToContact}
            />

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
                "Weekly 90-minute sessions"
              ]}
              onBook={scrollToContact}
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-accent font-bold tracking-wider uppercase text-sm">Process</span>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-primary mt-2 mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">A simple 4-step path from first contact to tournament success.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-border -z-0"></div>
            {[
              { step: "1", icon: Calendar, title: "Book a Consultation", desc: "Schedule a free 20-minute call to discuss your goals." },
              { step: "2", icon: Search, title: "Skill Assessment", desc: "We review your past rounds and identify key growth areas." },
              { step: "3", icon: Target, title: "Custom Plan", desc: "Receive a tailored coaching roadmap based on your format." },
              { step: "4", icon: Zap, title: "Compete & Win", desc: "Apply strategies in tournaments and iterate with feedback." },
            ].map((item) => (
              <div key={item.step} data-testid={`step-${item.step}`} className="relative z-10 text-center">
                <div className="w-24 h-24 rounded-full bg-primary/5 border-2 border-primary/20 flex items-center justify-center mx-auto mb-6 hover:bg-primary hover:border-primary transition-colors group">
                  <item.icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                </div>
                <div className="text-sm font-bold text-accent mb-2">Step {item.step}</div>
                <h3 className="text-xl font-bold text-primary mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="stats" className="py-20 bg-white">
        <div className="container mx-auto px-4 grid md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Award, value: "150+", label: "Students Coached" },
            { icon: Star, value: "4.9/5", label: "Average Rating" },
            { icon: ShieldCheck, value: "90%", label: "Break Rate" },
            { icon: Clock3, value: "10+", label: "Years Experience" },
          ].map((stat) => (
            <div key={stat.label} className="p-6 rounded-2xl border border-border bg-muted/20">
              <stat.icon className="w-8 h-8 text-accent mx-auto mb-3" />
              <div className="text-3xl font-bold font-display text-primary">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section id="testimonials" className="py-24 bg-primary text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           {/* Pattern or texture could go here */}
           <div className="w-[800px] h-[800px] bg-white rounded-full blur-[100px] absolute -top-1/2 -left-1/4"></div>
           <div className="w-[600px] h-[600px] bg-accent rounded-full blur-[100px] absolute -bottom-1/2 -right-1/4"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Student Success Stories</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Don't just take my word for it. Here is what students and parents have to say about our work together.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "The strategic insights I gained completely changed how I approach rebuttal. I went from struggling to break to winning my district qualifier.",
                author: "Sarah J.",
                role: "High School Senior",
                award: "State Finalist 2024"
              },
              {
                quote: "My son was terrified of public speaking. After just a few months of coaching, he's not only competing but enjoying it. The confidence boost is incredible.",
                author: "Michael R.",
                role: "Parent",
                award: "Proud Dad"
              },
              {
                quote: "The best investment in my debate career. The focus on efficiency and word economy helped me clear my biggest hurdles in Lincoln-Douglas.",
                author: "David L.",
                role: "College Sophomore",
                award: "NDT Qualifier"
              },
              {
                quote: "I was consistently dropping rounds in rebuttal. The targeted drills turned my weakest point into my strongest. I broke at state for the first time.",
                author: "Emily T.",
                role: "High School Junior",
                award: "State Qualifier"
              },
              {
                quote: "As a parent, I appreciate the detailed progress reports after every session. I can see exactly what my daughter is improving on.",
                author: "Jennifer W.",
                role: "Parent",
                award: "Debate Mom"
              },
              {
                quote: "The coach doesn't just tell you what's wrong—he teaches you how to fix it. My cross-examination skills improved dramatically.",
                author: "Alex K.",
                role: "College Freshman",
                award: "First-Year Competitor"
              }
            ].map((testimonial, i) => (
              <div key={i} data-testid={`testimonial-${i}`} className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors">
                <Quote className="w-10 h-10 text-accent mb-4 opacity-80" />
                <p className="text-lg leading-relaxed text-white/90 mb-6 font-light italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-white">
                    {testimonial.author[0]}
                  </div>
                  <div>
                    <h4 className="font-bold">{testimonial.author}</h4>
                    <p className="text-sm text-white/60">{testimonial.role} • {testimonial.award}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="resources" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-accent font-bold tracking-wider uppercase text-sm">Resources</span>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-primary mt-2 mb-4">Tools to Level Up Faster</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Free guides and templates to help students prepare between sessions.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, title: "Beginner Debate Guide", desc: "Learn core structure, flow, and prep habits." },
              { icon: FileText, title: "Case Building Template", desc: "Organize evidence and arguments efficiently." },
              { icon: MessageSquare, title: "Practice Round Checklist", desc: "Arrive prepared with a pre-round routine." },
            ].map((resource) => (
              <div key={resource.title} className="p-6 rounded-2xl border border-border bg-muted/20 hover:shadow-lg transition-shadow">
                <resource.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-xl font-bold text-primary mb-2">{resource.title}</h3>
                <p className="text-muted-foreground">{resource.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-primary mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Quick answers about sessions, scheduling, and coaching style.</p>
          </div>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="bg-white rounded-2xl border border-border p-2">
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
          </div>
        </div>
      </section>

      <section id="contact" className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-display font-bold text-primary mb-6">Let's Start Winning</h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  The first consultation is completely free. We'll discuss your goals, assess your current skill level, and create a roadmap for your success.
                </p>
                
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4 text-foreground/80">
                    <div className="w-12 h-12 rounded-full bg-white border border-border shadow-sm flex items-center justify-center text-primary">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold">Flexible Scheduling</h4>
                      <p className="text-sm text-muted-foreground">Evenings and weekends available</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-foreground/80">
                    <div className="w-12 h-12 rounded-full bg-white border border-border shadow-sm flex items-center justify-center text-primary">
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
            </div>

            <ContactForm />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-primary text-white py-12 border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6 opacity-90">
            <GraduationCap className="w-8 h-8" />
            <span className="text-2xl font-bold font-display">DebateMastery</span>
          </div>
          <div className="flex justify-center gap-8 mb-8 text-sm text-white/70">
            <button onClick={() => scrollToSection("home")} className="hover:text-white transition-colors">Home</button>
            <button onClick={() => scrollToSection("about")} className="hover:text-white transition-colors">About</button>
            <button onClick={() => scrollToSection("services")} className="hover:text-white transition-colors">Services</button>
            <button onClick={() => scrollToSection("how-it-works")} className="hover:text-white transition-colors">How It Works</button>
            <button onClick={() => scrollToSection("testimonials")} className="hover:text-white transition-colors">Testimonials</button>
            <button onClick={() => scrollToSection("faq")} className="hover:text-white transition-colors">FAQ</button>
            <button onClick={() => scrollToSection("contact")} className="hover:text-white transition-colors">Contact</button>
          </div>
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} DebateMastery Coaching. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Back to top */}
      {showTopBtn && (
        <button
          data-testid="button-back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 bg-primary text-white p-3 rounded-full shadow-xl hover:bg-primary/90 transition-all hover:-translate-y-1"
          aria-label="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
  
  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }
}
