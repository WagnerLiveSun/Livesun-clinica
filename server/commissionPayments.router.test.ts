import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function adminContext(): TrpcContext {
  return {
    user: { id: 1, clinicaId: 1, openId: "admin-test", email: "admin@sunset.test", name: "Gestor", loginMethod: "email", role: "admin", ativo: true, telefone: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as any,
    res: {} as any,
  };
}

function createDatabase(rows: Array<{ id: number; status: "PENDENTE" | "PAGA"; pagaEm: Date | null }>) {
  const selectRows = () => {
    const result = Promise.resolve(rows) as Promise<typeof rows> & { limit: () => Promise<typeof rows> };
    result.limit = async () => rows;
    return result;
  };
  return {
    select: () => ({ from: () => ({ where: () => selectRows() }) }),
    update: () => ({ set: (values: { status: "PAGA"; pagaEm: Date }) => ({ where: async () => { rows.forEach((row) => { if (row.status === "PENDENTE") { row.status = values.status; row.pagaEm = values.pagaEm; } }); } }) }),
    insert: () => ({ values: async () => undefined }),
  };
}

describe("financeiro.pagarComissoes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persiste status pago e data ao baixar uma comissão individual", async () => {
    const rows = [{ id: 11, status: "PENDENTE" as const, pagaEm: null }];
    getDbMock.mockResolvedValue(createDatabase(rows));
    const result = await appRouter.createCaller(adminContext()).financeiro.pagarComissoes({ ids: [11], dataPagamento: "2026-08-14" });
    expect(result).toEqual({ success: true, pagas: 1, jaProcessadas: 0, naoEncontradas: 0 });
    expect(rows).toEqual([{ id: 11, status: "PAGA", pagaEm: new Date("2026-08-14T12:00:00.000Z") }]);
  });

  it("baixa em lote somente comissões pendentes e mantém as já pagas", async () => {
    const rows = [{ id: 11, status: "PENDENTE" as const, pagaEm: null }, { id: 12, status: "PENDENTE" as const, pagaEm: null }, { id: 13, status: "PAGA" as const, pagaEm: new Date("2026-08-01T12:00:00.000Z") }];
    getDbMock.mockResolvedValue(createDatabase(rows));
    const result = await appRouter.createCaller(adminContext()).financeiro.pagarComissoes({ ids: [11, 12, 13], dataPagamento: "2026-08-14" });
    expect(result).toEqual({ success: true, pagas: 2, jaProcessadas: 1, naoEncontradas: 0 });
    expect(rows).toEqual([
      { id: 11, status: "PAGA", pagaEm: new Date("2026-08-14T12:00:00.000Z") },
      { id: 12, status: "PAGA", pagaEm: new Date("2026-08-14T12:00:00.000Z") },
      { id: 13, status: "PAGA", pagaEm: new Date("2026-08-01T12:00:00.000Z") },
    ]);
  });
});
