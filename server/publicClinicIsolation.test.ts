import { MySqlDialect } from "drizzle-orm/mysql-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock, getUserByEmail: vi.fn() }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const publicContext = { user: null, req: {} as any, res: {} as any } as TrpcContext;
function mockedSelect(results: unknown[][]) {
  const conditions: Array<{ sql: string; params: unknown[] }> = [];
  const dialect = new MySqlDialect();
  let index = 0;
  return {
    conditions,
    select: () => ({ from: () => ({ where: (condition: unknown) => {
      conditions.push(dialect.sqlToQuery(condition as any));
      return { limit: async () => results[index++] ?? [] };
    } }) }),
  };
}

describe("identidade pública e sessão por clínica", () => {
  beforeEach(() => vi.clearAllMocks());

  it("carrega apenas a identidade da clínica indicada pelo slug", async () => {
    const database = mockedSelect([[{ id: 7, nome: "Clínica A" }], [{ nome: "Estética A", slogan: "Cuidado A", corPrimaria: "#123456", logoUrl: "/storage/clinica/7/clinic-assets/logo_ab12cd34.png" }]]);
    getDbMock.mockResolvedValue(database);
    const result = await appRouter.createCaller(publicContext).settings.get({ clinicaSlug: "clinica-a" });
    expect(result).toEqual({ nome: "Estética A", slogan: "Cuidado A", corPrimaria: "#123456", logoUrl: "/storage/clinica/7/clinic-assets/logo_ab12cd34.png" });
    expect(database.conditions[0].params).toEqual(expect.arrayContaining(["clinica-a", true]));
    expect(database.conditions[1].params).toContain(7);
    expect(result).not.toHaveProperty("cnpj");
  });

  it("não usa nome nem logotipo de outra clínica quando faltam configurações", async () => {
    const database = mockedSelect([[{ id: 8, nome: "Clínica B" }], []]);
    getDbMock.mockResolvedValue(database);
    expect(await appRouter.createCaller(publicContext).settings.get({ clinicaSlug: "clinica-b" })).toEqual({ nome: "Clínica B", slogan: null, corPrimaria: null, logoUrl: null });
  });

  it("não divulga logo do armazenamento de outra clínica", async () => {
    const database = mockedSelect([[{ id: 8, nome: "Clínica B" }], [{ nome: "Clínica B", logoUrl: "/storage/clinica/7/clinic-assets/logo_ab12cd34.png", slogan: null, corPrimaria: "#111111" }]]);
    getDbMock.mockResolvedValue(database);
    expect((await appRouter.createCaller(publicContext).settings.get({ clinicaSlug: "clinica-b" })).logoUrl).toBeNull();
  });

  it("ignora caminhos de logo externos e caminhos relativos com travessia", async () => {
    for (const logoUrl of ["https://exemplo.test/logo.png", "/storage/clinica/8/clinic-assets/../../7/clinic-assets/logo_ab12cd34.png"]) {
      getDbMock.mockResolvedValue(mockedSelect([[{ id: 8, nome: "Clínica B" }], [{ nome: "Clínica B", logoUrl, slogan: null, corPrimaria: "#111111" }]]));
      expect((await appRouter.createCaller(publicContext).settings.get({ clinicaSlug: "clinica-b" })).logoUrl).toBeNull();
    }
  });

  it("recusa token de outra clínica e não consulta respostas", async () => {
    const database = mockedSelect([[{ id: 22, clinicaId: 7, clienteId: 55 }], []]);
    getDbMock.mockResolvedValue(database);
    await expect(appRouter.createCaller(publicContext).agendamentoPublico.questionarios({ token: "x".repeat(48), clinicaSlug: "clinica-b" })).rejects.toThrow("não pertence a esta clínica");
    expect(database.conditions).toHaveLength(2);
    expect(database.conditions[1].params).toEqual(expect.arrayContaining([7, "clinica-b", true]));
  });

  it("não cria link padrão quando o usuário não tem clínica ativa", async () => {
    const database = mockedSelect([[], []]);
    getDbMock.mockResolvedValue(database);
    const context = { ...publicContext, user: { id: 3, clinicaId: 7, role: "admin", ativo: true } } as TrpcContext;
    expect((await appRouter.createCaller(context).settings.getAtual()).slug).toBeNull();
  });
});