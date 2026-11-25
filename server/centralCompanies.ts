import { and, eq, gt } from "drizzle-orm";
import express, { type Express } from "express";
import { centralTenants, clinicas, clinicSettings, solicitacoesClinica, users } from "../drizzle/schema";
import { getDb } from "./db";
import { centralRegistrationEvent } from "./centralRegistrationClient";
import { verifyCentralSignature } from "./centralProtocol";

export async function legacyCompany(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, id: number) {
  const clinic = (await db.select().from(clinicas).where(eq(clinicas.id, id)).limit(1))[0];
  if (!clinic) return null;
  const settings = (await db.select().from(clinicSettings).where(eq(clinicSettings.clinicaId, id)).limit(1))[0];
  const manager = (await db.select().from(users).where(and(eq(users.clinicaId, id), eq(users.role, "admin"), eq(users.ativo, true))).orderBy(users.id).limit(1))[0];
  const tenant = (await db.select().from(centralTenants).where(eq(centralTenants.empresaId, id)).limit(1))[0];
  const registration = (await db.select({ id: solicitacoesClinica.id }).from(solicitacoesClinica).where(eq(solicitacoesClinica.clinicaId, id)).limit(1))[0];
  const doc = (settings?.cnpj ?? "").replace(/\D/g, "");
  return { dados: { evento_id: centralRegistrationEvent(id), empresa_id: id, razao_social: settings?.razaoSocial?.trim() || clinic.nome, nome_fantasia: clinic.nome, cnpj_cpf: doc, email: settings?.emailContato?.trim() || manager?.email?.trim() || "", telefone: (settings?.telefone || manager?.telefone || "").slice(0, 30) || null, responsavel: manager?.name?.trim() || clinic.nome }, ativo: clinic.ativa, cliente_id: tenant?.centralClienteId ?? null, cadastro_novo: Boolean(registration), gestor_ativo: Boolean(manager) };
}

export function registerCentralCompanies(app: Express, secret: string, enabled: boolean) {
  const authenticate: express.RequestHandler = (req, res, next) => {
    if (!enabled || secret.length < 32) return void res.sendStatus(503);
    if (!verifyCentralSignature(secret, req.get("X-LiveSun-Timestamp") ?? "", req.get("X-LiveSun-Signature") ?? "", Buffer.from(req.originalUrl))) return void res.sendStatus(401);
    res.set("Cache-Control", "no-store"); next();
  };
  app.get("/central/empresas", authenticate, async (req, res) => {
    const cursor = req.query.apos === undefined ? "0" : String(req.query.apos);
    if (!/^\d{1,10}$/.test(cursor) || Number(cursor) > 2147483647) return res.sendStatus(422);
    try {
      const db = await getDb(); if (!db) return res.sendStatus(503);
      const rows = await db.select({ id: clinicas.id }).from(clinicas).where(gt(clinicas.id, Number(cursor))).orderBy(clinicas.id).limit(51);
      const companies = await Promise.all(rows.slice(0, 50).map(row => legacyCompany(db, row.id)));
      return res.json({ produto: "CLINICAS", empresas: companies.filter(Boolean), proximo: rows.length > 50 ? rows[49].id : null });
    } catch { return res.sendStatus(503); }
  });
  app.get("/central/empresas/:id", authenticate, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) return res.sendStatus(422);
    try { const db = await getDb(); if (!db) return res.sendStatus(503); const company = await legacyCompany(db, id); return company ? res.json({ produto: "CLINICAS", empresa: company }) : res.sendStatus(404); }
    catch { return res.sendStatus(503); }
  });
}