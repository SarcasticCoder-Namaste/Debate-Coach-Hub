import {
  inquiries,
  practiceShares,
  practiceShareComments,
  subscriptions,
  researchBundles,
  users,
  practiceRounds,
  coaches,
  leads,
  type InsertInquiry,
  type Inquiry,
  type InsertPracticeShare,
  type PracticeShare,
  type InsertPracticeShareComment,
  type PracticeShareComment,
  type Subscription,
  type InsertResearchBundle,
  type ResearchBundleRow,
  type User,
  type InsertUser,
  type PracticeRound,
  type InsertPracticeRound,
  type PracticeFeedback,
  type Coach,
  type InsertCoach,
  type Lead,
  type InsertLead,
  type UpdateLead,
} from "@shared/schema";
import { db } from "./db";
import { and, asc, desc, eq, isNull, lt } from "drizzle-orm";

export interface IStorage {
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  createPracticeShare(share: InsertPracticeShare): Promise<PracticeShare>;
  getPracticeShare(id: string): Promise<PracticeShare | undefined>;
  deletePracticeShare(id: string): Promise<void>;
  listExpiredPracticeShares(now: Date): Promise<PracticeShare[]>;

  getSubscription(subscriberId: string): Promise<Subscription | undefined>;
  upsertSubscription(
    subscriberId: string,
    fields: Partial<Omit<Subscription, "id" | "subscriberId">>,
  ): Promise<Subscription>;
  setSubscriptionByCustomerId(
    stripeCustomerId: string,
    fields: Partial<Omit<Subscription, "id">>,
  ): Promise<Subscription | undefined>;
  incrementPracticeMinutes(
    subscriberId: string,
    minutes: number,
  ): Promise<Subscription>;
  rolloverMinutesIfNeeded(subscriberId: string): Promise<Subscription>;
  createResearch(bundle: InsertResearchBundle): Promise<ResearchBundleRow>;
  getResearch(id: number): Promise<ResearchBundleRow | undefined>;
  listResearch(userId?: string | null): Promise<ResearchBundleRow[]>;
  deleteResearch(id: number): Promise<void>;

  createUser(user: InsertUser): Promise<User>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createPracticeRound(userId: number, round: InsertPracticeRound): Promise<PracticeRound>;
  listPracticeRounds(userId: number): Promise<PracticeRound[]>;
  getPracticeRound(userId: number, id: number): Promise<PracticeRound | undefined>;
  deletePracticeRound(userId: number, id: number): Promise<boolean>;
  listCoaches(): Promise<Coach[]>;
  getCoach(id: number): Promise<Coach | undefined>;
  upsertCoachBySlug(coach: InsertCoach): Promise<Coach>;

  createLead(lead: InsertLead): Promise<Lead>;
  listLeads(): Promise<Lead[]>;
  updateLead(id: number, patch: UpdateLead): Promise<Lead | undefined>;

  createPracticeShareComment(c: InsertPracticeShareComment): Promise<PracticeShareComment>;
  listPracticeShareComments(shareId: string): Promise<PracticeShareComment[]>;
}

function nextPeriodEnd(from: Date, interval: string): Date {
  const end = new Date(from);
  if (interval === "annual") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

export class DatabaseStorage implements IStorage {
  async createInquiry(insertInquiry: InsertInquiry): Promise<Inquiry> {
    const [inquiry] = await db.insert(inquiries).values(insertInquiry).returning();
    return inquiry;
  }

  async createPracticeShare(share: InsertPracticeShare): Promise<PracticeShare> {
    const [row] = await db.insert(practiceShares).values(share).returning();
    return row;
  }

  async getPracticeShare(id: string): Promise<PracticeShare | undefined> {
    const [row] = await db.select().from(practiceShares).where(eq(practiceShares.id, id));
    return row;
  }

  async deletePracticeShare(id: string): Promise<void> {
    await db.delete(practiceShares).where(eq(practiceShares.id, id));
  }

  async listExpiredPracticeShares(now: Date): Promise<PracticeShare[]> {
    return db
      .select()
      .from(practiceShares)
      .where(and(lt(practiceShares.expiresAt, now)));
  }

  async getSubscription(subscriberId: string): Promise<Subscription | undefined> {
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.subscriberId, subscriberId));
    return row;
  }

  async upsertSubscription(
    subscriberId: string,
    fields: Partial<Omit<Subscription, "id" | "subscriberId">>,
  ): Promise<Subscription> {
    const existing = await this.getSubscription(subscriberId);
    if (existing) {
      const [row] = await db
        .update(subscriptions)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(subscriptions.subscriberId, subscriberId))
        .returning();
      return row;
    }
    const now = new Date();
    const [row] = await db
      .insert(subscriptions)
      .values({
        subscriberId,
        planId: fields.planId ?? "free",
        interval: fields.interval ?? "monthly",
        seats: fields.seats ?? 1,
        status: fields.status ?? "active",
        startedAt: fields.startedAt ?? now,
        currentPeriodEnd:
          fields.currentPeriodEnd ?? nextPeriodEnd(now, fields.interval ?? "monthly"),
        stripeCustomerId: fields.stripeCustomerId ?? null,
        stripeSubscriptionId: fields.stripeSubscriptionId ?? null,
        practiceMinutesUsed: fields.practiceMinutesUsed ?? 0,
        minutesPeriodStart: fields.minutesPeriodStart ?? now,
        updatedAt: now,
      })
      .returning();
    return row;
  }

  async setSubscriptionByCustomerId(
    stripeCustomerId: string,
    fields: Partial<Omit<Subscription, "id">>,
  ): Promise<Subscription | undefined> {
    const [row] = await db
      .update(subscriptions)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(subscriptions.stripeCustomerId, stripeCustomerId))
      .returning();
    return row;
  }

  async incrementPracticeMinutes(
    subscriberId: string,
    minutes: number,
  ): Promise<Subscription> {
    const sub = await this.rolloverMinutesIfNeeded(subscriberId);
    const [row] = await db
      .update(subscriptions)
      .set({
        practiceMinutesUsed: (sub.practiceMinutesUsed ?? 0) + Math.max(0, minutes),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.subscriberId, subscriberId))
      .returning();
    return row;
  }

  async rolloverMinutesIfNeeded(subscriberId: string): Promise<Subscription> {
    let sub = await this.getSubscription(subscriberId);
    if (!sub) {
      sub = await this.upsertSubscription(subscriberId, {});
    }
    const now = new Date();
    const periodStart = new Date(sub.minutesPeriodStart);
    const monthsElapsed =
      (now.getFullYear() - periodStart.getFullYear()) * 12 +
      (now.getMonth() - periodStart.getMonth());
    if (monthsElapsed >= 1) {
      const [row] = await db
        .update(subscriptions)
        .set({
          practiceMinutesUsed: 0,
          minutesPeriodStart: now,
          updatedAt: now,
        })
        .where(eq(subscriptions.subscriberId, subscriberId))
        .returning();
      return row;
    }
    return sub;
  }

  async createResearch(insert: InsertResearchBundle): Promise<ResearchBundleRow> {
    const [row] = await db.insert(researchBundles).values(insert).returning();
    return row;
  }

  async getResearch(id: number): Promise<ResearchBundleRow | undefined> {
    const [row] = await db
      .select()
      .from(researchBundles)
      .where(eq(researchBundles.id, id))
      .limit(1);
    return row;
  }

  async listResearch(userId?: string | null): Promise<ResearchBundleRow[]> {
    const where = userId
      ? eq(researchBundles.userId, userId)
      : isNull(researchBundles.userId);
    return db
      .select()
      .from(researchBundles)
      .where(where)
      .orderBy(desc(researchBundles.createdAt))
      .limit(50);
  }

  async deleteResearch(id: number): Promise<void> {
    await db.delete(researchBundles).where(eq(researchBundles.id, id));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return u;
  }

  async createPracticeRound(userId: number, round: InsertPracticeRound): Promise<PracticeRound> {
    const [r] = await db
      .insert(practiceRounds)
      .values({
        userId,
        topic: round.topic,
        side: round.side,
        format: round.format,
        transcript: round.transcript,
        feedback: (round.feedback ?? null) as PracticeFeedback | null,
      })
      .returning();
    return r;
  }

  async listPracticeRounds(userId: number): Promise<PracticeRound[]> {
    return db
      .select()
      .from(practiceRounds)
      .where(eq(practiceRounds.userId, userId))
      .orderBy(desc(practiceRounds.createdAt));
  }

  async getPracticeRound(userId: number, id: number): Promise<PracticeRound | undefined> {
    const [r] = await db
      .select()
      .from(practiceRounds)
      .where(and(eq(practiceRounds.id, id), eq(practiceRounds.userId, userId)));
    return r;
  }

  async deletePracticeRound(userId: number, id: number): Promise<boolean> {
    const res = await db
      .delete(practiceRounds)
      .where(and(eq(practiceRounds.id, id), eq(practiceRounds.userId, userId)))
      .returning({ id: practiceRounds.id });
    return res.length > 0;
  }

  async listCoaches(): Promise<Coach[]> {
    return await db.select().from(coaches).orderBy(coaches.id);
  }

  async getCoach(id: number): Promise<Coach | undefined> {
    const [c] = await db.select().from(coaches).where(eq(coaches.id, id));
    return c;
  }

  async upsertCoachBySlug(coach: InsertCoach): Promise<Coach> {
    const [existing] = await db
      .select()
      .from(coaches)
      .where(eq(coaches.slug, coach.slug));
    if (existing) {
      const [updated] = await db
        .update(coaches)
        .set(coach)
        .where(eq(coaches.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(coaches).values(coach).returning();
    return created;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [created] = await db.insert(leads).values(lead).returning();
    return created;
  }

  async listLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async updateLead(id: number, patch: UpdateLead): Promise<Lead | undefined> {
    if (Object.keys(patch).length === 0) {
      const [row] = await db.select().from(leads).where(eq(leads.id, id));
      return row;
    }
    const [updated] = await db
      .update(leads)
      .set(patch)
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }

  async createPracticeShareComment(c: InsertPracticeShareComment): Promise<PracticeShareComment> {
    const [row] = await db.insert(practiceShareComments).values(c).returning();
    return row;
  }

  async listPracticeShareComments(shareId: string): Promise<PracticeShareComment[]> {
    return db
      .select()
      .from(practiceShareComments)
      .where(eq(practiceShareComments.shareId, shareId))
      .orderBy(asc(practiceShareComments.timestampSec), asc(practiceShareComments.createdAt));
  }
}

export const storage = new DatabaseStorage();
