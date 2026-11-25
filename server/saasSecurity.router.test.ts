import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./centralAccess", () => ({ clinicCommercialAccess: vi.fn(async () => true) }));
import { MySqlDialect } from "drizzle-orm/mysql-core";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock, getUserByEmail: vi.fn() }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext {
  return {
    user: { id: 3, clinicaId: 7, openId: "admin", name: "Gestor", email: "a@example.test", role: "admin", ativo: true, passwordHash: "hash-privado", passwordUpdatedAt: null, telefone: null, loginMethod: "local", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as any,
    res: {} as any,
  };
}

describe("proteções SaaS", () => {
  beforeEach(() => vi.clearAllMocks());

  it("não expõe hash de senha ou campos internos na sessão", async () => {
    const user = await appRouter.createCaller(context()).auth.me();
    expect(user).toEqual({ id: 3, name: "Gestor", email: "a@example.test", role: "admin" });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("impede administradores de criar ou atribuir perfil master", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.auth.createLocalUser({ name: "Teste", email: "teste@example.test", password: "senha-segura-123", role: "master" })).rejects.toThrow("perfil master");
    await expect(caller.auth.updateRole({ id: 4, role: "master" })).rejects.toThrow("perfil master");
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("não oferece limpeza operacional ao produto", () => {
    expect(Object.keys(appRouter._def.procedures)).not.toContain("administracaoDados.limparOperacao");
  });

  it("não permite alterar prontuário de cliente de outra clínica", async () => {
    const dialect = new MySqlDialect();
    const conditions: Array<{ sql: string; params: unknown[] }> = [];
    const insert = vi.fn();
    getDbMock.mockResolvedValue({
      select: () => ({ from: () => ({ where: (condition: any) => {
        conditions.push(dialect.sqlToQuery(condition));
        return { limit: async () => [] };
      } }) }),
      insert,
    });
    await expect(appRouter.createCaller(context()).prontuario.update({ clienteId: 99, alergias: "teste" })).rejects.toThrow("Cliente não encontrado");
    expect(conditions[0].params).toEqual(expect.arrayContaining([7, 99]));
    expect(insert).not.toHaveBeenCalled();
  });

  it("não entrega token de agendamento para cadastro existente sem validação de identidade", async () => {
    const results = [[{ id: 7, slug: "clinica" }], [{ id: 99 }], []];
    const insert = vi.fn();
    getDbMock.mockResolvedValue({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => results.shift() ?? [] }) }) }),
      insert,
    });
    await expect(appRouter.createCaller({ user: null, req: {} as any, res: {} as any }).agendamentoPublico.cadastro({ clinicaSlug: "clinica", nome: "Pessoa Teste", email: "pessoa@example.test", telefone: "11999999999", canalPreferido: "EMAIL", consentimentoDados: true, optInComunicacao: true })).rejects.toThrow("entre em contato com a clínica");
    expect(insert).not.toHaveBeenCalled();
  });
});