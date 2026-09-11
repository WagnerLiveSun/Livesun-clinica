import { describe, expect, it } from "vitest";
import { generateReceiptHTML, generateReceiptNumber } from "./receiptGenerator";

const baseData = {
  clinica: {
    nome: "Clínica Exemplo",
    razaoSocial: "Exemplo LTDA",
    cnpj: "12.345.678/0001-90",
    endereco: "Av. Central, 100",
    telefone: "(11) 99999-0000",
    email: "contato@clinica.com.br",
    logoUrl: null,
  },
  cliente: { nome: "Maria Silva", cpf: "***5678" },
  profissional: { nome: "Dra. Ana" },
  servico: { nome: "Limpeza de pele", descricao: "Sessão de 60 minutos." },
  sessao: {
    dataAgendamento: new Date("2026-09-10T14:00:00"),
    dataExecucao: new Date("2026-09-10T15:00:00"),
    duracaoMin: 60,
  },
  recibo: { numero: "REC202609000001", dataEmissao: new Date("2026-09-11T10:00:00"), tipo: "TOTAL" as const },
  pagamento: {
    valor: 250,
    valorTotal: 250,
    totalPago: 250,
    saldoRestante: 0,
    tipoPagamento: "PIX",
    dataPagamento: new Date("2026-09-10T15:05:00"),
    formaPagamento: "PIX",
    observations: null,
    historico: [
      { valor: 250, tipoPagamento: "PIX", dataPagamento: new Date("2026-09-10T15:05:00"), statusLiquidacao: "LIQUIDADO" },
    ],
  },
};

describe("gerador de recibos", () => {
  it("gera número de recibo no formato REC AAAAMM seguido da sequência", () => {
    expect(generateReceiptNumber(7)).toMatch(/^REC\d{6}000007$/);
  });

  it("produz recibo de quitação total quando o saldo é zero", () => {
    const html = generateReceiptHTML(baseData);
    expect(html).toContain("RECIBO DE QUITAÇÃO");
    expect(html).toContain("QUITADO");
    expect(html).toContain("quitação integral");
    expect(html).toContain("250,00");
    expect(html).toContain("Saldo Restante:");
    expect(html).toContain("REC202609000001");
  });

  it("produz recibo de pagamento parcial exibindo total pago e saldo restante", () => {
    const partial = generateReceiptHTML({
      ...baseData,
      recibo: { ...baseData.recibo, tipo: "PARCIAL" },
      pagamento: {
        ...baseData.pagamento,
        valor: 100,
        totalPago: 100,
        saldoRestante: 150,
        historico: [
          { valor: 100, tipoPagamento: "PIX", dataPagamento: new Date("2026-09-10T15:05:00"), statusLiquidacao: "LIQUIDADO" },
        ],
      },
    });
    expect(partial).toContain("RECIBO DE PAGAMENTO PARCIAL");
    expect(partial).toContain("PARCIAL");
    expect(partial).toContain("pagamento parcial");
    expect(partial).toContain("150,00");
    expect(partial).toContain("100,00");
  });

  it("renderiza o histórico completo de pagamentos da conta", () => {
    const html = generateReceiptHTML({
      ...baseData,
      pagamento: {
        ...baseData.pagamento,
        historico: [
          { valor: 150, tipoPagamento: "DINHEIRO", dataPagamento: new Date("2026-09-01T10:00:00"), statusLiquidacao: "LIQUIDADO" },
          { valor: 100, tipoPagamento: "CARTAO_CREDITO", dataPagamento: new Date("2026-09-08T16:00:00"), statusLiquidacao: "PENDENTE" },
        ],
      },
    });
    expect(html).toContain("HISTÓRICO DE PAGAMENTOS");
    expect(html).toContain("DINHEIRO");
    expect(html).toContain("CARTAO_CREDITO");
    // No recibo do cliente, a situação exibida é "Liquidado" (pagamento feito).
    // A pendência de liquidação da adquirente é interna e não aparece ao cliente.
    expect(html).toContain("Liquidado");
    expect(html).not.toContain(">PENDENTE<");
  });
});