import type { Express } from "express";

/** Identifica a versão implantada; não informa o estado do banco nem do serviço. */
export function registerTrialVersion(app: Express): void {
  app.get("/api/status/trial", (_req, res) => {
    res.set("Cache-Control", "no-store").json({ trialVersion: "20261125-1" });
  });
}