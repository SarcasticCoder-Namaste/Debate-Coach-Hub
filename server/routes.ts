import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertInquirySchema } from "@shared/schema";
import { registerPracticeRoutes } from "./practice";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.post("/api/inquiries", async (req, res) => {
    try {
      const data = insertInquirySchema.parse(req.body);
      const inquiry = await storage.createInquiry(data);
      res.status(201).json(inquiry);
    } catch (error) {
      res.status(400).json({ message: "Invalid inquiry data" });
    }
  });

  registerPracticeRoutes(app);

  return httpServer;
}
