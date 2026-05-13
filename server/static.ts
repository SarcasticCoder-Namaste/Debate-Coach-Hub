import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { buildClipMetaTags } from "./clips";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  const indexPath = path.resolve(distPath, "index.html");

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", async (req, res) => {
    const clipMatch = req.path.match(/^\/clips\/([A-Za-z0-9_-]{6,16})(?:[/?#].*)?$/);
    if (clipMatch) {
      try {
        const origin = `${req.protocol}://${req.get("host")}`;
        const meta = await buildClipMetaTags(clipMatch[1], origin);
        if (meta) {
          const html = await fs.promises.readFile(indexPath, "utf-8");
          const injected = html.replace("</head>", `    ${meta}\n  </head>`);
          res.set("Content-Type", "text/html").send(injected);
          return;
        }
      } catch (err) {
        console.warn("clip OG meta inject failed:", err);
      }
    }
    res.sendFile(indexPath);
  });
}
