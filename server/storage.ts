import {
  inquiries,
  practiceShares,
  type InsertInquiry,
  type Inquiry,
  type InsertPracticeShare,
  type PracticeShare,
} from "@shared/schema";
import { db } from "./db";
import { and, eq, lt } from "drizzle-orm";

export interface IStorage {
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  createPracticeShare(share: InsertPracticeShare): Promise<PracticeShare>;
  getPracticeShare(id: string): Promise<PracticeShare | undefined>;
  deletePracticeShare(id: string): Promise<void>;
  listExpiredPracticeShares(now: Date): Promise<PracticeShare[]>;
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
}

export const storage = new DatabaseStorage();
