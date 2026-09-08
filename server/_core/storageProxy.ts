import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { authenticateLocalRequest } from "../localAuth";
import { clientes, fotosProntuario, sessoes } from "../../drizzle/schema";
import { getDb } from "../db";
import { storageRead } from "../storage";

export function registerStorageProxy(app: Express) {
  app.get("/storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      if (key.includes("/prontuarios/")) {
        const user = await authenticateLocalRequest(req);
        if (!user) {
          res.status(401).send("Authentication required");
          return;
        }
        const db = await getDb();
        const photo = db ? (await db.select({ clinicaId: fotosProntuario.clinicaId, clienteId: fotosProntuario.clienteId }).from(fotosProntuario).where(eq(fotosProntuario.storageKey, key)).limit(1))[0] : undefined;
        if (!photo || photo.clinicaId !== user.clinicaId) {
          res.status(404).send("Storage object not found");
          return;
        }
        if (user.role !== "admin" && user.role !== "recepcao") {
          const ownClient = user.role === "cliente" || user.role === "user"
            ? Boolean(db && (await db.select({ id: clientes.id }).from(clientes).where(and(eq(clientes.id, photo.clienteId), eq(clientes.clinicaId, user.clinicaId), eq(clientes.userId, user.id))).limit(1))[0])
            : Boolean(db && (await db.select({ id: sessoes.id }).from(sessoes).where(and(eq(sessoes.clinicaId, user.clinicaId), eq(sessoes.clienteId, photo.clienteId), eq(sessoes.profissionalId, user.id))).limit(1))[0]);
          if (!ownClient) {
            res.status(403).send("Storage access denied");
            return;
          }
        }
      }
      const contents = await storageRead(key);
      const extension = key.split(".").pop()?.toLowerCase();
      const contentTypes: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
      res.set("Content-Type", contentTypes[extension ?? ""] ?? "application/octet-stream");
      res.set("Cache-Control", "private, no-store");
      res.send(contents);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        res.status(404).send("Storage object not found");
        return;
      }
      console.error("[Storage] failed:", err);
      res.status(500).send("Storage error");
    }
  });
}
