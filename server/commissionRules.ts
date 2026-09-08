export type CommissionRule = {
  comissaoAtiva: boolean;
  tipoComissao: "PERCENTUAL" | "VALOR_FIXO";
  comissaoPercentual: string | number;
  comissaoValorFixo: string | number;
};

export type CommissionSnapshot = {
  tipoComissao: "PERCENTUAL" | "VALOR_FIXO";
  percentual: string;
  valorRegra: string;
  valor: string;
};

export function calculateCommissionSnapshot(rule: CommissionRule, serviceValue: string | number): CommissionSnapshot | null {
  if (!rule.comissaoAtiva) return null;

  if (rule.tipoComissao === "VALOR_FIXO") {
    const fixedValue = Number(rule.comissaoValorFixo).toFixed(2);
    return { tipoComissao: "VALOR_FIXO", percentual: "0.00", valorRegra: fixedValue, valor: fixedValue };
  }

  const percentage = Number(rule.comissaoPercentual).toFixed(2);
  return {
    tipoComissao: "PERCENTUAL",
    percentual: percentage,
    valorRegra: percentage,
    valor: (Number(serviceValue) * Number(rule.comissaoPercentual) / 100).toFixed(2),
  };
}

export async function createCommissionOnSessionCompletion(
  rule: CommissionRule | null,
  serviceValue: string | number,
  commissionAlreadyExists: boolean,
  persistCommission: (snapshot: CommissionSnapshot) => Promise<void>,
): Promise<boolean> {
  if (!rule || commissionAlreadyExists) return false;
  const snapshot = calculateCommissionSnapshot(rule, serviceValue);
  if (!snapshot) return false;
  await persistCommission(snapshot);
  return true;
}
