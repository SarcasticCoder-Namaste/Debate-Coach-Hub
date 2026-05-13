import {
  inquiries,
  practiceShares,
  practiceShareComments,
  practiceSessions,
  practiceClips,
  subscriptions,
  researchBundles,
  users,
  practiceRounds,
  coaches,
  leads,
  savedTopics,
  coachReferrals,
  judgeSessions,
  teams,
  teamMembers,
  teamInvites,
  teamAssignments,
  assignmentCompletions,
  sessionComments,
  type InsertInquiry,
  type Inquiry,
  type InsertPracticeShare,
  type PracticeShare,
  type InsertPracticeShareComment,
  type PracticeShareComment,
  type PracticeSession,
  type PracticeClip,
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
  type InsertSavedTopic,
  type SavedTopic,
  type InsertCoachReferral,
  type CoachReferral,
  type InsertJudgeSession,
  type JudgeSession,
  type Team,
  type TeamMember,
  type TeamInvite,
  type TeamAssignment,
  type AssignmentCompletion,
  type SessionComment,
  type CreateAssignment,
  type UserRole,
} from "@shared/schema";
import { db } from "./db";
import { and, asc, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";

export interface IStorage {
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  createPracticeShare(share: InsertPracticeShare): Promise<PracticeShare>;
  getPracticeShare(id: string): Promise<PracticeShare | undefined>;
  deletePracticeShare(id: string): Promise<void>;
  listExpiredPracticeShares(now: Date): Promise<PracticeShare[]>;

  createPracticeSession(
    fields: Omit<PracticeSession, "createdAt">,
  ): Promise<PracticeSession>;
  listPracticeSessions(userEmail: string): Promise<PracticeSession[]>;
  getPracticeSession(id: string): Promise<PracticeSession | undefined>;
  updatePracticeSession(
    id: string,
    userEmail: string,
    fields: Partial<Pick<PracticeSession, "title" | "isFavorite">>,
  ): Promise<PracticeSession | undefined>;
  deletePracticeSession(id: string, userEmail: string): Promise<PracticeSession | undefined>;

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
  claimResearchForUser(fromOwner: string, toOwner: string): Promise<number>;

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
  listPracticeShareCommentsSince(shareId: string, since: Date | null): Promise<PracticeShareComment[]>;
  setPracticeShareNotifiedAt(shareId: string, when: Date): Promise<void>;
  updateUserPreferences(userId: number, prefs: { emailCommentNotifications?: boolean }): Promise<User | undefined>;
  deletePracticeShareComment(shareId: string, commentId: number): Promise<boolean>;

  listSavedTopics(userId: string): Promise<SavedTopic[]>;
  addSavedTopic(input: InsertSavedTopic): Promise<SavedTopic>;
  removeSavedTopic(userId: string, topicId: string): Promise<void>;

  createCoachReferral(referral: InsertCoachReferral): Promise<CoachReferral>;

  createJudgeSession(input: InsertJudgeSession): Promise<JudgeSession>;
  listJudgeSessions(userEmail: string): Promise<JudgeSession[]>;

  setUserRole(userId: number, role: UserRole): Promise<User | undefined>;
  createTeam(ownerId: number, name: string, joinCode: string): Promise<Team>;
  listTeamsForUser(userId: number): Promise<Array<Team & { memberRole: string }>>;
  getTeam(teamId: number): Promise<Team | undefined>;
  getTeamByJoinCode(code: string): Promise<Team | undefined>;
  isTeamCoach(teamId: number, userId: number): Promise<boolean>;
  isTeamMember(teamId: number, userId: number): Promise<boolean>;
  addTeamMember(teamId: number, userId: number, role: "coach" | "student"): Promise<TeamMember>;
  removeTeamMember(teamId: number, userId: number): Promise<void>;
  listTeamMembers(teamId: number): Promise<Array<TeamMember & { user: Pick<User, "id" | "email" | "name"> }>>;
  listTeamInvites(teamId: number): Promise<TeamInvite[]>;
  createTeamInvite(teamId: number, email: string, invitedBy: number): Promise<TeamInvite>;

  createAssignment(teamId: number, createdBy: number, data: CreateAssignment): Promise<TeamAssignment>;
  listAssignmentsForTeam(teamId: number): Promise<TeamAssignment[]>;
  listAssignmentsForUser(userId: number): Promise<Array<TeamAssignment & { teamName: string; completedAt: Date | null }>>;
  markAssignmentComplete(assignmentId: number, userId: number, roundId: number | null): Promise<AssignmentCompletion>;
  listAssignmentCompletions(assignmentId: number): Promise<AssignmentCompletion[]>;
  getAssignment(id: number): Promise<TeamAssignment | undefined>;

  listRoundsForUser(userId: number, limit?: number): Promise<PracticeRound[]>;
  getRoundById(id: number): Promise<PracticeRound | undefined>;

  createSessionComment(roundId: number, authorId: number, body: string): Promise<SessionComment>;
  listSessionComments(roundId: number): Promise<Array<SessionComment & { authorName: string | null; authorEmail: string }>>;

  createPracticeClip(clip: PracticeClip): Promise<PracticeClip>;
  getPracticeClip(id: string): Promise<PracticeClip | undefined>;
  listPracticeClipsBySession(sessionId: string, userEmail: string): Promise<PracticeClip[]>;
  incrementClipViewCount(id: string): Promise<void>;
  deletePracticeClip(id: string, userEmail: string): Promise<PracticeClip | undefined>;
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

  async createPracticeSession(
    fields: Omit<PracticeSession, "createdAt">,
  ): Promise<PracticeSession> {
    const [row] = await db.insert(practiceSessions).values(fields).returning();
    return row;
  }

  async listPracticeSessions(userEmail: string): Promise<PracticeSession[]> {
    return db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.userEmail, userEmail))
      .orderBy(desc(practiceSessions.createdAt));
  }

  async getPracticeSession(id: string): Promise<PracticeSession | undefined> {
    const [row] = await db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.id, id));
    return row;
  }

  async updatePracticeSession(
    id: string,
    userEmail: string,
    fields: Partial<Pick<PracticeSession, "title" | "isFavorite">>,
  ): Promise<PracticeSession | undefined> {
    const [row] = await db
      .update(practiceSessions)
      .set(fields)
      .where(and(eq(practiceSessions.id, id), eq(practiceSessions.userEmail, userEmail)))
      .returning();
    return row;
  }

  async deletePracticeSession(
    id: string,
    userEmail: string,
  ): Promise<PracticeSession | undefined> {
    const [row] = await db
      .delete(practiceSessions)
      .where(and(eq(practiceSessions.id, id), eq(practiceSessions.userEmail, userEmail)))
      .returning();
    return row;
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

  async claimResearchForUser(fromOwner: string, toOwner: string): Promise<number> {
    if (!fromOwner || !toOwner || fromOwner === toOwner) return 0;
    const rows = await db
      .update(researchBundles)
      .set({ userId: toOwner })
      .where(eq(researchBundles.userId, fromOwner))
      .returning({ id: researchBundles.id });
    return rows.length;
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

  async createPracticeClip(clip: PracticeClip): Promise<PracticeClip> {
    const [row] = await db.insert(practiceClips).values(clip).returning();
    return row;
  }

  async getPracticeClip(id: string): Promise<PracticeClip | undefined> {
    const [row] = await db.select().from(practiceClips).where(eq(practiceClips.id, id));
    return row;
  }

  async listPracticeClipsBySession(
    sessionId: string,
    userEmail: string,
  ): Promise<PracticeClip[]> {
    return db
      .select()
      .from(practiceClips)
      .where(and(eq(practiceClips.sessionId, sessionId), eq(practiceClips.userEmail, userEmail)))
      .orderBy(desc(practiceClips.createdAt));
  }

  async incrementClipViewCount(id: string): Promise<void> {
    const existing = await this.getPracticeClip(id);
    if (!existing) return;
    await db
      .update(practiceClips)
      .set({ viewCount: existing.viewCount + 1 })
      .where(eq(practiceClips.id, id));
  }

  async deletePracticeClip(id: string, userEmail: string): Promise<PracticeClip | undefined> {
    const [row] = await db
      .delete(practiceClips)
      .where(and(eq(practiceClips.id, id), eq(practiceClips.userEmail, userEmail)))
      .returning();
    return row;
  }

  async listPracticeShareComments(shareId: string): Promise<PracticeShareComment[]> {
    return db
      .select()
      .from(practiceShareComments)
      .where(eq(practiceShareComments.shareId, shareId))
      .orderBy(asc(practiceShareComments.timestampSec), asc(practiceShareComments.createdAt));
  }

  async listPracticeShareCommentsSince(
    shareId: string,
    since: Date | null,
  ): Promise<PracticeShareComment[]> {
    const where = since
      ? and(
          eq(practiceShareComments.shareId, shareId),
          gt(practiceShareComments.createdAt, since),
        )
      : eq(practiceShareComments.shareId, shareId);
    return db
      .select()
      .from(practiceShareComments)
      .where(where)
      .orderBy(asc(practiceShareComments.createdAt));
  }

  async setPracticeShareNotifiedAt(shareId: string, when: Date): Promise<void> {
    await db
      .update(practiceShares)
      .set({ lastCommentNotifiedAt: when })
      .where(eq(practiceShares.id, shareId));
  }

  async updateUserPreferences(
    userId: number,
    prefs: { emailCommentNotifications?: boolean },
  ): Promise<User | undefined> {
    if (Object.keys(prefs).length === 0) return this.getUserById(userId);
    const [row] = await db
      .update(users)
      .set(prefs)
      .where(eq(users.id, userId))
      .returning();
    return row;
  }

  async deletePracticeShareComment(shareId: string, commentId: number): Promise<boolean> {
    const result = await db
      .delete(practiceShareComments)
      .where(
        and(
          eq(practiceShareComments.id, commentId),
          eq(practiceShareComments.shareId, shareId),
        ),
      )
      .returning({ id: practiceShareComments.id });
    return result.length > 0;
  }

  async listSavedTopics(userId: string): Promise<SavedTopic[]> {
    return db
      .select()
      .from(savedTopics)
      .where(eq(savedTopics.userId, userId))
      .orderBy(desc(savedTopics.createdAt));
  }

  async addSavedTopic(input: InsertSavedTopic): Promise<SavedTopic> {
    const [row] = await db
      .insert(savedTopics)
      .values(input)
      .onConflictDoUpdate({
        target: [savedTopics.userId, savedTopics.topicId],
        set: { createdAt: new Date() },
      })
      .returning();
    return row;
  }

  async removeSavedTopic(userId: string, topicId: string): Promise<void> {
    await db
      .delete(savedTopics)
      .where(
        and(
          eq(savedTopics.userId, userId),
          eq(savedTopics.topicId, topicId),
        ),
      );
  }

  async createCoachReferral(referral: InsertCoachReferral): Promise<CoachReferral> {
    const [row] = await db.insert(coachReferrals).values(referral).returning();
    return row;
  }

  async createJudgeSession(input: InsertJudgeSession): Promise<JudgeSession> {
    const [row] = await db.insert(judgeSessions).values(input).returning();
    return row;
  }

  async listJudgeSessions(userEmail: string): Promise<JudgeSession[]> {
    return db
      .select()
      .from(judgeSessions)
      .where(eq(judgeSessions.userEmail, userEmail))
      .orderBy(desc(judgeSessions.createdAt))
      .limit(50);
  }

  async setUserRole(userId: number, role: UserRole): Promise<User | undefined> {
    const [u] = await db.update(users).set({ role }).where(eq(users.id, userId)).returning();
    return u;
  }

  async createTeam(ownerId: number, name: string, joinCode: string): Promise<Team> {
    const [t] = await db.insert(teams).values({ name, ownerId, joinCode }).returning();
    await db.insert(teamMembers).values({ teamId: t.id, userId: ownerId, role: "coach" });
    return t;
  }

  async listTeamsForUser(
    userId: number,
  ): Promise<Array<Team & { memberRole: string }>> {
    const rows = await db
      .select({
        id: teams.id,
        name: teams.name,
        ownerId: teams.ownerId,
        joinCode: teams.joinCode,
        createdAt: teams.createdAt,
        memberRole: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, userId))
      .orderBy(desc(teams.createdAt));
    return rows;
  }

  async getTeam(teamId: number): Promise<Team | undefined> {
    const [t] = await db.select().from(teams).where(eq(teams.id, teamId));
    return t;
  }

  async getTeamByJoinCode(code: string): Promise<Team | undefined> {
    const [t] = await db.select().from(teams).where(eq(teams.joinCode, code));
    return t;
  }

  async isTeamCoach(teamId: number, userId: number): Promise<boolean> {
    const [m] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId),
          eq(teamMembers.role, "coach"),
        ),
      );
    return !!m;
  }

  async isTeamMember(teamId: number, userId: number): Promise<boolean> {
    const [m] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    return !!m;
  }

  async addTeamMember(
    teamId: number,
    userId: number,
    role: "coach" | "student",
  ): Promise<TeamMember> {
    const existing = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    if (existing[0]) return existing[0];
    const [m] = await db
      .insert(teamMembers)
      .values({ teamId, userId, role })
      .returning();
    return m;
  }

  async removeTeamMember(teamId: number, userId: number): Promise<void> {
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  }

  async listTeamMembers(
    teamId: number,
  ): Promise<Array<TeamMember & { user: Pick<User, "id" | "email" | "name"> }>> {
    const rows = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        userId2: users.id,
        email: users.email,
        name: users.name,
      })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.userId))
      .where(eq(teamMembers.teamId, teamId))
      .orderBy(asc(teamMembers.role), asc(users.email));
    return rows.map((r) => ({
      id: r.id,
      teamId: r.teamId,
      userId: r.userId,
      role: r.role,
      joinedAt: r.joinedAt,
      user: { id: r.userId2, email: r.email, name: r.name },
    }));
  }

  async listTeamInvites(teamId: number): Promise<TeamInvite[]> {
    return db
      .select()
      .from(teamInvites)
      .where(eq(teamInvites.teamId, teamId))
      .orderBy(desc(teamInvites.createdAt));
  }

  async createTeamInvite(
    teamId: number,
    email: string,
    invitedBy: number,
  ): Promise<TeamInvite> {
    const [inv] = await db
      .insert(teamInvites)
      .values({ teamId, email: email.toLowerCase(), invitedBy })
      .returning();
    return inv;
  }

  async createAssignment(
    teamId: number,
    createdBy: number,
    data: CreateAssignment,
  ): Promise<TeamAssignment> {
    const [a] = await db
      .insert(teamAssignments)
      .values({
        teamId,
        createdBy,
        kind: data.kind ?? "topic",
        title: data.title,
        topic: data.topic ?? null,
        format: data.format ?? null,
        side: data.side ?? null,
        description: data.description ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        targetUserIds: data.targetUserIds && data.targetUserIds.length > 0 ? data.targetUserIds : null,
      })
      .returning();
    return a;
  }

  async getAssignment(id: number): Promise<TeamAssignment | undefined> {
    const [a] = await db.select().from(teamAssignments).where(eq(teamAssignments.id, id));
    return a;
  }

  async listAssignmentsForTeam(teamId: number): Promise<TeamAssignment[]> {
    return db
      .select()
      .from(teamAssignments)
      .where(eq(teamAssignments.teamId, teamId))
      .orderBy(desc(teamAssignments.createdAt));
  }

  async listAssignmentsForUser(
    userId: number,
  ): Promise<Array<TeamAssignment & { teamName: string; completedAt: Date | null }>> {
    const memberRows = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));
    const teamIds = memberRows.map((r) => r.teamId);
    if (teamIds.length === 0) return [];
    const rows = await db
      .select({
        a: teamAssignments,
        teamName: teams.name,
        completedAt: assignmentCompletions.completedAt,
      })
      .from(teamAssignments)
      .innerJoin(teams, eq(teams.id, teamAssignments.teamId))
      .leftJoin(
        assignmentCompletions,
        and(
          eq(assignmentCompletions.assignmentId, teamAssignments.id),
          eq(assignmentCompletions.userId, userId),
        ),
      )
      .where(inArray(teamAssignments.teamId, teamIds))
      .orderBy(desc(teamAssignments.createdAt));
    return rows
      .filter((r) => {
        const t = r.a.targetUserIds;
        return !t || t.length === 0 || t.includes(userId);
      })
      .map((r) => ({ ...r.a, teamName: r.teamName, completedAt: r.completedAt }));
  }

  async markAssignmentComplete(
    assignmentId: number,
    userId: number,
    roundId: number | null,
  ): Promise<AssignmentCompletion> {
    const [existing] = await db
      .select()
      .from(assignmentCompletions)
      .where(
        and(
          eq(assignmentCompletions.assignmentId, assignmentId),
          eq(assignmentCompletions.userId, userId),
        ),
      );
    if (existing) return existing;
    const [c] = await db
      .insert(assignmentCompletions)
      .values({ assignmentId, userId, roundId })
      .returning();
    return c;
  }

  async listAssignmentCompletions(assignmentId: number): Promise<AssignmentCompletion[]> {
    return db
      .select()
      .from(assignmentCompletions)
      .where(eq(assignmentCompletions.assignmentId, assignmentId));
  }

  async listRoundsForUser(userId: number, limit = 50): Promise<PracticeRound[]> {
    return db
      .select()
      .from(practiceRounds)
      .where(eq(practiceRounds.userId, userId))
      .orderBy(desc(practiceRounds.createdAt))
      .limit(limit);
  }

  async getRoundById(id: number): Promise<PracticeRound | undefined> {
    const [r] = await db.select().from(practiceRounds).where(eq(practiceRounds.id, id));
    return r;
  }

  async createSessionComment(
    roundId: number,
    authorId: number,
    body: string,
  ): Promise<SessionComment> {
    const [c] = await db
      .insert(sessionComments)
      .values({ roundId, authorId, body })
      .returning();
    return c;
  }

  async listSessionComments(
    roundId: number,
  ): Promise<Array<SessionComment & { authorName: string | null; authorEmail: string }>> {
    const rows = await db
      .select({
        id: sessionComments.id,
        roundId: sessionComments.roundId,
        authorId: sessionComments.authorId,
        body: sessionComments.body,
        createdAt: sessionComments.createdAt,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(sessionComments)
      .innerJoin(users, eq(users.id, sessionComments.authorId))
      .where(eq(sessionComments.roundId, roundId))
      .orderBy(asc(sessionComments.createdAt));
    return rows;
  }
}

export const storage = new DatabaseStorage();
