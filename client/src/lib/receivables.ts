export type ReceivableFilter = {
  cliente: string;
  situacao: string;
  etapa: string;
  dataInicio: string;
  dataFim: string;
};

export type ReceivableItem = {
  id: number;
  clienteNome: string;
  status: string;
  sessaoStatus: string | null;
  dataVencimento: string;
};

export function filterReceivables<T extends ReceivableItem>(accounts: T[], filters: ReceivableFilter) {
  return accounts.filter((account) => {
    const clienteCorresponde = !filters.cliente || account.clienteNome.toLowerCase().includes(filters.cliente.toLowerCase()) || String(account.id).includes(filters.cliente);
    const situacaoCorresponde = filters.situacao === "TODAS" || (filters.situacao === "ABERTAS" ? account.status !== "PAGA" : account.status === filters.situacao);
    const etapaCorresponde = filters.etapa === "TODAS" || (filters.etapa === "EXECUTADOS" ? account.sessaoStatus === "CONCLUIDA" : account.sessaoStatus === "CONFIRMADA");
    const inicioCorresponde = !filters.dataInicio || account.dataVencimento >= filters.dataInicio;
    const fimCorresponde = !filters.dataFim || account.dataVencimento <= filters.dataFim;
    return clienteCorresponde && situacaoCorresponde && etapaCorresponde && inicioCorresponde && fimCorresponde;
  });
}
