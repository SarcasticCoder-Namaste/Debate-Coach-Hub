import {
  inquiries,
  practiceShares,
  subscriptions,
  researchBundles,
  type InsertInquiry,
  type Inquiry,
  type InsertPracticeShare,
  type PracticeShare,
  type Subscription,
  type InsertResearchBundle,
  type ResearchBundleRow,
} from "@shared/schema";
import { db } from "./db";
import { and, eq, lt, desc, isNull } from "drizzle-orm";

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
}

function nextPeriodEnd(from: Date, interval: string): Date {
  const end = new Date(from);
  if (interval === "annual") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

export class DatabaseStorage implements IStorage {
  async createInquiry(insertInquiry: InsertInquiry): Promise<Inquiry> {
    const [inquiry] = await db
      .insert(inquiries)
      .values(insertInquiry)
      .returning();
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
}

export const storage = new DatabaseStorage();
