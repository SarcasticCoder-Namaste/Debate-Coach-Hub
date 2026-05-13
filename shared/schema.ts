import { pgTable, text, serial, timestamp, integer, jsonb, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
});

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;

export const USER_ROLES = ["student", "coach"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("student"),
  emailCommentNotifications: boolean("email_comment_notifications").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPreferencesSchema = z.object({
  emailCommentNotifications: z.boolean().optional(),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
  role: z.enum(USER_ROLES).optional(),
});

export const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const practiceTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  durationSec: z.number().nonnegative().optional(),
});
export type PracticeTurn = z.infer<typeof practiceTurnSchema>;

export const fillerHitSchema = z.object({
  word: z.string(),
  timestampSec: z.number().nonnegative(),
  turnIndex: z.number().int().nonnegative(),
});
export type FillerHit = z.infer<typeof fillerHitSchema>;

export const subscoreSchema = z.object({
  score: z.number().min(0).max(100),
  comment: z.string(),
  suggestion: z.string(),
});
export type Subscore = z.infer<typeof subscoreSchema>;

export const feedbackReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  metrics: z.object({
    wpm: z.number().nonnegative(),
    durationSec: z.number().nonnegative(),
    wordCount: z.number().int().nonnegative(),
    fillerCount: z.number().int().nonnegative(),
    fillers: z.array(fillerHitSchema),
  }),
  subscores: z.object({
    clarity: subscoreSchema,
    pace: subscoreSchema,
    fillers: subscoreSchema,
    structure: subscoreSchema,
    rebuttal: subscoreSchema,
  }),
  rfd: z
    .object({
      decision: z.enum(["Aff", "Neg"]),
      reason: z.string(),
      keyVoters: z.array(z.string()).max(5),
      speakerPoints: z.number().min(1).max(30).optional(),
      paradigm: z.string().optional(),
    })
    .optional(),
});
export type FeedbackReport = z.infer<typeof feedbackReportSchema>;

// Back-compat aliases retained so older share/round code keeps compiling.
// Practice rounds and shares both store the canonical FeedbackReport now.
export const practiceFeedbackSchema = feedbackReportSchema;
export type PracticeFeedback = FeedbackReport;
export const turnSchema = practiceTurnSchema;
export type Turn = PracticeTurn;
export const feedbackPayloadSchema = feedbackReportSchema;
export type FeedbackPayload = FeedbackReport;

export const practiceRounds = pgTable("practice_rounds", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  side: text("side").notNull(),
  format: text("format").notNull(),
  transcript: jsonb("transcript").$type<PracticeTurn[]>().notNull(),
  feedback: jsonb("feedback").$type<FeedbackReport | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPracticeRoundSchema = createInsertSchema(practiceRounds).omit({
  id: true,
  createdAt: true,
  userId: true,
});

export type PracticeRound = typeof practiceRounds.$inferSelect;
export type InsertPracticeRound = z.infer<typeof insertPracticeRoundSchema>;

export const savePracticeRoundSchema = z.object({
  topic: z.string().min(1),
  side: z.enum(["Aff", "Neg"]),
  format: z.string().min(1),
  transcript: z.array(practiceTurnSchema).min(1),
  feedback: feedbackReportSchema.nullable().optional(),
});

/* ---------- Live Judge Mode ---------- */

export const JUDGE_PERSONAS = ["Lay", "Flow", "Tabula Rasa", "Policy-maker"] as const;
export type JudgePersona = (typeof JUDGE_PERSONAS)[number];

export const judgePersonaSchema = z.enum(JUDGE_PERSONAS);

// Format-specific speech orders the round flow engine walks through.
// `speaker: "user"` is a speech the student delivers; `"opponent"` is generated by the AI.
export type SpeechPhase = {
  id: string;
  label: string;
  speaker: "user" | "opponent";
  minutes: number;
};

export const SPEECH_ORDERS: Record<string, SpeechPhase[]> = {
  PF: [
    { id: "pro-constructive", label: "Pro Constructive", speaker: "user", minutes: 4 },
    { id: "con-constructive", label: "Con Constructive", speaker: "opponent", minutes: 4 },
    { id: "pro-rebuttal", label: "Pro Rebuttal", speaker: "user", minutes: 4 },
    { id: "con-rebuttal", label: "Con Rebuttal", speaker: "opponent", minutes: 4 },
    { id: "pro-summary", label: "Pro Summary", speaker: "user", minutes: 3 },
    { id: "con-summary", label: "Con Summary", speaker: "opponent", minutes: 3 },
    { id: "pro-final", label: "Pro Final Focus", speaker: "user", minutes: 2 },
    { id: "con-final", label: "Con Final Focus", speaker: "opponent", minutes: 2 },
  ],
  LD: [
    { id: "ac", label: "Affirmative Constructive (AC)", speaker: "user", minutes: 6 },
    { id: "nc", label: "Negative Constructive (NC)", speaker: "opponent", minutes: 7 },
    { id: "1ar", label: "1st Affirmative Rebuttal (1AR)", speaker: "user", minutes: 4 },
    { id: "nr", label: "Negative Rebuttal (NR)", speaker: "opponent", minutes: 6 },
    { id: "2ar", label: "2nd Affirmative Rebuttal (2AR)", speaker: "user", minutes: 3 },
  ],
  Policy: [
    { id: "1ac", label: "1AC (Aff Constructive)", speaker: "user", minutes: 8 },
    { id: "1nc", label: "1NC (Neg Constructive)", speaker: "opponent", minutes: 8 },
    { id: "2ac", label: "2AC", speaker: "user", minutes: 8 },
    { id: "2nc", label: "2NC", speaker: "opponent", minutes: 8 },
    { id: "1nr", label: "1NR (Neg Rebuttal)", speaker: "opponent", minutes: 5 },
    { id: "1ar", label: "1AR (Aff Rebuttal)", speaker: "user", minutes: 5 },
    { id: "2nr", label: "2NR (Neg Rebuttal)", speaker: "opponent", minutes: 5 },
    { id: "2ar", label: "2AR (Aff Rebuttal)", speaker: "user", minutes: 5 },
  ],
  Parli: [
    { id: "pmc", label: "Prime Minister Constructive", speaker: "user", minutes: 7 },
    { id: "loc", label: "Leader of Opposition Constructive", speaker: "opponent", minutes: 8 },
    { id: "mgc", label: "Member of Government Constructive", speaker: "user", minutes: 8 },
    { id: "moc", label: "Member of Opposition Constructive", speaker: "opponent", minutes: 8 },
    { id: "lor", label: "Leader of Opposition Rebuttal", speaker: "opponent", minutes: 4 },
    { id: "pmr", label: "Prime Minister Rebuttal", speaker: "user", minutes: 5 },
  ],
  Congress: [
    { id: "auth", label: "Authorship / Sponsorship", speaker: "user", minutes: 3 },
    { id: "opp1", label: "Opposition Speech", speaker: "opponent", minutes: 3 },
    { id: "aff1", label: "Affirmative Speech", speaker: "user", minutes: 3 },
    { id: "opp2", label: "Opposition Crystallization", speaker: "opponent", minutes: 3 },
  ],
  Worlds: [
    { id: "prop1", label: "1st Proposition", speaker: "user", minutes: 8 },
    { id: "opp1", label: "1st Opposition", speaker: "opponent", minutes: 8 },
    { id: "prop2", label: "2nd Proposition", speaker: "user", minutes: 8 },
    { id: "opp2", label: "2nd Opposition", speaker: "opponent", minutes: 8 },
    { id: "prop3", label: "3rd Proposition", speaker: "user", minutes: 8 },
    { id: "opp3", label: "3rd Opposition", speaker: "opponent", minutes: 8 },
    { id: "oppReply", label: "Opposition Reply", speaker: "opponent", minutes: 4 },
    { id: "propReply", label: "Proposition Reply", speaker: "user", minutes: 4 },
  ],
};

// Negative-side variant: when the student is on Neg/Con, swap who delivers each speech.
export function getSpeechOrder(format: string, side: "Aff" | "Neg"): SpeechPhase[] {
  const base = SPEECH_ORDERS[format] ?? SPEECH_ORDERS.LD;
  if (side === "Aff") return base;
  return base.map((p) => ({
    ...p,
    speaker: p.speaker === "user" ? "opponent" : "user",
  }));
}

export const judgeSessions = pgTable("judge_sessions", {
  id: serial("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  topic: text("topic").notNull(),
  side: text("side").notNull(),
  format: text("format").notNull(),
  persona: text("persona").notNull(),
  transcript: jsonb("transcript").$type<PracticeTurn[]>().notNull(),
  feedback: jsonb("feedback").$type<FeedbackReport>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJudgeSessionSchema = createInsertSchema(judgeSessions, {
  transcript: z.array(practiceTurnSchema).min(1),
  feedback: feedbackReportSchema,
}).omit({ id: true, createdAt: true });

export type JudgeSession = typeof judgeSessions.$inferSelect;
export type InsertJudgeSession = z.infer<typeof insertJudgeSessionSchema>;

export const practiceShares = pgTable("practice_shares", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  objectPath: text("object_path").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  topic: text("topic").notNull(),
  side: text("side").notNull(),
  format: text("format").notNull(),
  transcript: jsonb("transcript").$type<PracticeTurn[]>().notNull(),
  feedback: jsonb("feedback").$type<FeedbackReport | null>(),
  ownerUserId: integer("owner_user_id"),
  ownerSessionId: text("owner_session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  lastCommentNotifiedAt: timestamp("last_comment_notified_at"),
});

export const insertPracticeShareSchema = createInsertSchema(practiceShares, {
  transcript: z.array(practiceTurnSchema).min(1),
  feedback: feedbackReportSchema.nullable().optional(),
}).omit({ createdAt: true, lastCommentNotifiedAt: true });

export type PracticeShare = typeof practiceShares.$inferSelect;
export type InsertPracticeShare = z.infer<typeof insertPracticeShareSchema>;

/* ------------------------------------------------------------------ */
/*  Pricing & subscription                                             */
/* ------------------------------------------------------------------ */

export const PLAN_TIERS = ["free", "pro", "team"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const BILLING_INTERVALS = ["monthly", "annual"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const SUB_STATUSES = ["active", "canceled", "past_due"] as const;
export type SubStatus = (typeof SUB_STATUSES)[number];

export const PLAN_FEATURE_KEYS = [
  "practiceMinutes",
  "judgeMode",
  "drillMode",
  "history",
  "highlightClips",
  "teamSeats",
  "prioritySupport",
] as const;
export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];

export type Entitlements = {
  practiceMinutesPerMonth: number | "unlimited";
  judgeMode: boolean;
  drillMode: boolean;
  history: boolean;
  highlightClips: boolean;
  teamSeats: number;
  prioritySupport: boolean;
};

export type PlanDefinition = {
  id: PlanTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  perSeat?: boolean;
  minSeats?: number;
  highlight?: boolean;
  cta: string;
  features: string[];
  entitlements: Entitlements;
};

export const TEAM_MIN_SEATS = 5;

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Try the bot — no card required.",
    monthlyPrice: 0,
    annualPrice: 0,
    cta: "Start practicing",
    features: [
      "60 practice minutes per month",
      "Basic AI scoring & feedback",
      "All debate formats (LD, PF, Policy)",
      "Light/dark mode",
    ],
    entitlements: {
      practiceMinutesPerMonth: 60,
      judgeMode: false,
      drillMode: false,
      history: false,
      highlightClips: false,
      teamSeats: 0,
      prioritySupport: false,
    },
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Serious prep for serious debaters.",
    monthlyPrice: 19,
    annualPrice: 15,
    highlight: true,
    cta: "Upgrade to Pro",
    features: [
      "Unlimited practice minutes",
      "Live AI Judge mode",
      "Drill streaks & timed challenges",
      "Full session history & progress",
      "Shareable highlight clips",
      "Priority email support",
    ],
    entitlements: {
      practiceMinutesPerMonth: "unlimited",
      judgeMode: true,
      drillMode: true,
      history: true,
      highlightClips: true,
      teamSeats: 0,
      prioritySupport: true,
    },
  },
  {
    id: "team",
    name: "Team",
    tagline: "For coaches, schools, and clubs.",
    monthlyPrice: 12,
    annualPrice: 9,
    perSeat: true,
    minSeats: TEAM_MIN_SEATS,
    cta: "Talk to us",
    features: [
      "Everything in Pro",
      "Team / classroom mode",
      `Per-seat pricing (${TEAM_MIN_SEATS} seat minimum)`,
      "Coach dashboard & assignments",
      "Roster management",
      "Dedicated onboarding",
    ],
    entitlements: {
      practiceMinutesPerMonth: "unlimited",
      judgeMode: true,
      drillMode: true,
      history: true,
      highlightClips: true,
      teamSeats: TEAM_MIN_SEATS,
      prioritySupport: true,
    },
  },
];

export function getPlan(id: PlanTier): PlanDefinition {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export const checkoutRequestSchema = z
  .object({
    planId: z.enum(PLAN_TIERS),
    interval: z.enum(BILLING_INTERVALS),
    seats: z.number().int().min(1).max(500).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.planId === "team") {
      const seats = val.seats ?? 0;
      if (seats < TEAM_MIN_SEATS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["seats"],
          message: `Team plan requires at least ${TEAM_MIN_SEATS} seats.`,
        });
      }
    }
  });
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

/* ------------------------------------------------------------------ */
/*  Subscriptions table — persistent record of each subscriber's plan */
/* ------------------------------------------------------------------ */

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  subscriberId: text("subscriber_id").notNull().unique(),
  planId: text("plan_id").notNull().default("free"),
  interval: text("interval").notNull().default("monthly"),
  seats: integer("seats").notNull().default(1),
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  practiceMinutesUsed: integer("practice_minutes_used").notNull().default(0),
  minutesPeriodStart: timestamp("minutes_period_start").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;

/* -------- Topic Research Assistant -------- */

export const sideEnum = z.enum(["For", "Against", "Both"]);
export const formatEnum = z.enum(["Generic", "PF", "LD", "Policy", "Parli"]);
export const depthEnum = z.enum(["Quick", "Deep"]);
export const stanceEnum = z.enum(["for", "against", "neutral"]);

export const sourceItemSchema = z.object({
  title: z.string(),
  publisher: z.string(),
  date: z.string().optional().default(""),
  summary: z.string(),
  url: z.string(),
  stance: stanceEnum,
});

export const factItemSchema = z.object({
  stat: z.string(),
  source: z.string(),
  url: z.string().optional().default(""),
});

export const quoteItemSchema = z.object({
  quote: z.string(),
  source: z.string(),
  url: z.string().optional().default(""),
});

export const contentionSchema = z.object({
  title: z.string(),
  claim: z.string(),
  warrant: z.string(),
  evidence: z.array(quoteItemSchema).default([]),
});

export const oppositionSchema = z.object({
  argument: z.string(),
  rebuttalHint: z.string(),
});

export const termSchema = z.object({
  term: z.string(),
  kind: z.enum(["definition", "organization", "person"]),
  description: z.string(),
});

export const researchBundleSchema = z.object({
  overview: z.string(),
  keyFacts: z.array(factItemSchema).default([]),
  sources: z.array(sourceItemSchema).default([]),
  evidenceQuotes: z.object({
    for: z.array(quoteItemSchema).default([]),
    against: z.array(quoteItemSchema).default([]),
  }),
  caseOutline: z.array(contentionSchema).default([]),
  opposition: z.array(oppositionSchema).default([]),
  keyTerms: z.array(termSchema).default([]),
});

export type ResearchBundle = z.infer<typeof researchBundleSchema>;

export const researchSafetySchema = z.object({
  level: z.enum(["ok", "warn", "refused"]),
  message: z.string().optional().default(""),
  suggestion: z.string().optional().default(""),
});

export type ResearchSafety = z.infer<typeof researchSafetySchema>;

export const researchBundles = pgTable("research_bundles", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  topic: text("topic").notNull(),
  side: text("side").notNull(),
  format: text("format").notNull(),
  depth: text("depth").notNull(),
  bundle: jsonb("bundle").notNull(),
  safety: jsonb("safety").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertResearchBundleSchema = createInsertSchema(researchBundles).omit({
  id: true,
  createdAt: true,
});

export const coachReferrals = pgTable("coach_referrals", {
  id: serial("id").primaryKey(),
  shareId: text("share_id").notNull(),
  coachEmail: text("coach_email").notNull(),
  studentEmail: text("student_email"),
  studentName: text("student_name"),
  note: text("note"),
  shareUrl: text("share_url").notNull(),
  topic: text("topic").notNull(),
  side: text("side").notNull(),
  format: text("format").notNull(),
  emailStatus: text("email_status").notNull(),
  emailError: text("email_error"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCoachReferralSchema = createInsertSchema(coachReferrals).omit({
  id: true,
  createdAt: true,
});

export type ResearchBundleRow = typeof researchBundles.$inferSelect;
export type InsertResearchBundle = z.infer<typeof insertResearchBundleSchema>;

export const researchRequestSchema = z.object({
  topic: z.string().min(3).max(500),
  side: sideEnum,
  format: formatEnum.default("Generic"),
  depth: depthEnum.default("Quick"),
});

export type ResearchRequest = z.infer<typeof researchRequestSchema>;

/* ------------------------------------------------------------------ */
/*  Coaching & Leads                                                  */
/* ------------------------------------------------------------------ */

export const coaches = pgTable("coaches", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  photoUrl: text("photo_url").notNull(),
  bio: text("bio").notNull(),
  specialties: text("specialties").array().notNull(),
  formats: text("formats").array().notNull(),
  pricePerHour: integer("price_per_hour").notNull(),
  availability: text("availability").array().notNull(),
});

export const insertCoachSchema = createInsertSchema(coaches).omit({ id: true });
export type Coach = typeof coaches.$inferSelect;
export type InsertCoach = z.infer<typeof insertCoachSchema>;

export const LEAD_STATUSES = ["New", "Contacted", "Booked", "Closed"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  coachId: integer("coach_id").notNull(),
  studentName: text("student_name").notNull(),
  email: text("email").notNull(),
  format: text("format").notNull(),
  slot: text("slot").notNull(),
  durationMin: integer("duration_min").notNull(),
  goals: text("goals").notNull(),
  sessionLink: text("session_link"),
  status: text("status").notNull().default("New"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads)
  .omit({ id: true, createdAt: true, status: true, notes: true })
  .extend({
    studentName: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    goals: z.string().min(5, "Tell us a little about your goals"),
    durationMin: z.union([z.literal(30), z.literal(60)]),
    sessionLink: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  });

export const updateLeadSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().optional(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type UpdateLead = z.infer<typeof updateLeadSchema>;

export const practiceShareComments = pgTable("practice_share_comments", {
  id: serial("id").primaryKey(),
  shareId: text("share_id").notNull().references(() => practiceShares.id, { onDelete: "cascade" }),
  coachName: text("coach_name").notNull(),
  comment: text("comment").notNull(),
  timestampSec: integer("timestamp_sec").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPracticeShareCommentSchema = createInsertSchema(practiceShareComments, {
  coachName: z.string().trim().min(1, "Name is required").max(60),
  comment: z.string().trim().min(1, "Comment is required").max(1000),
  timestampSec: z.number().int().min(0).max(60 * 60 * 12),
}).omit({ id: true, createdAt: true });

export type PracticeShareComment = typeof practiceShareComments.$inferSelect;
export type InsertPracticeShareComment = z.infer<typeof insertPracticeShareCommentSchema>;

/* ------------------------------------------------------------------ */
/*  Practice sessions — saved practice rounds for the dashboard       */
/* ------------------------------------------------------------------ */

export const practiceSessions = pgTable("practice_sessions", {
  id: text("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  title: text("title"),
  topic: text("topic").notNull(),
  side: text("side").notNull(),
  format: text("format").notNull(),
  durationSec: integer("duration_sec").notNull().default(0),
  objectPath: text("object_path"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  hasMedia: boolean("has_media").notNull().default(false),
  transcript: jsonb("transcript").$type<PracticeTurn[]>().notNull(),
  feedback: jsonb("feedback").$type<FeedbackReport | null>(),
  overallScore: integer("overall_score"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPracticeSessionSchema = createInsertSchema(practiceSessions, {
  transcript: z.array(practiceTurnSchema).min(1),
  feedback: feedbackReportSchema.nullable().optional(),
}).omit({ id: true, createdAt: true, userEmail: true });

export type PracticeSession = typeof practiceSessions.$inferSelect;
export type InsertPracticeSession = z.infer<typeof insertPracticeSessionSchema>;

export const savedTopics = pgTable(
  "saved_topics",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    topicId: text("topic_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userTopicUnique: uniqueIndex("saved_topics_user_topic_unique").on(
      t.userId,
      t.topicId,
    ),
  }),
);

export const insertSavedTopicSchema = createInsertSchema(savedTopics).omit({
  id: true,
  createdAt: true,
});

export type SavedTopic = typeof savedTopics.$inferSelect;
export type InsertSavedTopic = z.infer<typeof insertSavedTopicSchema>;

export type CoachReferral = typeof coachReferrals.$inferSelect;
export type InsertCoachReferral = z.infer<typeof insertCoachReferralSchema>;

export const coachReferralRequestSchema = z.object({
  coachEmail: z.string().email().max(254),
  studentName: z.string().trim().max(120).optional(),
  studentEmail: z.string().email().max(254).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional(),
});
export type CoachReferralRequest = z.infer<typeof coachReferralRequestSchema>;

/* ------------------------------------------------------------------ */
/*  Teams & Classroom Mode                                            */
/* ------------------------------------------------------------------ */

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  joinCode: text("join_code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  joinCode: true,
  ownerId: true,
}).extend({
  name: z.string().trim().min(1, "Team name is required").max(120),
});
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export const TEAM_MEMBER_ROLES = ["coach", "student"] as const;
export type TeamMemberRole = (typeof TEAM_MEMBER_ROLES)[number];

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("student"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;

export const teamInvites = pgTable("team_invites", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  invitedBy: integer("invited_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inviteTeamSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(50),
});
export type TeamInvite = typeof teamInvites.$inferSelect;

export const ASSIGNMENT_KINDS = ["topic", "drill"] as const;
export type AssignmentKind = (typeof ASSIGNMENT_KINDS)[number];

export const teamAssignments = pgTable("team_assignments", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("topic"),
  title: text("title").notNull(),
  topic: text("topic"),
  format: text("format"),
  side: text("side"),
  description: text("description"),
  dueDate: timestamp("due_date"),
  targetUserIds: integer("target_user_ids").array(),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const createAssignmentSchema = z.object({
  kind: z.enum(ASSIGNMENT_KINDS).default("topic"),
  title: z.string().trim().min(1).max(200),
  topic: z.string().trim().max(500).optional().nullable(),
  format: z.string().trim().max(40).optional().nullable(),
  side: z.string().trim().max(20).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  targetUserIds: z.array(z.number().int()).optional().nullable(),
});
export type CreateAssignment = z.infer<typeof createAssignmentSchema>;
export type TeamAssignment = typeof teamAssignments.$inferSelect;

export const assignmentCompletions = pgTable("assignment_completions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => teamAssignments.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roundId: integer("round_id").references(() => practiceRounds.id, {
    onDelete: "set null",
  }),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export type AssignmentCompletion = typeof assignmentCompletions.$inferSelect;

export const sessionComments = pgTable("session_comments", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id")
    .notNull()
    .references(() => practiceRounds.id, { onDelete: "cascade" }),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const createSessionCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment is required").max(2000),
});
export type SessionComment = typeof sessionComments.$inferSelect;

/* ------------------------------------------------------------------ */
/*  Practice highlight clips — short MP4s rendered from a session     */
/* ------------------------------------------------------------------ */

export const practiceClips = pgTable("practice_clips", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userEmail: text("user_email").notNull(),
  topic: text("topic").notNull(),
  side: text("side").notNull(),
  format: text("format").notNull(),
  startSec: integer("start_sec").notNull(),
  endSec: integer("end_sec").notNull(),
  durationSec: integer("duration_sec").notNull(),
  overlayName: text("overlay_name"),
  overlayTopic: boolean("overlay_topic").notNull().default(true),
  overlayScore: integer("overlay_score"),
  overlayWatermark: boolean("overlay_watermark").notNull().default(true),
  objectPath: text("object_path").notNull(),
  posterPath: text("poster_path"),
  mimeType: text("mime_type").notNull().default("video/mp4"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PracticeClip = typeof practiceClips.$inferSelect;

export const CLIP_MIN_SEC = 15;
export const CLIP_MAX_SEC = 60;

export const createClipSchema = z.object({
  startSec: z.number().int().min(0),
  endSec: z.number().int().min(CLIP_MIN_SEC),
  overlayName: z.string().trim().max(80).nullable().optional(),
  overlayTopic: z.boolean().default(true),
  overlayScore: z.number().int().min(0).max(100).nullable().optional(),
  overlayWatermark: z.boolean().default(true),
}).superRefine((val, ctx) => {
  const dur = val.endSec - val.startSec;
  if (dur < CLIP_MIN_SEC) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endSec"], message: `Clip must be at least ${CLIP_MIN_SEC}s.` });
  }
  if (dur > CLIP_MAX_SEC) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endSec"], message: `Clip can be at most ${CLIP_MAX_SEC}s.` });
  }
});
export type CreateClipInput = z.infer<typeof createClipSchema>;

export const clipSuggestionSchema = z.object({
  startSec: z.number().int().min(0),
  endSec: z.number().int().min(CLIP_MIN_SEC),
  reason: z.string().max(280),
});
export type ClipSuggestion = z.infer<typeof clipSuggestionSchema>;
