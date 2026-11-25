import { and, eq, isNull, sql } from "drizzle-orm";
import { centralTenants, clinicasTrial } from "../drizzle/schema";
import { getDb } from "./db";

/** Só chamado após validar a senha e a condição ativa do usuário. */
export async function startClinicTrial(clinicaId: number, usuarioId: number): Promise<void> {
  if (!Number.isInteger(clinicaId) || clinicaId <= 0 || !Number.isInteger(usuarioId) || usuarioId <= 0) return;
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  await db.update(clinicasTrial).set({ iniciadoEm: sql`UTC_TIMESTAMP()` }).where(and(
    eq(clinicasTrial.clinicaId, clinicaId), eq(clinicasTrial.usuarioId, usuarioId), isNull(clinicasTrial.iniciadoEm),
    sql`NOT EXISTS (SELECT 1 FROM ${centralTenants} WHERE ${centralTenants.empresaId} = ${clinicaId})`,
  ));
}

/** Usa o relógio do banco; o período é fixo e nunca se renova. */
export async function trialAccess(clinicaId: number): Promise<boolean | null> {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const row = (await db.select({ vigente: sql<number>`CASE WHEN ${clinicasTrial.iniciadoEm} IS NOT NULL AND ${clinicasTrial.iniciadoEm} <= UTC_TIMESTAMP() AND DATE_ADD(${clinicasTrial.iniciadoEm}, INTERVAL 7 DAY) > UTC_TIMESTAMP() THEN 1 ELSE 0 END` })
    .from(clinicasTrial).where(eq(clinicasTrial.clinicaId, clinicaId)).limit(1))[0];
  return row ? Number(row.vigente) === 1 : null;
}