import { onRequest } from "firebase-functions/v2/https";
import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const app = express();
const httpServer = createServer(app);

let initPromise: Promise<void> | null = null;

function ensureInit() {
  if (!initPromise) {
    initPromise = (async () => {
      const { registerStripeWebhook } = await import("../../server/billing");
      const { registerRoutes } = await import("../../server/routes");

      registerStripeWebhook(app);

      app.use(
        express.json({
          limit: "25mb",
          verify: (req, _res, buf) => {
            req.rawBody = buf;
          },
        }),
      );

      app.use(express.urlencoded({ extended: false }));

      await registerRoutes(httpServer, app);

      app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        if (res.headersSent) return next(err);
        return res.status(status).json({ message });
      });
    })();
  }
  return initPromise;
}

export const api = onRequest(
  { region: "us-central1", memory: "512MiB", timeoutSeconds: 60 },
  async (req, res) => {
    await ensureInit();
    app(req as any, res as any);
  },
);
