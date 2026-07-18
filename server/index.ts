import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { registerStripeWebhook } from "./billing";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Stripe webhook MUST be registered before express.json() so the raw body
// is available for signature verification. The webhook does not need session
// state, so it is also registered before session middleware (which is set
// up later by setupSession() inside registerRoutes()).
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

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

const SENSITIVE_FIELDS = new Set(["audio", "transcript", "text", "tip"]);
const MAX_LOG_BODY_CHARS = 500;
const NO_BODY_LOG_PREFIXES = ["/api/practice/"];

function redactForLog(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactForLog);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.has(k)) {
        out[k] = typeof v === "string" ? `[redacted ${v.length} chars]` : "[redacted]";
      } else {
        out[k] = redactForLog(v);
      }
    }
    return out;
  }
  return value;
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: unknown;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      const skipBody = NO_BODY_LOG_PREFIXES.some((p) => path.startsWith(p));
      if (capturedJsonResponse && !skipBody) {
        let snippet = JSON.stringify(redactForLog(capturedJsonResponse));
        if (snippet.length > MAX_LOG_BODY_CHARS) {
          snippet = snippet.slice(0, MAX_LOG_BODY_CHARS) + "…[truncated]";
        }
        logLine += ` :: ${snippet}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      log(`Port ${port} busy — retrying in 1s…`);
      setTimeout(() => {
        httpServer.close();
        httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
          log(`serving on port ${port}`);
        });
      }, 1000);
    } else {
      throw err;
    }
  });

  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    process.on(sig, () => {
      httpServer.close(() => process.exit(0));
    });
  }

  httpServer.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => { log(`serving on port ${port}`); },
  );
})();
