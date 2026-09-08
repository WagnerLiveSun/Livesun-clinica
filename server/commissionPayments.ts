import { selectPendingCommissionIds, type CommissionStatus } from "./commissionSettlements";

type CommissionRecord = { id: number; status: CommissionStatus };

export async function recordCommissionPayments(
  requestedIds: number[],
  dataPagamento: string,
  loadCommissions: (ids: number[]) => Promise<CommissionRecord[]>,
  persistPayment: (ids: number[], paidAt: Date) => Promise<unknown>,
) {
  const ids = Array.from(new Set(requestedIds));
  const selected = await loadCommissions(ids);
  const settlement = selectPendingCommissionIds(ids, selected);
  const paidAt = new Date(`${dataPagamento}T12:00:00.000Z`);
  if (settlement.pendingIds.length) await persistPayment(settlement.pendingIds, paidAt);
  return { success: true, ...settlement, pagas: settlement.pendingIds.length, paidAt };
}
