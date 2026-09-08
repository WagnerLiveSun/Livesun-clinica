import { describe, expect, it } from "vitest";
import { calculateCommissionSnapshot, createCommissionOnSessionCompletion } from "./commissionRules";

describe("calculateCommissionSnapshot", () => {
  it("não gera comissão quando a regra está inativa", () => {
    expect(calculateCommissionSnapshot({ comissaoAtiva: false, tipoComissao: "PERCENTUAL", comissaoPercentual: "30", comissaoValorFixo: "0" }, "200.00")).toBeNull();
  });

  it("preserva percentual e valor calculado na regra percentual", () => {
    expect(calculateCommissionSnapshot({ comissaoAtiva: true, tipoComissao: "PERCENTUAL", comissaoPercentual: "30", comissaoValorFixo: "0" }, "200.00")).toEqual({ tipoComissao: "PERCENTUAL", percentual: "30.00", valorRegra: "30.00", valor: "60.00" });
  });

  it("preserva o valor fixo aplicado por sessão", () => {
    expect(calculateCommissionSnapshot({ comissaoAtiva: true, tipoComissao: "VALOR_FIXO", comissaoPercentual: "0", comissaoValorFixo: "75.5" }, "200.00")).toEqual({ tipoComissao: "VALOR_FIXO", percentual: "0.00", valorRegra: "75.50", valor: "75.50" });
  });

  it("não persiste comissão no fluxo de conclusão quando a regra foi desativada", async () => {
    const persisted: unknown[] = [];
    const created = await createCommissionOnSessionCompletion(
      { comissaoAtiva: false, tipoComissao: "PERCENTUAL", comissaoPercentual: "30", comissaoValorFixo: "0" },
      "200.00",
      false,
      async (snapshot) => { persisted.push(snapshot); },
    );
    expect(created).toBe(false);
    expect(persisted).toEqual([]);
  });

  it("não substitui uma comissão já registrada ao concluir novamente a sessão", async () => {
    const persisted: unknown[] = [];
    const created = await createCommissionOnSessionCompletion(
      { comissaoAtiva: true, tipoComissao: "PERCENTUAL", comissaoPercentual: "30", comissaoValorFixo: "0" },
      "200.00",
      true,
      async (snapshot) => { persisted.push(snapshot); },
    );
    expect(created).toBe(false);
    expect(persisted).toEqual([]);
  });
});
