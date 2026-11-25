import express, { type Express } from "express";
import { applyCentralLink } from "./centralLink";
import { verifyCentralSignature } from "./centralProtocol";
import { applyCentralWebhook } from "./centralWebhook";
import { createHmac } from "node:crypto";

/** Contrato idêntico ao Central/Propostas; habilitado apenas em homologação. */
export function registerCentralLinkRoute(app: Express, secret: string, enabled: boolean) {
  app.post("/central/cadastros/vincular", express.raw({ type: "application/json", limit: "128kb" }), async (req, res) => {
    if (!enabled || secret.length < 32) return res.sendStatus(503);
    if (!Buffer.isBuffer(req.body) || req.get("X-LiveSun-Event") !== "CADASTRO_HABILITADO" || !verifyCentralSignature(secret, req.get("X-LiveSun-Timestamp") ?? "", req.get("X-LiveSun-Signature") ?? "", req.body)) return res.sendStatus(401);
    let payload: unknown;
    try { payload = JSON.parse(req.body.toString("utf8")); } catch { return res.sendStatus(422); }
    const result = await applyCentralLink(payload);
    if (result.status !== 200) return res.sendStatus(result.status);
    return res.status(200).json({ evento_id: result.evento_id, empresa_id: result.empresa_id, cliente_id: result.cliente_id, status: "VINCULADA" });
  });
  app.post("/webhooks/assinatura", express.raw({ type: "application/json", limit: "128kb" }), async (req, res) => {
    if (!enabled || secret.length < 32) return res.sendStatus(503);
    if (!Buffer.isBuffer(req.body) || !verifyCentralSignature(secret, req.get("X-LiveSun-Timestamp") ?? "", req.get("X-LiveSun-Signature") ?? "", req.body)) return res.sendStatus(401);
    let payload: any;
    try { payload = JSON.parse(req.body.toString("utf8")); } catch { return res.sendStatus(422); }
    const event = req.get("X-LiveSun-Event") ?? "";
    if (event === "INTEGRACAO_TESTE") {
      if (payload?.produto !== "CLINICAS" || typeof payload.nonce !== "string" || !/^[a-f0-9]{64}$/.test(payload.nonce)) return res.sendStatus(422);
      return res.json({ produto: "CLINICAS", nonce: payload.nonce, prova: createHmac("sha256", secret).update(`CLINICAS:${payload.nonce}`).digest("hex"), status: "receptor_pronto" });
    }
    const result = await applyCentralWebhook(payload, event);
    if (result.status !== 200) return res.sendStatus(result.status);
    return res.json({ status: result.resultado });
  });
}