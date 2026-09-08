import { describe, expect, it } from "vitest";
import { selectPendingCommissionIds } from "./commissionSettlements";

describe("selectPendingCommissionIds", () => {
  const records = [
    { id: 1, status: "PENDENTE" as const },
    { id: 2, status: "PAGA" as const },
    { id: 3, status: "CANCELADA" as const },
  ];

  it("separa somente comissões pendentes para baixa", () => {
    expect(selectPendingCommissionIds([1, 2, 3], records)).toEqual({ pendingIds: [1], alreadyProcessed: 2, notFound: 0 });
  });

  it("é idempotente quando a mesma baixa é solicitada novamente", () => {
    expect(selectPendingCommissionIds([2], records)).toEqual({ pendingIds: [], alreadyProcessed: 1, notFound: 0 });
  });

  it("informa identificadores inexistentes sem incluir registros de terceiros", () => {
    expect(selectPendingCommissionIds([1, 99], records)).toEqual({ pendingIds: [1], alreadyProcessed: 0, notFound: 1 });
  });
});
