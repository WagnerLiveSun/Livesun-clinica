import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { dispatchDueReminderEmails } from "../reminders";
import { registerStorageProxy } from "./storageProxy";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(port, () => probe.close(() => resolve(true)));
    probe.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`Nenhuma porta disponível a partir de ${startPort}.`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const publicDir = path.resolve(process.cwd(), "public");
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  app.post("/api/scheduled/send-reminders", async (req, res) => {
    const authorization = req.get("authorization") ?? "";
    if (!ENV.schedulerSecret || authorization !== `Bearer ${ENV.schedulerSecret}`) {
      res.status(403).json({ error: "scheduler-only" });
      return;
    }
    try {
      res.json({ ok: true, ...(await dispatchDueReminderEmails()) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app.use(express.static(publicDir));
  app.use("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
  const port = await findAvailablePort(Number(process.env.PORT || 3000));
  server.listen(port, () => {
    console.log(`LiveSun Clinicas disponível em http://localhost:${port}/`);
    if (ENV.reminderIntervalMs > 0) {
      setInterval(() => void dispatchDueReminderEmails().catch((error) => console.error("[Lembretes]", error)), ENV.reminderIntervalMs);
    }
  });
}

startServer().catch((error) => {
  console.error("Não foi possível iniciar o LiveSun Clinicas:", error);
  process.exitCode = 1;
});
