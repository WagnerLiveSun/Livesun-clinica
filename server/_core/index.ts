import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ENV } from "./env";
import { dispatchDueReminderEmails } from "../reminders";
import { serveStatic, setupVite } from "./vite";
import { registerCentralLinkRoute } from "../centralLinkRoute";
import { deliverPendingRegistrations } from "../centralRegistrationOutbox";
import { registrationConfig } from "../registrationConfig";
import { registerCentralCompanies } from "../centralCompanies";
import { registerPublicRegistrationRoute } from "../publicRegistrationRoute";

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
  if (process.env.NODE_ENV === "production" && process.env.PUBLIC_REGISTRATION_ENABLED === "true") {
    const { problems } = registrationConfig(process.env);
    if (problems.length) console.error(`[Cadastro] Indisponível até corrigir: ${problems.join(", ")}. Nenhum valor de segredo é exibido.`);
  }
  const testDatabase = (() => { try { const url = new URL(process.env.DATABASE_URL ?? ""); return url.protocol === "mysql:" && ["127.0.0.1", "localhost"].includes(url.hostname) && url.pathname === "/clinica_cadastro_duplo_homologacao_20261124"; } catch { return false; } })();
  registerCentralLinkRoute(app, process.env.CENTRAL_WEBHOOK_SECRET ?? "", process.env.CENTRAL_ENABLED === "true" || (process.env.NODE_ENV !== "production" && process.env.CLINICA_CADASTRO_HOMOLOGACAO === "1" && testDatabase));
  registerCentralCompanies(app, process.env.CENTRAL_WEBHOOK_SECRET ?? "", process.env.CENTRAL_ENABLED === "true");
  registerPublicRegistrationRoute(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  app.post("/api/scheduled/send-reminders", async (req, res) => {
    try {
      const authorization = req.get("authorization") ?? "";
      if (!ENV.schedulerSecret || authorization !== `Bearer ${ENV.schedulerSecret}`) return res.status(403).json({ error: "scheduler-only" });
      const result = await dispatchDueReminderEmails();
      return res.json({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Lembretes] Falha no callback agendado:", error);
      return res.status(500).json({ error: message, timestamp: new Date().toISOString(), context: { url: req.originalUrl } });
    }
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, process.env.HOST || undefined, () => {
    console.log(`Server running on http://localhost:${port}/`);
    if (ENV.reminderIntervalMs > 0) {
      setInterval(() => { void dispatchDueReminderEmails().catch((error) => console.error("[Lembretes] Falha no scheduler interno:", error)); }, ENV.reminderIntervalMs);
    }
    if (process.env.CENTRAL_ENABLED === "true") {
      const dispatch = () => deliverPendingRegistrations({ baseUrl: process.env.CENTRAL_BASE_URL ?? "", apiToken: process.env.CENTRAL_API_TOKEN ?? "", environment: process.env.NODE_ENV ?? "production", allowLocalHttp: process.env.CENTRAL_ALLOW_LOCAL_HTTP === "true" }).catch(() => console.error("[Central] Falha no processamento de cadastros."));
      void dispatch();
      setInterval(() => void dispatch(), 60000);
    }
  });
}

startServer().catch(error => { console.error("Falha na inicialização:", error instanceof Error ? error.message : "erro interno"); process.exitCode = 1; });
