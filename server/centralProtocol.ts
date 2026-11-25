import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const positiveId = z.number().int().positive().max(2147483647);
export const entitlementSchema = z.object({
  cliente_id: z.string().regex(/^[1-9]\d*$/),
  produto: z.literal("CLINICAS"),
  assinatura_id: positiveId,
  status: z.enum(["TRIAL", "ATIVA", "SUSPENSA", "BLOQUEADA", "CANCELADA", "EXPIRADA", "EXCLUIDA"]),
  plano: z.string().min(1).max(50),
  acesso_produto: z.boolean(),
  modulos: z.array(z.object({ codigo: z.string(), limite: z.unknown().nullable() }).passthrough()).max(100),
  limites: z.record(z.string(), z.unknown()),
  versao: z.number().int().nonnegative(),
  gerado_em: z.string().datetime({ offset: true }),
  valido_ate: z.string().datetime({ offset: true }),
}).passthrough().superRefine((value, ctx) => {
  if (value.acesso_produto && !["ATIVA", "TRIAL"].includes(value.status)) {
    ctx.addIssue({ code: "custom", message: "Status incompatível com acesso." });
  }
  if (Date.parse(value.valido_ate) <= Date.parse(value.gerado_em)) {
    ctx.addIssue({ code: "custom", message: "Validade inválida." });
  }
});

export const linkSchema = z.object({
  produto: z.literal("CLINICAS"),
  empresa_id: positiveId,
  cliente_id: positiveId,
  assinatura_id: positiveId,
  solicitacao_id: positiveId,
  evento_id: z.string().regex(/^cad_[a-f0-9]{32}$/),
  status: z.enum(["VINCULO_PENDENTE", "VINCULADA"]),
  entitlements: entitlementSchema,
}).passthrough().superRefine((value, ctx) => {
  if (value.entitlements.cliente_id !== String(value.cliente_id) || value.entitlements.assinatura_id !== value.assinatura_id || !value.entitlements.acesso_produto) {
    ctx.addIssue({ code: "custom", message: "Vínculo incompatível com a assinatura." });
  }
});

export const webhookSchema = z.object({
  evento: z.string().min(1).max(80),
  evento_id: z.string().regex(/^evt_[A-Za-z0-9_-]{1,46}$/),
  produto: z.literal("CLINICAS"),
  cliente_id: z.string().regex(/^[1-9]\d*$/),
  assinatura_id: positiveId,
  versao: z.number().int().positive(),
  status_novo: z.string(),
  entitlements: entitlementSchema,
}).passthrough().superRefine((value, ctx) => {
  if (value.entitlements.cliente_id !== value.cliente_id || value.entitlements.assinatura_id !== value.assinatura_id || value.entitlements.versao !== value.versao || value.entitlements.status !== value.status_novo) ctx.addIssue({ code: "custom", message: "Evento incompatível com a autorização." });
});

export function verifyCentralSignature(secret: string, timestamp: string, signature: string, raw: Uint8Array, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (secret.length < 32 || !/^\d{1,12}$/.test(timestamp) || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > 300) return false;
  const digest = createHmac("sha256", secret).update(`${timestamp}.`).update(raw).digest();
  const received = Buffer.from(signature.slice(7), "hex");
  return received.length === digest.length && timingSafeEqual(received, digest);
}

export function shouldApplyEntitlement(current: { assinatura_id: number; versao: number }, incoming: { assinatura_id: number; versao: number }) {
  return incoming.assinatura_id > current.assinatura_id || (incoming.assinatura_id === current.assinatura_id && incoming.versao > current.versao);
}