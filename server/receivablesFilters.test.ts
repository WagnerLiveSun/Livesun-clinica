import { describe, expect, it } from "vitest";
import { filterReceivables } from "../client/src/lib/receivables";

const accounts = [
  { id: 101, clienteNome: "Ana Silva", status: "ABERTA", sessaoStatus: "CONCLUIDA", dataVencimento: "2026-08-10" },
  { id: 102, clienteNome: "Bruno Costa", status: "PARCIAL", sessaoStatus: "CONFIRMADA", dataVencimento: "2026-08-15" },
  { id: 103, clienteNome: "Ana Silva", status: "PAGA", sessaoStatus: "CONCLUIDA", dataVencimento: "2026-08-20" },
];

const defaults = { cliente: "", situacao: "ABERTAS", etapa: "TODAS", dataInicio: "", dataFim: "" };

describe("filtros operacionais de contas a receber", () => {
  it("mostra apenas títulos em aberto por padrão, incluindo parciais", () => {
    expect(filterReceivables(accounts, defaults).map((account) => account.id)).toEqual([101, 102]);
  });

  it("filtra por cliente, situação, período e etapa do atendimento", () => {
    expect(filterReceivables(accounts, { ...defaults, cliente: "ana" }).map((account) => account.id)).toEqual([101]);
    expect(filterReceivables(accounts, { ...defaults, situacao: "PARCIAL" }).map((account) => account.id)).toEqual([102]);
    expect(filterReceivables(accounts, { ...defaults, etapa: "EXECUTADOS" }).map((account) => account.id)).toEqual([101]);
    expect(filterReceivables(accounts, { ...defaults, etapa: "CONFIRMADOS", dataInicio: "2026-08-12", dataFim: "2026-08-18" }).map((account) => account.id)).toEqual([102]);
  });
});
