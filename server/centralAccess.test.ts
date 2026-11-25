import { afterEach, describe, expect, it, vi } from "vitest";
const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb }));
import { clinicCommercialAccess } from "./centralAccess";

const future = new Date(Date.now() + 600000);
function snapshot(access: boolean, status = access ? "ATIVA" : "SUSPENSA") {
  return { cliente_id: "12", produto: "CLINICAS", assinatura_id: 4, status, plano: "TESTE", acesso_produto: access, modulos: [], limites: {}, versao: 2, gerado_em: new Date(Date.now() - 1000).toISOString(), valido_ate: future.toISOString() };
}
function database(payload: unknown) {
  return { select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ empresaId: 7, centralClienteId: 12, assinaturaId: 4, versao: 2, validoAte: future, payload: JSON.stringify(payload) }] }) }) }) };
}
describe("autorização comercial", () => {
  afterEach(() => { delete process.env.CENTRAL_ENABLED; vi.clearAllMocks(); });
  it("nega ausência de integração ou vínculo", async () => {
    expect(await clinicCommercialAccess(7)).toBe(false);
    process.env.CENTRAL_ENABLED = "true";
    getDb.mockResolvedValue(null);
    expect(await clinicCommercialAccess(7)).toBe(false);
  });
  it("autoriza somente snapshot vigente e ativo", async () => {
    process.env.CENTRAL_ENABLED = "true";
    getDb.mockResolvedValue(database(snapshot(true)));
    expect(await clinicCommercialAccess(7)).toBe(true);
    getDb.mockResolvedValue(database(snapshot(false)));
    expect(await clinicCommercialAccess(7)).toBe(false);
  });
  it("falha fechada com payload inválido", async () => {
    process.env.CENTRAL_ENABLED = "true";
    getDb.mockResolvedValue(database({ produto: "PROPOSTAS" }));
    expect(await clinicCommercialAccess(7)).toBe(false);
  });
});