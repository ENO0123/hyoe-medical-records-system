import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./vite";
import { sdk } from "./sdk";
import * as db from "../db";
import { driveGetFileStream } from "../googleDrive";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Protected image streaming endpoint (Google Drive)
  app.get("/api/test-result-images/:id/content", async (req, res) => {
    let user: Awaited<ReturnType<typeof sdk.authenticateRequest>>;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).send("Unauthorized");
      return;
    }

    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).send("Invalid id");
        return;
      }

      const image = await db.getTestResultImageById(id);
      if (!image) {
        res.status(404).send("Not found");
        return;
      }

      const patient = await db.getPatientById(image.patientId);
      if (!patient) {
        res.status(404).send("Not found");
        return;
      }

      if (user.role !== "admin") {
        const doctor = await db.getDoctorByUserId(user.id);
        if (patient.doctorId !== doctor?.id) {
          res.status(403).send("Forbidden");
          return;
        }
      }

      if (typeof image.imageUrl !== "string" || !image.imageUrl.startsWith("gdrive:")) {
        res.status(404).send("Not found");
        return;
      }

      const fileId = image.imageUrl.slice("gdrive:".length);
      if (!fileId) {
        res.status(500).send("Invalid image reference");
        return;
      }

      const { stream, contentType } = await driveGetFileStream(fileId);
      res.setHeader(
        "content-type",
        image.mimeType || contentType || "application/octet-stream"
      );
      res.setHeader("cache-control", "private, max-age=60");
      stream.on("error", err => {
        console.error("[image-stream] stream error:", err);
        if (!res.headersSent) res.status(500);
        res.end();
      });
      stream.pipe(res);
    } catch (err) {
      console.error("[image-stream] handler error:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
