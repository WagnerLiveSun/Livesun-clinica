import bcrypt from "bcryptjs";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function adminContext(): TrpcContext {
  return {
    user: {
      id: 21,
      clinicaId: 7,
      openId: "gestor-limpeza",
      email: "gestor@clinica.test",
      name: "Gestor da Clínica",
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

function createDatabase(passwordHash: string) {
  const conditions: Array<{ sql: string; params: unknown[] }> = [];
  const dialect = new MySqlDialect();
  const deleteWhere = vi.fn(async (condition: unknown) => {
    conditions.push(dialect.sqlToQuery(condition as any));
  });
  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<void>) => callback({
    delete: vi.fn(() => ({ where: deleteWhere })),
  }));
  const selectResult = () => ({ limit: async () => [{ passwordHash, clinicaId: 7 }] });

  return {
    select: () => ({ from: () => ({ where: selectResult }) }),
    transaction,
    insert: vi.fn(() => ({ values: async () => undefined })),
    deleteWhere,
    conditions,
  };
}

describe("administracaoDados.limparOperacao", () => {
  beforeEach(() => vi.clearAllMocks());

  it("recusa a limpeza quando a senha do gestor não confere", async () => {
    const database = createDatabase(await bcrypt.hash("Senha correta 123", 10));
    getDbMock.mockResolvedValue(database);

    await expect(appRouter.createCaller(adminContext()).administracaoDados.limparOperacao({
      senha: "Senha incorreta",
      confirmacao: "LIMPAR DADOS",
    })).rejects.toThrow("Senha do gestor inválida");

    expect(database.transaction).not.toHaveBeenCalled();
    expect(database.deleteWhere).not.toHaveBeenCalled();
  });

  it("executa a limpeza operacional somente após senha e frase exatas", async () => {
    const database = createDatabase(await bcrypt.hash("Senha correta 123", 10));
    getDbMock.mockResolvedValue(database);

    await expect(appRouter.createCaller(adminContext()).administracaoDados.limparOperacao({
      senha: "Senha correta 123",
      confirmacao: "LIMPAR DADOS",
    })).resolves.toEqual({ success: true });

    expect(database.transaction).toHaveBeenCalledOnce();
    expect(database.deleteWhere).toHaveBeenCalledTimes(15);
    expect(database.conditions).toHaveLength(15);
    expect(database.conditions.every((condition) => condition.sql.includes("clinicaId") && condition.params.includes(7))).toBe(true);
  });

  it("exige a frase de confirmação literal antes de chegar ao banco", async () => {
    const database = createDatabase(await bcrypt.hash("Senha correta 123", 10));
    getDbMock.mockResolvedValue(database);

    await expect(appRouter.createCaller(adminContext()).administracaoDados.limparOperacao({
      senha: "Senha correta 123",
      confirmacao: "limpar dados" as "LIMPAR DADOS",
    })).rejects.toThrow("Digite LIMPAR DADOS para confirmar");

    expect(database.transaction).not.toHaveBeenCalled();
  });
});
