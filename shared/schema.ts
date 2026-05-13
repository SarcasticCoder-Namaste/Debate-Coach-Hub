import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
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

export const turnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
export type Turn = z.infer<typeof turnSchema>;

export const feedbackPayloadSchema = z.object({
  clarity: z.object({ score: z.number(), comment: z.string() }),
  structure: z.object({ score: z.number(), comment: z.string() }),
  evidence: z.object({ score: z.number(), comment: z.string() }),
  delivery: z.object({ score: z.number(), comment: z.string() }),
  tip: z.string(),
});
export type FeedbackPayload = z.infer<typeof feedbackPayloadSchema>;

export const practiceShares = pgTable("practice_shares", {
  id: text("id").primaryKey(),
  objectPath: text("object_path").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  topic: text("topic").notNull(),
  side: text("side").notNull(),
  format: text("format").notNull(),
  transcript: jsonb("transcript").$type<Turn[]>().notNull(),
  feedback: jsonb("feedback").$type<FeedbackPayload | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const insertPracticeShareSchema = createInsertSchema(practiceShares, {
  transcript: z.array(turnSchema).min(1),
  feedback: feedbackPayloadSchema.nullable().optional(),
}).omit({ createdAt: true });

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
