import { and, eq } from "drizzle-orm";
import { centralTenants, clinicas, clinicSettings, solicitacoesCentral, solicitacoesClinica, users } from "../drizzle/schema";
import { getDb } from "./db";
import { centralRegistrationEvent } from "./centralRegistrationClient";
import { linkSchema, shouldApplyEntitlement } from "./centralProtocol";

/** Persiste o vínculo aprovado; não interpreta retorno do POST como autorização. */
export async function applyCentralLink(value: unknown) {
  const parsed = linkSchema.safeParse(value);
  if (!parsed.success) return { status: 422 as const };
  const data = parsed.data;
  const document = (value as { cnpj_cpf?: unknown }).cnpj_cpf;
  if (typeof document !== "string" || !/^\d{11}(?:\d{3})?$/.test(document)) return { status: 422 as const };
  const generated = Date.parse(data.entitlements.gerado_em);
  const expiry = Date.parse(data.entitlements.valido_ate);
  if (generated > Date.now() + 300_000 || expiry <= Date.now()) return { status: 422 as const };
  const db = await getDb();
  if (!db) return { status: 503 as const };
  try {
    return await db.transaction(async tx => {
      const registration = (await tx.select().from(solicitacoesClinica).where(eq(solicitacoesClinica.clinicaId, data.empresa_id)).limit(1).for("update"))[0];
      if (data.evento_id !== centralRegistrationEvent(data.empresa_id)) return { status: 409 as const };
      const clinic = (await tx.select({ id: clinicas.id, ativa: clinicas.ativa }).from(clinicas).where(eq(clinicas.id, data.empresa_id)).limit(1).for("update"))[0];
      if (!clinic) return { status: 409 as const };
      let outbox: typeof solicitacoesCentral.$inferSelect | undefined;
      if (registration) {
        if (!registration.emailConfirmadoEm || !registration.usuarioId || registration.documento !== document) return { status: 409 as const };
        const manager = (await tx.select({ id: users.id }).from(users).where(and(eq(users.id, registration.usuarioId), eq(users.clinicaId, data.empresa_id), eq(users.role, "admin"))).limit(1).for("update"))[0];
        if (!manager) return { status: 409 as const };
        outbox = (await tx.select().from(solicitacoesCentral).where(and(eq(solicitacoesCentral.empresaId, data.empresa_id), eq(solicitacoesCentral.eventoId, data.evento_id))).limit(1).for("update"))[0];
        if (!outbox || (outbox.centralSolicitacaoId && outbox.centralSolicitacaoId !== data.solicitacao_id)) return { status: 409 as const };
      } else {
        const settings = (await tx.select({ document: clinicSettings.cnpj }).from(clinicSettings).where(eq(clinicSettings.clinicaId, data.empresa_id)).limit(1).for("update"))[0];
        const manager = (await tx.select({ id: users.id }).from(users).where(and(eq(users.clinicaId, data.empresa_id), eq(users.role, "admin"), eq(users.ativo, true))).limit(1).for("update"))[0];
        if (!clinic.ativa || !manager || (settings?.document ?? "").replace(/\D/g, "") !== document) return { status: 409 as const };
      }
      const existing = (await tx.select().from(centralTenants).where(eq(centralTenants.empresaId, data.empresa_id)).limit(1).for("update"))[0];
      const other = (await tx.select({ empresaId: centralTenants.empresaId }).from(centralTenants).where(eq(centralTenants.centralClienteId, data.cliente_id)).limit(1).for("update"))[0];
      if ((existing && existing.centralClienteId !== data.cliente_id) || (other && other.empresaId !== data.empresa_id)) return { status: 409 as const };
      if (existing && !shouldApplyEntitlement({ assinatura_id: existing.assinaturaId, versao: existing.versao }, data.entitlements)) {
        if (existing.assinaturaId !== data.assinatura_id || existing.versao !== data.entitlements.versao) return { status: 409 as const };
        return { status: 200 as const, evento_id: data.evento_id, empresa_id: data.empresa_id, cliente_id: data.cliente_id, resultado: "duplicado" as const };
      }
      const snapshot = { empresaId: data.empresa_id, centralClienteId: data.cliente_id, assinaturaId: data.assinatura_id, versao: data.entitlements.versao, payload: JSON.stringify(data.entitlements), validoAte: new Date(Math.min(expiry, Date.now() + 900_000)), atualizadoEm: new Date() };
      if (existing) await tx.update(centralTenants).set(snapshot).where(eq(centralTenants.empresaId, data.empresa_id));
      else await tx.insert(centralTenants).values(snapshot);
      if (registration && outbox) {
        await tx.update(clinicas).set({ ativa: true }).where(eq(clinicas.id, data.empresa_id));
        await tx.update(users).set({ ativo: true }).where(and(eq(users.id, registration.usuarioId!), eq(users.clinicaId, data.empresa_id)));
        await tx.update(solicitacoesCentral).set({ status: "VINCULADA", centralSolicitacaoId: data.solicitacao_id }).where(eq(solicitacoesCentral.id, outbox.id));
      }
      return { status: 200 as const, evento_id: data.evento_id, empresa_id: data.empresa_id, cliente_id: data.cliente_id, resultado: "vinculado" as const };
    });
  } catch { return { status: 503 as const }; }
}