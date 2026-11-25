import { eq } from "drizzle-orm";
import { centralEventosRecebidos, centralTenants } from "../drizzle/schema";
import { getDb } from "./db";
import { shouldApplyEntitlement, webhookSchema } from "./centralProtocol";

export async function applyCentralWebhook(value: unknown, eventHeader: string) {
  const parsed = webhookSchema.safeParse(value);
  if (!parsed.success || parsed.data.evento !== eventHeader) return { status: 422 as const };
  const data = parsed.data;
  const customer = Number(data.cliente_id);
  if (!Number.isSafeInteger(customer) || customer > 2147483647 || Date.parse(data.entitlements.gerado_em) > Date.now() + 300_000) return { status: 422 as const };
  const db = await getDb();
  if (!db) return { status: 503 as const };
  try {
    return await db.transaction(async tx => {
      const tenant = (await tx.select().from(centralTenants).where(eq(centralTenants.centralClienteId, customer)).limit(1).for("update"))[0];
      if (!tenant) return { status: 404 as const };
      const prior = (await tx.select().from(centralEventosRecebidos).where(eq(centralEventosRecebidos.eventoId, data.evento_id)).limit(1))[0];
      if (prior) return { status: 200 as const, resultado: "duplicado" as const };
      await tx.insert(centralEventosRecebidos).values({ eventoId: data.evento_id, clienteId: customer, assinaturaId: data.assinatura_id, versao: data.versao });
      const apply = shouldApplyEntitlement({ assinatura_id: tenant.assinaturaId, versao: tenant.versao }, data.entitlements);
      if (apply) await tx.update(centralTenants).set({ assinaturaId: data.assinatura_id, versao: data.versao, payload: JSON.stringify(data.entitlements), validoAte: new Date(Math.min(Date.parse(data.entitlements.valido_ate), Date.now() + 900_000)), atualizadoEm: new Date() }).where(eq(centralTenants.empresaId, tenant.empresaId));
      return { status: 200 as const, resultado: apply ? "aplicado" as const : "obsoleto" as const };
    });
  } catch { return { status: 503 as const }; }
}