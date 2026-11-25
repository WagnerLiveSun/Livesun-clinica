import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { entitlementSchema, linkSchema, shouldApplyEntitlement, verifyCentralSignature } from "./centralProtocol";

const entitlement = { cliente_id: "23", produto: "CLINICAS", assinatura_id: 42, status: "ATIVA", plano: "ESTETICA", acesso_produto: true, modulos: [], limites: {}, versao: 1, gerado_em: "2026-11-24T12:00:00Z", valido_ate: "2026-11-24T12:15:00Z" };
describe("contrato Central para Clínicas", () => {
  it("verifica HMAC dos bytes exatos, tempo e segredo", () => {
    const raw = Buffer.from('{"produto":"CLINICAS"}');
    const secret = "s".repeat(40);
    const stamp = "1800000000";
    const signature = `sha256=${createHmac("sha256", secret).update(`${stamp}.`).update(raw).digest("hex")}`;
    expect(verifyCentralSignature(secret, stamp, signature, raw, 1800000300)).toBe(true);
    expect(verifyCentralSignature(secret, stamp, signature, raw, 1800000301)).toBe(false);
    expect(verifyCentralSignature(secret, stamp, signature, Buffer.from('{}'), 1800000000)).toBe(false);
    expect(verifyCentralSignature("curto", stamp, signature, raw, 1800000000)).toBe(false);
  });
  it("valida identidade e consistência do vínculo", () => {
    const link = { produto: "CLINICAS", empresa_id: 10, cliente_id: 23, assinatura_id: 42, solicitacao_id: 7, evento_id: `cad_${"a".repeat(32)}`, status: "VINCULO_PENDENTE", entitlements: entitlement };
    expect(linkSchema.safeParse(link).success).toBe(true);
    expect(linkSchema.safeParse({ ...link, cliente_id: 99 }).success).toBe(false);
    expect(entitlementSchema.safeParse({ ...entitlement, status: "SUSPENSA" }).success).toBe(false);
    expect(entitlementSchema.safeParse({ ...entitlement, produto: "PROPOSTAS" }).success).toBe(false);
  });
  it("não aplica eventos antigos ou duplicados", () => {
    const current = { assinatura_id: 42, versao: 5 };
    expect(shouldApplyEntitlement(current, { assinatura_id: 42, versao: 5 })).toBe(false);
    expect(shouldApplyEntitlement(current, { assinatura_id: 42, versao: 4 })).toBe(false);
    expect(shouldApplyEntitlement(current, { assinatura_id: 41, versao: 99 })).toBe(false);
    expect(shouldApplyEntitlement(current, { assinatura_id: 42, versao: 6 })).toBe(true);
    expect(shouldApplyEntitlement(current, { assinatura_id: 43, versao: 1 })).toBe(true);
  });
});