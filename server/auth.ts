import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { pool } from "./db";
import { storage } from "./storage";
import { signinSchema, signupSchema, userPreferencesSchema, type User } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const known = Buffer.from(hash, "hex");
  if (test.length !== known.length) return false;
  return timingSafeEqual(test, known);
}

function publicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    emailCommentNotifications: u.emailCommentNotifications,
  };
}

export function setupSession(app: Express) {
  const PgStore = connectPgSimple(session);
  const store = new PgStore({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: true,
  });

  const secret =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("SESSION_SECRET must be set in production");
        })()
      : "dev-secret-change-me");

  app.set("trust proxy", 1);
  app.use(
    session({
      store,
      secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 30,
      },
    }),
  );
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Sign in required" });
  }
  next();
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/signup", async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid email or password (min 6 chars)" });
    }
    const email = parsed.data.email.toLowerCase();
    try {
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ error: "An account with this email already exists" });
      const user = await storage.createUser({
        email,
        name: parsed.data.name ?? null,
        passwordHash: hashPassword(parsed.data.password),
      });
      req.session.userId = user.id;
      res.status(201).json({ user: publicUser(user) });
    } catch (err) {
      console.error("signup error", err);
      res.status(500).json({ error: "Sign-up failed" });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    const parsed = signinSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
    try {
      const user = await storage.getUserByEmail(parsed.data.email);
      if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
        return res.status(401).json({ error: "Incorrect email or password" });
      }
      req.session.userId = user.id;
      res.json({ user: publicUser(user) });
    } catch (err) {
      console.error("signin error", err);
      res.status(500).json({ error: "Sign-in failed" });
    }
  });

  app.post("/api/auth/signout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.json({ user: null });
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.json({ user: null });
    }
    res.json({ user: publicUser(user) });
  });

  app.patch("/api/auth/preferences", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Sign in required" });
    }
    const parsed = userPreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid preferences" });
    }
    try {
      const updated = await storage.updateUserPreferences(
        req.session.userId,
        parsed.data,
      );
      if (!updated) return res.status(404).json({ error: "User not found" });
      res.json({ user: publicUser(updated) });
    } catch (err) {
      console.error("preferences update error", err);
      res.status(500).json({ error: "Could not update preferences" });
    }
  });
}
