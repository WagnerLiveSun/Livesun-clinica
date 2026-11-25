import { randomBytes } from "node:crypto";
import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { solicitacoesCentral } from "../drizzle/schema";
import { getDb } from "./db";
import { sendCentralRegistration, type CentralRegistration } from "./centralRegistrationClient";

/** Uma tentativa para um cadastro: nunca libera usuário ou assinatura. */
export async function deliverRegistration(id: number, config: {
  baseUrl: string; apiToken: string; environment: string; allowLocalHttp: boolean;
  fetcher?: typeof fetch; retrySeconds?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível.");
  const now = new Date();
  const lease = randomBytes(16).toString("hex");
  const retrySeconds = Math.max(30, Math.min(86400, config.retrySeconds ?? 120));
  const claim = await db.update(solicitacoesCentral).set({
    leaseId: lease, leaseAte: new Date(now.getTime() + 60000), ultimaTentativaEm: now,
    proximaTentativaEm: new Date(now.getTime() + retrySeconds * 1000),
    tentativas: sql`${solicitacoesCentral.tentativas} + 1`, erroCategoria: "ENVIO_NAO_CONFIRMADO",
  }).where(and(eq(solicitacoesCentral.id, id), eq(solicitacoesCentral.status, "PENDENTE"),
    or(isNull(solicitacoesCentral.leaseAte), lte(solicitacoesCentral.leaseAte, now)),
    or(isNull(solicitacoesCentral.proximaTentativaEm), lte(solicitacoesCentral.proximaTentativaEm, now))));
  if (claim[0].affectedRows !== 1) return { claimed: false as const };
  const row = (await db.select().from(solicitacoesCentral).where(and(eq(solicitacoesCentral.id, id), eq(solicitacoesCentral.leaseId, lease))).limit(1))[0];
  if (!row) return { claimed: false as const };
  let payload: CentralRegistration;
  try { payload = JSON.parse(row.payload); }
  catch {
    await db.update(solicitacoesCentral).set({ leaseId: null, leaseAte: null, erroCategoria: "CONFIGURACAO" }).where(and(eq(solicitacoesCentral.id, id), eq(solicitacoesCentral.leaseId, lease)));
    return { claimed: true as const, received: false as const };
  }
  const result = await sendCentralRegistration({ ...config, payload });
  const update = result.received
    ? { status: "RECEBIDA_CENTRAL", centralSolicitacaoId: result.centralRequestId, recebidaEm: new Date(), erroCategoria: null, leaseId: null, leaseAte: null }
    : { erroCategoria: result.reason, leaseId: null, leaseAte: null };
  const saved = await db.update(solicitacoesCentral).set(update).where(and(eq(solicitacoesCentral.id, id), eq(solicitacoesCentral.leaseId, lease), eq(solicitacoesCentral.status, "PENDENTE")));
  return { claimed: true as const, received: result.received && saved[0].affectedRows === 1 };
}

/** Drena pendências elegíveis; o lease de deliverRegistration coordena processos. */
export async function deliverPendingRegistrations(config: {
  baseUrl: string; apiToken: string; environment: string; allowLocalHttp: boolean;
  fetcher?: typeof fetch; retrySeconds?: number;
}, limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível.");
  const now = new Date();
  const rows = await db.select({ id: solicitacoesCentral.id }).from(solicitacoesCentral)
    .where(and(eq(solicitacoesCentral.status, "PENDENTE"),
      or(isNull(solicitacoesCentral.leaseAte), lte(solicitacoesCentral.leaseAte, now)),
      or(isNull(solicitacoesCentral.proximaTentativaEm), lte(solicitacoesCentral.proximaTentativaEm, now))))
    .orderBy(solicitacoesCentral.id).limit(Math.max(1, Math.min(limit, 50)));
  let claimed = 0, received = 0;
  for (const row of rows) {
    const result = await deliverRegistration(row.id, config);
    if (result.claimed) claimed++;
    if (result.claimed && result.received) received++;
  }
  return { scanned: rows.length, claimed, received };
}