import { MySqlDialect } from "drizzle-orm/mysql-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function admin(clinicaId: number): TrpcContext {
  return { user: { id: 1, clinicaId, role: "admin", ativo: true } as any, req: {} as any, res: {} as any };
}

function dbFor(results: unknown[][]) {
  const conditions: Array<{ sql: string; params: unknown[] }> = [];
  const dialect = new MySqlDialect();
  const query = (result: unknown[]) => Object.assign(Promise.resolve(result), { limit: async () => result });
  return {
    conditions,
    transaction: vi.fn(),
    insert: vi.fn(),
    select: () => ({ from: () => ({ where: (condition: unknown) => {
      conditions.push(dialect.sqlToQuery(condition as any));
      return query(results.shift() ?? []);
    } }) }),
  };
}

const answer = { clienteId: 91, questionarioId: 4, declaracaoVeracidade: true as const, assinaturaDigital: "Cliente Exemplo", respostas: [{ perguntaId: 10, respostaTexto: "não" }] };

describe("relacionamentos de anamnese entre clínicas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("recusa paciente da clínica B na clínica A", async () => {
    const db = dbFor([[]]); getDbMock.mockResolvedValue(db);
    await expect(appRouter.createCaller(admin(7)).questionarios.responder(answer)).rejects.toThrow("Cliente não encontrado nesta clínica");
    expect(db.conditions[0].params).toEqual(expect.arrayContaining([91, 7]));
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("recusa sessão de outra clínica ou de outro paciente", async () => {
    const db = dbFor([[{ id: 91 }], []]); getDbMock.mockResolvedValue(db);
    await expect(appRouter.createCaller(admin(7)).questionarios.responder({ ...answer, sessaoId: 99 })).rejects.toThrow("sessão não pertence");
    expect(db.conditions[1].params).toEqual(expect.arrayContaining([99, 7, 91]));
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("recusa perguntas de outro questionário", async () => {
    const db = dbFor([[{ id: 91 }], [{ id: 4, versao: 1 }], [{ perguntaId: 11 }]]); getDbMock.mockResolvedValue(db);
    await expect(appRouter.createCaller(admin(7)).questionarios.responder(answer)).rejects.toThrow("perguntas informadas não pertencem");
    expect(db.conditions[2].params).toEqual(expect.arrayContaining([7, 4]));
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("recusa criação de questionário com serviço de outra clínica", async () => {
    const db = dbFor([[]]); getDbMock.mockResolvedValue(db);
    await expect(appRouter.createCaller(admin(7)).questionarios.create({ codigo: "ANAMNESE", nome: "Questionário", servicoId: 90, perguntas: [{ texto: "Pergunta teste", tipoResposta: "TEXTO", obrigatoria: true }], tipoSessao: "PRIMEIRA_SESSAO" })).rejects.toThrow("Serviço não encontrado nesta clínica");
    expect(db.conditions[0].params).toEqual(expect.arrayContaining([90, 7]));
    expect(db.insert).not.toHaveBeenCalled();
  });
});