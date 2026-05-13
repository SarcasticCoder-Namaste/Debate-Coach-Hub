import type { Express, Request, Response } from "express";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userEmail?: string;
  }
}

const signInSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
});

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/session", (req: Request, res: Response) => {
    const email = req.session?.userEmail ?? null;
    res.json({ email, signedIn: !!email });
  });

  // Lightweight session-only sign-in. There is no password verification yet —
  // this just records the email on the session so other routes (e.g. share
  // expiry) can treat the user as signed in. Real account auth is a separate
  // future task; until then this gives us an explicit "signed in" signal.
  app.post("/api/auth/signin", (req: Request, res: Response) => {
    const parsed = signInSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Enter a valid email." });
    }
    req.session.userEmail = parsed.data.email.toLowerCase().trim();
    req.session.save((err) => {
      if (err) {
        console.error("session save error", err);
        return res.status(500).json({ error: "Could not start session" });
      }
      res.json({ email: req.session.userEmail, signedIn: true });
    });
  });

  app.post("/api/auth/signout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("session destroy error", err);
        return res.status(500).json({ error: "Could not sign out" });
      }
      res.clearCookie("dm.sid");
      res.json({ signedIn: false });
    });
  });
}
