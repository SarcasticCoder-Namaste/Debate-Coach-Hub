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
