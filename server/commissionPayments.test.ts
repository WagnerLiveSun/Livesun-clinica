import { describe, expect, it } from "vitest";
import { recordCommissionPayments } from "./commissionPayments";

describe("recordCommissionPayments", () => {
  it("registra a baixa individual com status e data informada", async () => {
    const records: Array<{ id: number; status: "PENDENTE" | "PAGA"; pagaEm?: Date }> = [{ id: 1, status: "PENDENTE" }];
    const persisted: Array<{ ids: number[]; paidAt: Date }> = [];
    const result = await recordCommissionPayments([1], "2026-08-14", async () => records, async (ids, paidAt) => { persisted.push({ ids, paidAt }); records.forEach((record) => { if (ids.includes(record.id)) { record.status = "PAGA"; record.pagaEm = paidAt; } }); });
    expect(result).toMatchObject({ success: true, pagas: 1, alreadyProcessed: 0, notFound: 0 });
    expect(persisted).toEqual([{ ids: [1], paidAt: new Date("2026-08-14T12:00:00.000Z") }]);
    expect(records).toEqual([{ id: 1, status: "PAGA", pagaEm: new Date("2026-08-14T12:00:00.000Z") }]);
  });

  it("registra em lote apenas as pendentes e mantém a operação idempotente", async () => {
    const records: Array<{ id: number; status: "PENDENTE" | "PAGA"; pagaEm?: Date }> = [{ id: 1, status: "PENDENTE" }, { id: 2, status: "PENDENTE" }, { id: 3, status: "PAGA" }];
    const persisted: number[][] = [];
    const load = async (ids: number[]) => records.filter((record) => ids.includes(record.id));
    const persist = async (ids: number[], paidAt: Date) => { persisted.push(ids); records.forEach((record) => { if (ids.includes(record.id)) { record.status = "PAGA"; record.pagaEm = paidAt; } }); };
    const first = await recordCommissionPayments([1, 2, 3], "2026-08-14", load, persist);
    const second = await recordCommissionPayments([1, 2, 3], "2026-08-14", load, persist);
    expect(first).toMatchObject({ pagas: 2, alreadyProcessed: 1, notFound: 0 });
    expect(second).toMatchObject({ pagas: 0, alreadyProcessed: 3, notFound: 0 });
    expect(persisted).toEqual([[1, 2]]);
    expect(records.slice(0, 2).every((record) => record.status === "PAGA" && record.pagaEm?.toISOString() === "2026-08-14T12:00:00.000Z")).toBe(true);
  });
});
