import type { Express, Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import {
  insertTeamSchema,
  inviteTeamSchema,
  createAssignmentSchema,
  createSessionCommentSchema,
} from "@shared/schema";

function genJoinCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function requireTeamCoach(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.session.userId!;
  const teamId = Number(req.params.id || req.params.teamId);
  if (!Number.isFinite(teamId)) {
    return res.status(400).json({ error: "Invalid team id" });
  }
  const ok = await storage.isTeamCoach(teamId, userId);
  if (!ok) return res.status(403).json({ error: "Coach access required" });
  (req as any).teamId = teamId;
  next();
}

async function requireTeamMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.session.userId!;
  const teamId = Number(req.params.id || req.params.teamId);
  if (!Number.isFinite(teamId)) {
    return res.status(400).json({ error: "Invalid team id" });
  }
  const ok = await storage.isTeamMember(teamId, userId);
  if (!ok) return res.status(403).json({ error: "Team membership required" });
  (req as any).teamId = teamId;
  next();
}

export function registerTeamRoutes(app: Express) {
  // List teams the current user belongs to
  app.get("/api/teams", requireAuth, async (req, res) => {
    const teams = await storage.listTeamsForUser(req.session.userId!);
    res.json({ teams });
  });

  // Create team — promotes the user to coach role
  app.post("/api/teams", requireAuth, async (req, res) => {
    const parsed = insertTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Team name is required" });
    }
    const userId = req.session.userId!;
    const code = genJoinCode();
    const team = await storage.createTeam(userId, parsed.data.name, code);
    await storage.setUserRole(userId, "coach");
    res.status(201).json({ team });
  });

  // Get team detail with roster, invites, assignments (coach view)
  app.get("/api/teams/:id", requireAuth, requireTeamMember, async (req, res) => {
    const teamId = (req as any).teamId as number;
    const team = await storage.getTeam(teamId);
    if (!team) return res.status(404).json({ error: "Not found" });
    const isCoach = await storage.isTeamCoach(teamId, req.session.userId!);
    const members = await storage.listTeamMembers(teamId);
    const assignments = await storage.listAssignmentsForTeam(teamId);
    const invites = isCoach ? await storage.listTeamInvites(teamId) : [];

    // Build per-student stats
    const completionsByAssignment = new Map<number, number[]>();
    for (const a of assignments) {
      const cs = await storage.listAssignmentCompletions(a.id);
      completionsByAssignment.set(a.id, cs.map((c) => c.userId));
    }

    const memberStats = await Promise.all(
      members.map(async (m) => {
        const rounds = await storage.listRoundsForUser(m.userId, 50);
        const scored = rounds.filter((r) => r.feedback?.overallScore != null);
        const avg =
          scored.length > 0
            ? Math.round(
                scored.reduce(
                  (s, r) => s + (r.feedback?.overallScore || 0),
                  0,
                ) / scored.length,
              )
            : null;
        // Streak = consecutive days with at least one round, ending today/yesterday
        const days = new Set(
          rounds.map((r) => new Date(r.createdAt).toDateString()),
        );
        let streak = 0;
        const cursor = new Date();
        if (!days.has(cursor.toDateString())) {
          cursor.setDate(cursor.getDate() - 1);
        }
        while (days.has(cursor.toDateString())) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        }
        const recent = rounds.slice(0, 5).map((r) => ({
          id: r.id,
          topic: r.topic,
          format: r.format,
          side: r.side,
          score: r.feedback?.overallScore ?? null,
          createdAt: r.createdAt,
        }));
        // Assignment status counts
        const applicable = assignments.filter(
          (a) =>
            !a.targetUserIds ||
            a.targetUserIds.length === 0 ||
            a.targetUserIds.includes(m.userId),
        );
        const completed = applicable.filter((a) =>
          (completionsByAssignment.get(a.id) || []).includes(m.userId),
        ).length;
        return {
          userId: m.userId,
          email: m.user.email,
          name: m.user.name,
          role: m.role,
          joinedAt: m.joinedAt,
          totalRounds: rounds.length,
          avgScore: avg,
          streakDays: streak,
          assignmentsAssigned: applicable.length,
          assignmentsCompleted: completed,
          recent,
        };
      }),
    );

    const assignmentsWithStatus = assignments.map((a) => ({
      ...a,
      completionCount: (completionsByAssignment.get(a.id) || []).length,
    }));

    res.json({
      team,
      isCoach,
      members: memberStats,
      invites,
      assignments: assignmentsWithStatus,
      joinUrl: `/teams/join/${team.joinCode}`,
    });
  });

  // Invite by emails (records the invite; "email send" is stubbed/best-effort)
  app.post(
    "/api/teams/:id/invites",
    requireAuth,
    requireTeamCoach,
    async (req, res) => {
      const parsed = inviteTeamSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Provide at least one valid email" });
      }
      const teamId = (req as any).teamId as number;
      const userId = req.session.userId!;
      const created = [];
      for (const email of parsed.data.emails) {
        created.push(await storage.createTeamInvite(teamId, email, userId));
      }
      res.status(201).json({ invites: created });
    },
  );

  // Lookup team by join code (for accept page preview)
  app.get("/api/teams/join/:code", async (req, res) => {
    const t = await storage.getTeamByJoinCode(String(req.params.code));
    if (!t) return res.status(404).json({ error: "Invalid join code" });
    res.json({ team: { id: t.id, name: t.name, joinCode: t.joinCode } });
  });

  // Accept join code — adds current user as student
  app.post("/api/teams/join/:code", requireAuth, async (req, res) => {
    const t = await storage.getTeamByJoinCode(String(req.params.code));
    if (!t) return res.status(404).json({ error: "Invalid join code" });
    await storage.addTeamMember(t.id, req.session.userId!, "student");
    res.json({ team: t });
  });

  // Remove member (coach only)
  app.delete(
    "/api/teams/:id/members/:userId",
    requireAuth,
    requireTeamCoach,
    async (req, res) => {
      const teamId = (req as any).teamId as number;
      const targetId = Number(req.params.userId);
      if (!Number.isFinite(targetId)) {
        return res.status(400).json({ error: "Invalid user id" });
      }
      const team = await storage.getTeam(teamId);
      if (team && team.ownerId === targetId) {
        return res.status(400).json({ error: "Cannot remove the team owner" });
      }
      await storage.removeTeamMember(teamId, targetId);
      res.json({ ok: true });
    },
  );

  // Create assignment
  app.post(
    "/api/teams/:id/assignments",
    requireAuth,
    requireTeamCoach,
    async (req, res) => {
      const parsed = createAssignmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "Invalid assignment", issues: parsed.error.flatten() });
      }
      const teamId = (req as any).teamId as number;
      const a = await storage.createAssignment(
        teamId,
        req.session.userId!,
        parsed.data,
      );
      res.status(201).json({ assignment: a });
    },
  );

  // Student-facing list of their assignments across teams
  app.get("/api/my/assignments", requireAuth, async (req, res) => {
    const list = await storage.listAssignmentsForUser(req.session.userId!);
    res.json({ assignments: list });
  });

  // Mark assignment complete (student)
  app.post(
    "/api/my/assignments/:id/complete",
    requireAuth,
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id))
        return res.status(400).json({ error: "Invalid id" });
      const a = await storage.getAssignment(id);
      if (!a) return res.status(404).json({ error: "Not found" });
      const member = await storage.isTeamMember(a.teamId, req.session.userId!);
      if (!member) return res.status(403).json({ error: "Not in team" });
      const roundIdRaw = (req.body && req.body.roundId) as unknown;
      const roundId =
        typeof roundIdRaw === "number" && Number.isFinite(roundIdRaw)
          ? roundIdRaw
          : null;
      const c = await storage.markAssignmentComplete(
        id,
        req.session.userId!,
        roundId,
      );
      res.json({ completion: c });
    },
  );

  // Coach views a student session (round) detail
  app.get("/api/teams/:id/rounds/:roundId", requireAuth, async (req, res) => {
    const teamId = Number(req.params.id);
    const roundId = Number(req.params.roundId);
    if (!Number.isFinite(teamId) || !Number.isFinite(roundId)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const userId = req.session.userId!;
    const isCoach = await storage.isTeamCoach(teamId, userId);
    const round = await storage.getRoundById(roundId);
    if (!round) return res.status(404).json({ error: "Not found" });
    const studentInTeam = await storage.isTeamMember(teamId, round.userId);
    if (!isCoach || !studentInTeam) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const comments = await storage.listSessionComments(roundId);
    res.json({ round, comments });
  });

  // Get a round + comments for the student (their own)
  app.get("/api/my/rounds/:id/detail", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "Invalid id" });
    const round = await storage.getRoundById(id);
    if (!round || round.userId !== req.session.userId!) {
      return res.status(404).json({ error: "Not found" });
    }
    const comments = await storage.listSessionComments(id);
    res.json({ round, comments });
  });

  // Add a comment to a round. Either the round owner or a coach of a team
  // the student belongs to may comment.
  app.post("/api/rounds/:id/comments", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "Invalid id" });
    const parsed = createSessionCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Comment is required" });
    }
    const round = await storage.getRoundById(id);
    if (!round) return res.status(404).json({ error: "Not found" });
    const userId = req.session.userId!;
    let allowed = round.userId === userId;
    if (!allowed) {
      // Check if user is a coach in any team the student belongs to
      const studentTeams = await storage.listTeamsForUser(round.userId);
      for (const t of studentTeams) {
        if (await storage.isTeamCoach(t.id, userId)) {
          allowed = true;
          break;
        }
      }
    }
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
    const c = await storage.createSessionComment(id, userId, parsed.data.body);
    res.status(201).json({ comment: c });
  });
}
