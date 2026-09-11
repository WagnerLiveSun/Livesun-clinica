import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReceiptPaymentLine {
    valor: number;
    tipoPagamento: string;
    dataPagamento: Date;
    statusLiquidacao: string;
  }

  interface ReceiptData {
  clinica: {
    nome: string;
    razaoSocial?: string | null;
    cnpj?: string | null;
    endereco?: string | null;
    telefone?: string | null;
    email?: string | null;
    logoUrl?: string | null;
  };
  cliente: {
    nome: string;
    cpf?: string;
    endereco?: string;
  };
  profissional: {
    nome: string;
  };
  servico: {
    nome: string;
    descricao?: string | null;
  };
  sessao: {
    dataAgendamento: Date;
    dataExecucao?: Date;
    duracaoMin: number;
  };
  pagamento: {
    valor: number;
    valorTotal: number;
    totalPago: number;
    saldoRestante: number;
    tipoPagamento: string;
    dataPagamento: Date;
    formaPagamento: string;
    observations?: string | null;
    historico: ReceiptPaymentLine[];
  };
  recibo: {
    numero: string;
    dataEmissao: Date;
    tipo: "TOTAL" | "PARCIAL";
  };
}

export function generateReceiptHTML(data: ReceiptData): string {
  const dataFormatada = format(data.recibo.dataEmissao, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const dataAgendamento = format(data.sessao.dataAgendamento, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const dataExecucao = data.sessao.dataExecucao
    ? format(data.sessao.dataExecucao, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : "Pendente";
  const currencyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const valorFormatado = currencyFmt.format(data.pagamento.valor);
  const valorTotalFormatado = currencyFmt.format(data.pagamento.valorTotal);
  const totalPagoFormatado = currencyFmt.format(data.pagamento.totalPago);
  const saldoFormatado = currencyFmt.format(data.pagamento.saldoRestante);
  const tipoLabel = data.recibo.tipo === "TOTAL" ? "RECIBO DE QUITAÇÃO" : "RECIBO DE PAGAMENTO PARCIAL";
  const tipoBadge = data.recibo.tipo === "TOTAL" ? "QUITADO" : "PARCIAL";
  const statusTexto = data.recibo.tipo === "TOTAL"
    ? `Recebemos de ${data.cliente.nome} a importância de ${valorTotalFormatado}, referente à quitação integral de ${data.servico.nome}.`
    : `Recebemos de ${data.cliente.nome} a importância de ${valorFormatado}, referente ao pagamento parcial de ${data.servico.nome}. Total pago até o momento: ${totalPagoFormatado}. Saldo restante: ${saldoFormatado}.`;
  const historicoRows = data.pagamento.historico.map((item) => `
          <tr>
            <td>${format(item.dataPagamento, "dd/MM/yyyy", { locale: ptBR })}</td>
            <td>${item.tipoPagamento}</td>
            <td><span class="situacao-liquida">Liquidado</span></td>
            <td class="num">${currencyFmt.format(item.valor)}</td>
          </tr>`).join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo #${data.recibo.numero} - ${data.clinica.nome}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 10.5px;
      line-height: 1.2;
      color: #333;
      background: #f5f5f5;
      padding: 0;
    }

    @page {
      size: A4;
      margin: 5mm;
    }

    .receipt {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 16px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-logo {
      max-width: 110px;
      max-height: 40px;
      margin-bottom: 4px;
    }
    
    .company-name {
      font-size: 17px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 2px;
    }
    
    .company-details {
      font-size: 9px;
      color: #666;
      line-height: 1.35;
    }
    
    .receipt-title {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      color: #2c3e50;
      margin: 6px 0 2px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .receipt-number {
      text-align: center;
      font-size: 11px;
      color: #666;
      margin-bottom: 5px;
    }

    .receipt-badge {
      display: inline-block;
      margin: 0 auto 22px;
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 1px;
    }

    .receipt-badge.total {
      background: #e6f7ec;
      color: #1e7e34;
      border: 1px solid #1e7e34;
    }

    .receipt-badge.partial {
      background: #fff4d6;
      color: #8a6100;
      border: 1px solid #d9a400;
    }

    .status-text {
      background: #f4f6f8;
      border-left: 4px solid #2c3e50;
      padding: 10px 14px;
      border-radius: 4px;
      margin-bottom: 14px;
      font-size: 11px;
      line-height: 1.4;
    }

    .history-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 11px;
    }

    .history-table th,
    .history-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #e6e6e6;
      text-align: left;
    }

    .history-table th {
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: .06em;
      color: #666;
    }

    .history-table td.num {
      text-align: right;
      font-weight: bold;
    }
    
    .section {
      margin-bottom: 14px;
    }
    
    .section-title {
      font-size: 13px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .info-item {
      margin-bottom: 6px;
    }
    
    .info-label {
      font-weight: bold;
      color: #555;
      font-size: 10px;
    }
    
    .info-value {
      color: #333;
      font-size: 11px;
    }
    
    .service-details {
      background: #f9f9f9;
      padding: 6px 10px;
      border-radius: 5px;
      margin: 6px 0;
    }
    
    .service-name {
      font-size: 13px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 3px;
    }
    
    .service-description {
      font-size: 10px;
      color: #666;
      margin-bottom: 4px;
      line-height: 1.35;
    }
    
    .amount-section {
      background: #f0f8ff;
      padding: 8px 12px;
      border-radius: 5px;
      margin: 6px 0;
      text-align: right;
    }
    
    .amount-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 3px;
    }
    
    .amount-label {
      margin-right: 20px;
      font-size: 12px;
      color: #555;
    }
    
    .amount-value {
      font-size: 15px;
      font-weight: bold;
      color: #2c3e50;
    }
    
    .amount-total {
      border-top: 2px solid #2c3e50;
      padding-top: 4px;
      margin-top: 4px;
    }
    
    .amount-total .amount-value {
      font-size: 17px;
      color: #27ae60;
    }
    
    .payment-info {
      background: #fff9e6;
      padding: 8px 12px;
      border-radius: 5px;
      margin: 6px 0;
      border-left: 4px solid #f39c12;
    }
    
    .history-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0 0;
      font-size: 9.5px;
    }

    .history-table th,
    .history-table td {
      border: 1px solid #e0e0e0;
      padding: 3px 6px;
      text-align: left;
    }

    .history-table th {
      background: #f4f6f8;
      color: #2c3e50;
    }

    .history-table td.num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .situacao-liquida {
      color: #1e7e34;
      font-weight: 600;
    }

    .receipt-badge {
      display: inline-block;
      margin-top: 4px;
      margin-bottom: 4px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 9px;
      font-weight: bold;
      letter-spacing: 1px;
      background: #eaf7ee;
      color: #1e7e34;
      border: 1px solid #1e7e34;
    }

    .receipt-badge.partial {
      background: #fff4d6;
      color: #8a5a00;
      border-color: #d9a400;
    }

    .status-text.partial {
      border-left-color: #f39c12;
    }

    .status-text {
      background: #f9f9f9;
      border-left: 4px solid #27ae60;
      padding: 6px 10px;
      border-radius: 5px;
      margin: 6px 0;
      font-size: 10px;
      line-height: 1.3;
      color: #333;
    }

    .observations {
      background: #f9f9f9;
      padding: 6px 10px;
      border-radius: 5px;
      margin: 6px 0;
      font-style: italic;
      color: #666;
    }
    
    .signature-section {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #e0e0e0;
    }
    
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 6px;
    }
    
    .signature-box {
      text-align: center;
    }
    
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 24px;
      padding-top: 3px;
      font-size: 10px;
      color: #555;
    }
    
    .footer {
      margin-top: 6px;
      padding-top: 3px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 8px;
      color: #999;
    }
    
    .footer-system {
      font-weight: bold;
      color: #666;
      margin-bottom: 2px;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .receipt {
        box-shadow: none;
        padding: 2px;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Cabeçalho -->
    <div class="header">
      <div class="company-info">
        ${data.clinica.logoUrl ? `<img src="${data.clinica.logoUrl}" alt="Logo" class="company-logo">` : ''}
        <div class="company-name">${data.clinica.nome}</div>
        ${data.clinica.razaoSocial ? `<div class="company-details">${data.clinica.razaoSocial}</div>` : ''}
        <div class="company-details">
          ${data.clinica.cnpj ? `CNPJ: ${data.clinica.cnpj}<br>` : ''}
          ${data.clinica.endereco ? `${data.clinica.endereco}<br>` : ''}
          ${data.clinica.telefone ? `Tel: ${data.clinica.telefone}<br>` : ''}
          ${data.clinica.email ? `Email: ${data.clinica.email}` : ''}
        </div>
      </div>
    </div>

    <!-- Título do Recibo -->
    <div class="receipt-title">${tipoLabel}</div>
    <div class="receipt-number">
      Nº ${data.recibo.numero} • Emitido em ${dataFormatada}
    </div>
    <div style="text-align:center;">
      <span class="receipt-badge ${data.recibo.tipo === "TOTAL" ? "total" : "partial"}">${tipoBadge}</span>
    </div>

    <div class="status-text">${statusTexto}</div>

    <!-- Informações do Cliente -->
    <div class="section">
      <div class="section-title">DADOS DO CLIENTE</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Nome:</div>
          <div class="info-value">${data.cliente.nome}</div>
        </div>
        ${data.cliente.cpf ? `
        <div class="info-item">
          <div class="info-label">CPF:</div>
          <div class="info-value">${data.cliente.cpf}</div>
        </div>
        ` : ''}
        ${data.cliente.endereco ? `
        <div class="info-item" style="grid-column: span 2;">
          <div class="info-label">Endereço:</div>
          <div class="info-value">${data.cliente.endereco}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Detalhes do Serviço -->
    <div class="section">
      <div class="section-title">DETALHES DO SERVIÇO</div>
      <div class="service-details">
        <div class="service-name">${data.servico.nome}</div>
        ${data.servico.descricao ? `<div class="service-description">${data.servico.descricao}</div>` : ''}
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Profissional:</div>
            <div class="info-value">${data.profissional.nome}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Duração:</div>
            <div class="info-value">${data.sessao.duracaoMin} minutos</div>
          </div>
          <div class="info-item">
            <div class="info-label">Data Agendamento:</div>
            <div class="info-value">${dataAgendamento}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Data Execução:</div>
            <div class="info-value">${dataExecucao}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Informações de Pagamento -->
    <div class="section">
      <div class="section-title">INFORMAÇÕES DE PAGAMENTO</div>
      <div class="payment-info">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Forma de Pagamento:</div>
            <div class="info-value">${data.pagamento.formaPagamento}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Data do Pagamento:</div>
            <div class="info-value">${format(data.pagamento.dataPagamento, "dd/MM/yyyy", { locale: ptBR })}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Valores -->
    <div class="amount-section">
      <div class="amount-row">
        <div class="amount-label">Valor Total do Serviço:</div>
        <div class="amount-value">${valorTotalFormatado}</div>
      </div>
      <div class="amount-row">
        <div class="amount-label">Valor Deste Recibo:</div>
        <div class="amount-value">${valorFormatado}</div>
      </div>
      <div class="amount-row">
        <div class="amount-label">Total Pago Até o Momento:</div>
        <div class="amount-value">${totalPagoFormatado}</div>
      </div>
      <div class="amount-row amount-total">
        <div class="amount-label">Saldo Restante:</div>
        <div class="amount-value">${saldoFormatado}</div>
      </div>
    </div>

    <!-- Histórico de pagamentos -->
    <div class="section">
      <div class="section-title">HISTÓRICO DE PAGAMENTOS</div>
      <table class="history-table">
        <thead>
          <tr><th>Data</th><th>Forma</th><th>Situação</th><th style="text-align:right;">Valor</th></tr>
        </thead>
        <tbody>${historicoRows}</tbody>
      </table>
    </div>

    <!-- Observações -->
    ${data.pagamento.observations ? `
    <div class="section">
      <div class="section-title">OBSERVAÇÕES</div>
      <div class="observations">
        ${data.pagamento.observations}
      </div>
    </div>
    ` : ''}

    <!-- Assinaturas -->
    <div class="signature-section">
      <div class="signature-grid">
        <div class="signature-box">
          <div class="signature-line">
            ${data.clinica.nome}
          </div>
        </div>
        <div class="signature-box">
          <div class="signature-line">
            ${data.cliente.nome}
          </div>
        </div>
      </div>
    </div>

    <!-- Rodapé -->
    <div class="footer">
      <div class="footer-system">LiveSun Clinicas - Sistema de Gestão</div>
      <div>© ${new Date().getFullYear()} LiveSun. Todos os direitos reservados.</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `;
}

export function generateReceiptNumber(recebimentoId: number): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const sequence = String(recebimentoId).padStart(6, '0');
  return `REC${year}${month}${sequence}`;
}