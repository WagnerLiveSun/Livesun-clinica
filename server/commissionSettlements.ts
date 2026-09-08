export type CommissionStatus = "PENDENTE" | "PAGA" | "CANCELADA";

export function selectPendingCommissionIds(
  requestedIds: number[],
  commissions: Array<{ id: number; status: CommissionStatus }>,
) {
  const requested = new Set(requestedIds);
  const found = commissions.filter((commission) => requested.has(commission.id));
  const pendingIds = found.filter((commission) => commission.status === "PENDENTE").map((commission) => commission.id);
  return {
    pendingIds,
    alreadyProcessed: found.length - pendingIds.length,
    notFound: requested.size - found.length,
  };
}
