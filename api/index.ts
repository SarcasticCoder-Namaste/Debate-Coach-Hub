import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";
import { registerStripeWebhook } from "../server/billing";

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

export default async function handler(req: Request, res: Response) {
  await ensureInit();
  app(req, res);
}
