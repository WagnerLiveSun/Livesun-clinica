import { eq } from "drizzle-orm";
import { centralTenants } from "../drizzle/schema";
import { getDb } from "./db";
import { entitlementSchema, shouldApplyEntitlement } from "./centralProtocol";
import { centralOrigin } from "./centralRegistrationClient";

/** Autorização comercial com cache persistente; sem estado válido, falha fechada. */
export async function clinicCommercialAccess(clinicaId: number): Promise<boolean> {
  if (process.env.CENTRAL_ENABLED !== "true") return false;
  const db = await getDb();
  if (!db || !Number.isInteger(clinicaId) || clinicaId <= 0) return false;
  const tenant = (await db.select().from(centralTenants).where(eq(centralTenants.empresaId, clinicaId)).limit(1))[0];
  if (!tenant) return false;
  try {
    const cached = entitlementSchema.parse(JSON.parse(tenant.payload));
    if (tenant.validoAte.getTime() > Date.now() && Date.parse(cached.valido_ate) > Date.now()) return cached.acesso_produto && ["ATIVA", "TRIAL"].includes(cached.status);
  } catch { return false; }
  try {
    const origin = centralOrigin(process.env.CENTRAL_BASE_URL ?? "", { environment: process.env.NODE_ENV ?? "production", allowLocalHttp: process.env.CENTRAL_ALLOW_LOCAL_HTTP === "true" });
    const token = process.env.CENTRAL_API_TOKEN ?? "";
    if (!token || /[\r\n]/.test(token)) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let response: Response;
    try { response = await fetch(`${origin}/api/v1/entitlements/${tenant.centralClienteId}/CLINICAS`, { headers: { authorization: `Bearer ${token}`, accept: "application/json" }, redirect: "error", signal: controller.signal }); }
    finally { clearTimeout(timer); }
    if (!response.ok) return false;
    const text = await response.text();
    if (Buffer.byteLength(text) > 131072) return false;
    const data = entitlementSchema.parse(JSON.parse(text));
    if (data.cliente_id !== String(tenant.centralClienteId) || Date.parse(data.gerado_em) > Date.now() + 300000 || Date.parse(data.valido_ate) <= Date.now()) return false;
    return await db.transaction(async tx => {
      const current = (await tx.select().from(centralTenants).where(eq(centralTenants.empresaId, clinicaId)).limit(1).for("update"))[0];
      if (!current || current.centralClienteId !== tenant.centralClienteId) return false;
      if (shouldApplyEntitlement({ assinatura_id: current.assinaturaId, versao: current.versao }, data) || (current.assinaturaId === data.assinatura_id && current.versao === data.versao && Date.parse(data.gerado_em) >= Date.parse(JSON.parse(current.payload).gerado_em))) {
        await tx.update(centralTenants).set({ payload: JSON.stringify(data), assinaturaId: data.assinatura_id, versao: data.versao, validoAte: new Date(Math.min(Date.parse(data.valido_ate), Date.now() + 900000)), atualizadoEm: new Date() }).where(eq(centralTenants.empresaId, clinicaId));
        return data.acesso_produto && ["ATIVA", "TRIAL"].includes(data.status);
      }
      const newer = entitlementSchema.parse(JSON.parse(current.payload));
      return current.validoAte.getTime() > Date.now() && Date.parse(newer.valido_ate) > Date.now() && newer.acesso_produto && ["ATIVA", "TRIAL"].includes(newer.status);
    });
  } catch { return false; }
}