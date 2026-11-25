import { MySqlDialect } from "drizzle-orm/mysql-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function adminContext(clinicaId: number): TrpcContext {
  return {
    user: {
      id: 35,
      clinicaId,
      openId: `gestor-${clinicaId}`,
      email: `gestor${clinicaId}@sunset.test`,
      name: "Gestor",
      loginMethod: "email",
      role: "admin",
      ativo: true,
      telefone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: {} as any,
  };
}

describe("isolamento entre clínicas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("não encontra o prontuário solicitado quando o cadastro pertence a outra clínica", async () => {
    const conditions: Array<{ sql: string; params: unknown[] }> = [];
    const dialect = new MySqlDialect();
    const database = {
      select: () => ({ from: () => ({ where: (condition: unknown) => {
        conditions.push(dialect.sqlToQuery(condition as any));
        return { limit: async () => [] };
      } }) }),
    };
    getDbMock.mockResolvedValue(database);

    await expect(appRouter.createCaller(adminContext(7)).clientes.get({ id: 91 })).rejects.toThrow("Cliente não encontrado");

    expect(conditions[0].sql).toContain("clientes`.`id");
    expect(conditions[0].sql).toContain("clientes`.`clinicaId");
    expect(conditions[0].params).toEqual(expect.arrayContaining([91, 7]));
  });

  it("inclui a clínica ativa na edição e no arquivamento de cliente", async () => {
    const conditions: Array<{ sql: string; params: unknown[] }> = [];
    const dialect = new MySqlDialect();
    const database = {
      update: () => ({ set: () => ({ where: async (condition: unknown) => {
        conditions.push(dialect.sqlToQuery(condition as any));
      } }) }),
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ clinicaId: 7 }] }) }) }),
      insert: () => ({ values: async () => undefined }),
    };
    getDbMock.mockResolvedValue(database);

    await expect(appRouter.createCaller(adminContext(7)).clientes.archive({ id: 91 })).resolves.toEqual({ success: true });
    await expect(appRouter.createCaller(adminContext(7)).clientes.update({
      id: 91,
      nome: "Cliente atualizado",
      email: "cliente@sunset.test",
      telefone: "71999990000",
    })).resolves.toEqual({ success: true });

    expect(conditions).toHaveLength(2);
    for (const condition of conditions) {
      expect(condition.sql).toContain("clientes`.`id");
      expect(condition.sql).toContain("clientes`.`clinicaId");
      expect(condition.params).toEqual(expect.arrayContaining([91, 7]));
    }
  });

  it("restringe o arquivamento de serviços, equipamentos e profissionais à clínica ativa", async () => {
    const conditions: Array<{ sql: string; params: unknown[] }> = [];
    const dialect = new MySqlDialect();
    const database = {
      update: () => ({ set: () => ({ where: async (condition: unknown) => {
        conditions.push(dialect.sqlToQuery(condition as any));
        return [{ affectedRows: 1 }];
      } }) }),
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ clinicaId: 7 }] }) }) }),
      insert: () => ({ values: async () => undefined }),
    };
    getDbMock.mockResolvedValue(database);
    const caller = appRouter.createCaller(adminContext(7));

    await expect(caller.servicos.archive({ id: 19 })).resolves.toEqual({ success: true });
    await expect(caller.recursos.equipamentos.archive({ id: 23 })).resolves.toEqual({ success: true });
    await expect(caller.profissionais.archive({ id: 31 })).resolves.toEqual({ success: true });

    expect(conditions).toHaveLength(3);
    for (const condition of conditions) {
      expect(condition.sql).toContain("`clinicaId`");
      expect(condition.params).toContain(7);
    }
    expect(conditions[0].params).toContain(19);
    expect(conditions[1].params).toContain(23);
    expect(conditions[2].params).toContain(31);
  });

  it("aplica o escopo da clínica ativa na edição de um serviço", async () => {
    const conditions: Array<{ sql: string; params: unknown[] }> = [];
    const dialect = new MySqlDialect();
    const database = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 41, clinicaId: 7 }] }) }) }),
      update: () => ({ set: () => ({ where: async (condition: unknown) => {
        conditions.push(dialect.sqlToQuery(condition as any));
      } }) }),
      insert: () => ({ values: async () => undefined }),
    };
    getDbMock.mockResolvedValue(database);

    await expect(appRouter.createCaller(adminContext(7)).servicos.update({
      id: 41,
      nome: "Procedimento revisado",
      descricao: "Descrição revisada",
      duracaoMin: 60,
      valor: "180.00",
      exigeQuestionario: true,
      ativo: true,
    })).resolves.toEqual({ success: true });

    expect(conditions).toHaveLength(1);
    expect(conditions[0].sql).toContain("`servicos`.`id`");
    expect(conditions[0].sql).toContain("`servicos`.`clinicaId`");
    expect(conditions[0].params).toEqual(expect.arrayContaining([41, 7]));
  });

  it("aplica o escopo da clínica ativa na edição de um profissional", async () => {
    const conditions: Array<{ sql: string; params: unknown[] }> = [];
    const dialect = new MySqlDialect();
    const selectResults = [[{ id: 31 }], [], [{ clinicaId: 7 }]];
    let selectIndex = 0;
    const database = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => selectResults[selectIndex++] }) }) }),
      update: () => ({ set: () => ({ where: async (condition: unknown) => {
        conditions.push(dialect.sqlToQuery(condition as any));
      } }) }),
      insert: () => ({ values: async () => undefined }),
    };
    getDbMock.mockResolvedValue(database);

    await expect(appRouter.createCaller(adminContext(7)).profissionais.update({
      id: 31,
      name: "Profissional atualizado",
      email: "profissional@sunset.test",
      telefone: "71988880000",
    })).resolves.toEqual({ success: true });

    expect(conditions).toHaveLength(1);
    expect(conditions[0].sql).toContain("`users`.`id`");
    expect(conditions[0].sql).toContain("`users`.`clinicaId`");
    expect(conditions[0].sql).toContain("`users`.`role`");
    expect(conditions[0].params).toEqual(expect.arrayContaining([31, 7, "profissional"]));
  });

  it("não vincula recebimento da clínica A a paciente da clínica B", async () => {
    const insert = vi.fn();
    const database = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 4, clinicaId: 7, clienteId: 100, valorFinal: "150.00" }] }) }) }),
      insert,
    };
    getDbMock.mockResolvedValue(database);
    await expect(appRouter.createCaller(adminContext(7)).financeiro.receber({ contaReceberId: 4, clienteId: 200, valor: "50.00", tipoPagamento: "PIX" })).rejects.toThrow("O cliente informado não pertence a esta conta");
    expect(insert).not.toHaveBeenCalled();
  });

  it("não gera recibo com conta pertencente a outra clínica", async () => {
    const dialect = new MySqlDialect();
    const conditions: Array<{ sql: string; params: unknown[] }> = [];
    const results = [[{ id: 11, contaReceberId: 44, clienteId: 91, estornadoEm: null }], []];
    const database = { select: () => ({ from: () => ({ where: (condition: unknown) => {
      conditions.push(dialect.sqlToQuery(condition as any));
      return { limit: async () => results.shift() ?? [] };
    } }) }) };
    getDbMock.mockResolvedValue(database);
    await expect(appRouter.createCaller(adminContext(7)).financeiro.gerarRecibo({ recebimentoId: 11 })).rejects.toThrow("Conta a receber não encontrada");
    expect(conditions[1].params).toEqual(expect.arrayContaining([44, 7]));
  });

  it("rejeita foto para paciente de outra clínica antes de gravar arquivo", async () => {
    const dialect = new MySqlDialect();
    const conditions: Array<{ sql: string; params: unknown[] }> = [];
    const insert = vi.fn();
    getDbMock.mockResolvedValue({ select: () => ({ from: () => ({ where: (condition: unknown) => {
      conditions.push(dialect.sqlToQuery(condition as any));
      return { limit: async () => [] };
    } }) }), insert });
    await expect(appRouter.createCaller(adminContext(7)).prontuario.uploadPhoto({ clienteId: 200, categoria: "ANTES", dataUrl: "data:image/png;base64,AAAAAA==" })).rejects.toThrow("Cliente não encontrado");
    expect(conditions[0].params).toEqual(expect.arrayContaining([200, 7]));
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejeita foto vinculada a sessão de outra clínica", async () => {
    const dialect = new MySqlDialect();
    const conditions: Array<{ sql: string; params: unknown[] }> = [];
    const results = [[{ id: 100 }], []];
    const insert = vi.fn();
    getDbMock.mockResolvedValue({ select: () => ({ from: () => ({ where: (condition: unknown) => {
      conditions.push(dialect.sqlToQuery(condition as any));
      return { limit: async () => results.shift() ?? [] };
    } }) }), insert });
    await expect(appRouter.createCaller(adminContext(7)).prontuario.uploadPhoto({ clienteId: 100, sessaoId: 400, categoria: "ANTES", dataUrl: "data:image/png;base64,AAAAAA==" })).rejects.toThrow("sessão não pertence");
    expect(conditions[1].params).toEqual(expect.arrayContaining([400, 7, 100]));
    expect(insert).not.toHaveBeenCalled();
  });
});
