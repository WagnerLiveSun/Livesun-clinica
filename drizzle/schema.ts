import {
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Clínica locatária do SunSet no ambiente SaaS. */
export const clinicas = mysqlTable("clinicas", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  ativa: boolean("ativa").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Clinica = typeof clinicas.$inferSelect;

/** Identidade autenticada pela plataforma e perfis internos da clínica. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId"), // Permite null para usuários master com acesso global
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  passwordUpdatedAt: timestamp("passwordUpdatedAt"),
  // `user` permanece por compatibilidade com contas pré-existentes da plataforma.
  role: mysqlEnum("role", ["master", "user", "admin", "recepcao", "profissional", "cliente"]).default("user").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  clinicaRoleIdx: index("users_clinica_role_idx").on(table.clinicaId, table.role),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  resetUserExpiryIdx: index("password_reset_tokens_user_expiry_idx").on(table.userId, table.expiresAt),
}));

export const clientes = mysqlTable("clientes", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  userId: int("userId").unique(),
  nome: text("nome").notNull(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 32 }),
  canalPreferido: mysqlEnum("canalPreferido", ["EMAIL", "WHATSAPP", "SMS"]).default("EMAIL").notNull(),
  consentimentoDadosEm: timestamp("consentimentoDadosEm"),
  optInComunicacao: boolean("optInComunicacao").default(false).notNull(),
  cpfHash: varchar("cpfHash", { length: 128 }),
  cpfEncrypted: text("cpfEncrypted"),
  dataNascimento: varchar("dataNascimento", { length: 16 }),
  status: mysqlEnum("status", ["ATIVO", "INATIVO", "BLOQUEADO"]).default("ATIVO").notNull(),
  observacoesInternas: text("observacoesInternas"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("clientes_clinica_status_idx").on(table.clinicaId, table.status),
}));

export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = typeof clientes.$inferInsert;

/** Sessões temporárias de um cadastro público antes da autenticação no portal do cliente. */
export const publicBookingTokens = mysqlTable("public_booking_tokens", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  clienteId: int("clienteId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  bookingClientExpiryIdx: index("public_booking_tokens_clinica_cliente_expiry_idx").on(table.clinicaId, table.clienteId, table.expiresAt),
}));

export const prontuarios = mysqlTable("prontuarios", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  clienteId: int("clienteId").notNull().unique(),
  alergias: text("alergias"),
  restricoes: text("restricoes"),
  observacoesClinicas: text("observacoesClinicas"),
  atualizadoPor: int("atualizadoPor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const servicos = mysqlTable("servicos", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  duracaoMin: int("duracaoMin").default(60).notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  tipoServico: varchar("tipoServico", { length: 64 }).default("procedimento").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  exigeQuestionario: boolean("exigeQuestionario").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Servico = typeof servicos.$inferSelect;
export type InsertServico = typeof servicos.$inferInsert;

export const profissionaisServicos = mysqlTable("profissionais_servicos", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  profissionalId: int("profissionalId").notNull(),
  servicoId: int("servicoId").notNull(),
  tipoComissao: mysqlEnum("tipoComissao", ["PERCENTUAL", "VALOR_FIXO"]).default("PERCENTUAL").notNull(),
  comissaoPercentual: decimal("comissaoPercentual", { precision: 5, scale: 2 }).default("0.00").notNull(),
  comissaoValorFixo: decimal("comissaoValorFixo", { precision: 10, scale: 2 }).default("0.00").notNull(),
  comissaoAtiva: boolean("comissaoAtiva").default(true).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
}, (table) => ({
  profissionalServicoUq: uniqueIndex("profissionais_servicos_clinica_uq").on(table.clinicaId, table.profissionalId, table.servicoId),
}));

export const insumos = mysqlTable("insumos", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  nome: text("nome").notNull(),
  unidade: varchar("unidade", { length: 20 }).default("un").notNull(),
  estoqueAtual: decimal("estoqueAtual", { precision: 10, scale: 2 }).default("0.00").notNull(),
  estoqueMinimo: decimal("estoqueMinimo", { precision: 10, scale: 2 }).default("0.00").notNull(),
  custoUnitario: decimal("custoUnitario", { precision: 10, scale: 2 }).default("0.00").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const servicosInsumos = mysqlTable("servicos_insumos", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  servicoId: int("servicoId").notNull(),
  insumoId: int("insumoId").notNull(),
  quantidade: decimal("quantidade", { precision: 10, scale: 2 }).default("1.00").notNull(),
}, (table) => ({
  servicoInsumoUq: uniqueIndex("servicos_insumos_clinica_uq").on(table.clinicaId, table.servicoId, table.insumoId),
}));

export const salas = mysqlTable("salas", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  ativa: boolean("ativa").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const equipamentos = mysqlTable("equipamentos", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  tipo: varchar("tipo", { length: 64 }),
  localizacao: varchar("localizacao", { length: 128 }),
  ativo: boolean("ativo").default(true).notNull(),
  ultimaManutencaoEm: timestamp("ultimaManutencaoEm"),
  proximaManutencaoEm: timestamp("proximaManutencaoEm"),
  observacoesInternas: text("observacoesInternas"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Equipamento = typeof equipamentos.$inferSelect;
export type InsertEquipamento = typeof equipamentos.$inferInsert;

export const sessoes = mysqlTable("sessoes", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  clienteId: int("clienteId").notNull(),
  servicoId: int("servicoId").notNull(),
  profissionalId: int("profissionalId").notNull(),
  salaId: int("salaId"),
  equipamentoId: int("equipamentoId"),
  dataHoraInicio: timestamp("dataHoraInicio").notNull(),
  dataHoraFim: timestamp("dataHoraFim").notNull(),
  duracaoMin: int("duracaoMin").notNull(),
  status: mysqlEnum("status", [
    "PENDENTE",
    "AGUARDANDO_CONFIRMACAO",
    "CONFIRMADA",
    "EM_ATENDIMENTO",
    "CONCLUIDA",
    "CANCELADA",
    "NAO_COMPARECEU",
    "BLOQUEADA",
  ]).default("AGUARDANDO_CONFIRMACAO").notNull(),
  observacoesInternas: text("observacoesInternas"),
  observacoesAtendimento: text("observacoesAtendimento"),
  fotosAntesUrl: text("fotosAntesUrl"),
  fotosDepoisUrl: text("fotosDepoisUrl"),
  motivoCancelamento: text("motivoCancelamento"),
  googleEventId: varchar("googleEventId", { length: 128 }),
  lembreteEnviadoEm: timestamp("lembreteEnviadoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  profissionalAgendaIdx: index("sessoes_clinica_profissional_inicio_idx").on(table.clinicaId, table.profissionalId, table.dataHoraInicio),
  salaAgendaIdx: index("sessoes_clinica_sala_inicio_idx").on(table.clinicaId, table.salaId, table.dataHoraInicio),
  clienteAgendaIdx: index("sessoes_clinica_cliente_inicio_idx").on(table.clinicaId, table.clienteId, table.dataHoraInicio),
}));

export type Sessao = typeof sessoes.$inferSelect;
export type InsertSessao = typeof sessoes.$inferInsert;

export const evolucoes = mysqlTable("evolucoes", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  clienteId: int("clienteId").notNull(),
  sessaoId: int("sessaoId").notNull().unique(),
  profissionalId: int("profissionalId").notNull(),
  observacoes: text("observacoes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const fotosProntuario = mysqlTable("fotos_prontuario", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  clienteId: int("clienteId").notNull(),
  sessaoId: int("sessaoId"),
  categoria: mysqlEnum("categoria", ["ANTES", "DEPOIS", "EVOLUCAO"]).notNull(),
  storageKey: text("storageKey").notNull(),
  legenda: varchar("legenda", { length: 250 }),
  enviadoPor: int("enviadoPor").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  clienteFotoIdx: index("fotos_prontuario_clinica_cliente_idx").on(table.clinicaId, table.clienteId, table.createdAt),
}));

export const questionarios = mysqlTable("questionarios", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  codigo: varchar("codigo", { length: 64 }),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  servicoId: int("servicoId"),
  tipoSessao: varchar("tipoSessao", { length: 64 }).default("PRIMEIRA_SESSAO").notNull(),
  versao: int("versao").default(1).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  criadoPor: int("criadoPor"),
  publicadoEm: timestamp("publicadoEm"),
  perguntasJson: text("perguntasJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  codigoVersaoUq: uniqueIndex("questionarios_clinica_codigo_versao_uq").on(table.clinicaId, table.codigo, table.versao),
  servicoQuestionarioIdx: index("questionarios_clinica_servico_idx").on(table.clinicaId, table.servicoId),
}));

export const perguntas = mysqlTable("perguntas", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  texto: text("texto").notNull(),
  tipoResposta: mysqlEnum("tipoResposta", ["BOOLEAN", "TEXTO", "DATA", "NUMERO", "SELECAO_UNICA", "SELECAO_MULTIPLA", "TERMO_ACEITE"]).notNull(),
  opcoesJson: text("opcoesJson"),
  orientacaoInterna: text("orientacaoInterna"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const questionarioPerguntas = mysqlTable("questionario_perguntas", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  questionarioId: int("questionarioId").notNull(),
  perguntaId: int("perguntaId").notNull(),
  ordem: int("ordem").notNull(),
  obrigatoria: boolean("obrigatoria").default(true).notNull(),
}, (table) => ({
  questionarioPerguntaUq: uniqueIndex("questionario_perguntas_clinica_uq").on(table.clinicaId, table.questionarioId, table.perguntaId),
}));

export const respostasQuestionario = mysqlTable("respostas_questionario", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  clienteId: int("clienteId").notNull(),
  sessaoId: int("sessaoId"),
  questionarioId: int("questionarioId").notNull(),
  versaoQuestionario: int("versaoQuestionario").notNull(),
  declaracaoVeracidade: boolean("declaracaoVeracidade").default(true).notNull(),
  assinaturaDigital: text("assinaturaDigital"),
  assinaturaDigitalUrl: text("assinaturaDigitalUrl"),
  respostasJson: text("respostasJson"),
  respondidoPor: int("respondidoPor"),
  respondidoEm: timestamp("respondidoEm").defaultNow().notNull(),
  retificacaoDeId: int("retificacaoDeId"),
});

export const respostas = mysqlTable("respostas", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  respostaQuestionarioId: int("respostaQuestionarioId").notNull(),
  perguntaId: int("perguntaId").notNull(),
  respostaTexto: text("respostaTexto"),
  respostaBoolean: boolean("respostaBoolean"),
  respostaNumero: decimal("respostaNumero", { precision: 12, scale: 2 }),
  respostaData: varchar("respostaData", { length: 16 }),
  respostaJson: text("respostaJson"),
});

export const contasReceber = mysqlTable("contas_receber", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  clienteId: int("clienteId").notNull(),
  sessaoId: int("sessaoId"),
  descricao: text("descricao").notNull(),
  valorOriginal: decimal("valorOriginal", { precision: 10, scale: 2 }).notNull(),
  valorDesconto: decimal("valorDesconto", { precision: 10, scale: 2 }).default("0.00").notNull(),
  valorFinal: decimal("valorFinal", { precision: 10, scale: 2 }).notNull(),
  dataVencimento: varchar("dataVencimento", { length: 16 }).notNull(),
  status: mysqlEnum("status", ["ABERTA", "PARCIAL", "PAGA", "CANCELADA", "VENCIDA"]).default("ABERTA").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const recebimentos = mysqlTable("recebimentos", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  grupoRecebimento: varchar("grupoRecebimento", { length: 64 }),
  contaReceberId: int("contaReceberId").notNull(),
  clienteId: int("clienteId").notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  tipoPagamento: mysqlEnum("tipoPagamento", ["DINHEIRO", "PIX", "CARTAO_CREDITO", "CARTAO_DEBITO", "TRANSFERENCIA", "OUTRO"]).default("PIX").notNull(),
  statusLiquidacao: mysqlEnum("statusLiquidacao", ["PENDENTE", "LIQUIDADO", "ESTORNADO"]).default("LIQUIDADO").notNull(),
  dataPrevistaLiquidacao: varchar("dataPrevistaLiquidacao", { length: 16 }),
  dataLiquidacao: varchar("dataLiquidacao", { length: 16 }),
  liquidadoEm: timestamp("liquidadoEm"),
  comprovante: text("comprovante"),
  comprovanteKey: text("comprovanteKey"),
  observacoes: text("observacoes"),
  registradoPor: int("registradoPor").notNull(),
  estornadoEm: timestamp("estornadoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  recebimentoLiquidacaoIdx: index("recebimentos_clinica_liquidacao_data_idx").on(table.clinicaId, table.statusLiquidacao, table.dataLiquidacao),
  recebimentoGrupoIdx: index("recebimentos_clinica_grupo_idx").on(table.clinicaId, table.grupoRecebimento),
}));

export const despesas = mysqlTable("despesas", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  descricao: text("descricao").notNull(),
  categoria: varchar("categoria", { length: 100 }).notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  dataCompetencia: varchar("dataCompetencia", { length: 16 }).notNull(),
  status: mysqlEnum("status", ["ABERTA", "PAGA", "CANCELADA"]).default("ABERTA").notNull(),
  pagoEm: timestamp("pagoEm"),
  registradoPor: int("registradoPor").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const caixasDiarios = mysqlTable("caixas_diarios", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  dataCaixa: varchar("dataCaixa", { length: 16 }).notNull(),
  saldoAbertura: decimal("saldoAbertura", { precision: 10, scale: 2 }).default("0.00").notNull(),
  saldoFechamentoInformado: decimal("saldoFechamentoInformado", { precision: 10, scale: 2 }),
  abertoPor: int("abertoPor").notNull(),
  fechadoPor: int("fechadoPor"),
  abertoEm: timestamp("abertoEm").defaultNow().notNull(),
  fechadoEm: timestamp("fechadoEm"),
  observacoes: text("observacoes"),
}, (table) => ({
  clinicaDataUq: uniqueIndex("caixas_diarios_clinica_data_uq").on(table.clinicaId, table.dataCaixa),
}));

export const comissoes = mysqlTable("comissoes", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  sessaoId: int("sessaoId").notNull().unique(),
  profissionalId: int("profissionalId").notNull(),
  tipoComissao: mysqlEnum("tipoComissao", ["PERCENTUAL", "VALOR_FIXO"]).default("PERCENTUAL").notNull(),
  percentual: decimal("percentual", { precision: 5, scale: 2 }).notNull(),
  valorRegra: decimal("valorRegra", { precision: 10, scale: 2 }).default("0.00").notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["PENDENTE", "PAGA", "CANCELADA"]).default("PENDENTE").notNull(),
  geradaEm: timestamp("geradaEm").defaultNow().notNull(),
  pagaEm: timestamp("pagaEm"),
});

export const lembretes = mysqlTable("lembretes", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  sessaoId: int("sessaoId").notNull(),
  destinatario: mysqlEnum("destinatario", ["CLIENTE", "PROFISSIONAL"]).notNull(),
  canal: mysqlEnum("canal", ["INTERNO", "WHATSAPP", "EMAIL", "SMS"]).default("INTERNO").notNull(),
  agendadoPara: timestamp("agendadoPara").notNull(),
  enviadoEm: timestamp("enviadoEm"),
  status: mysqlEnum("status", ["PENDENTE", "ENVIADO", "FALHA", "CANCELADO"]).default("PENDENTE").notNull(),
  conteudo: text("conteudo").notNull(),
  tentativas: int("tentativas").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  lembretePendenteIdx: index("lembretes_clinica_status_agendado_idx").on(table.clinicaId, table.status, table.agendadoPara),
}));

export const auditoria = mysqlTable("auditoria", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull(),
  usuarioId: int("usuarioId"),
  clienteId: int("clienteId"),
  entidade: varchar("entidade", { length: 64 }).notNull(),
  entidadeId: int("entidadeId"),
  acao: varchar("acao", { length: 64 }).notNull(),
  detalhesJson: text("detalhesJson"),
  dadosAntesJson: text("dadosAntesJson"),
  dadosDepoisJson: text("dadosDepoisJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Questionario = typeof questionarios.$inferSelect;
export type RespostaQuestionario = typeof respostasQuestionario.$inferSelect;
export type ContaReceber = typeof contasReceber.$inferSelect;
export type Recebimento = typeof recebimentos.$inferSelect;



export const clinicSettings = mysqlTable("clinic_settings", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull().unique(),
  nome: varchar("nome", { length: 120 }).default("SunSet").notNull(),
  razaoSocial: varchar("razaoSocial", { length: 180 }),
  segmento: varchar("segmento", { length: 100 }),
  slogan: varchar("slogan", { length: 250 }).default("Seu cuidado, seu momento"),
  logoUrl: text("logoUrl"),
  corPrimaria: varchar("corPrimaria", { length: 32 }).default("#C8627A"),
  corSecundaria: varchar("corSecundaria", { length: 32 }).default("#8F3B50"),
  endereco: text("endereco"),
  cep: varchar("cep", { length: 16 }),
  numero: varchar("numero", { length: 20 }),
  complemento: varchar("complemento", { length: 120 }),
  bairro: varchar("bairro", { length: 100 }),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  telefone: varchar("telefone", { length: 32 }),
  whatsapp: varchar("whatsapp", { length: 32 }),
  cnpj: varchar("cnpj", { length: 32 }),
  emailContato: varchar("emailContato", { length: 320 }),
  atualizadoPor: int("atualizadoPor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const clinicMessagingSettings = mysqlTable("clinic_messaging_settings", {
  id: int("id").autoincrement().primaryKey(),
  clinicaId: int("clinicaId").notNull().unique(),
  brevoApiKeyEncrypted: text("brevoApiKeyEncrypted"),
  brevoFromEmail: varchar("brevoFromEmail", { length: 320 }),
  brevoFromName: varchar("brevoFromName", { length: 120 }),
  brevoReplyTo: varchar("brevoReplyTo", { length: 320 }),
  brevoSmsSender: varchar("brevoSmsSender", { length: 32 }),
  brevoWhatsappSender: varchar("brevoWhatsappSender", { length: 32 }),
  brevoWhatsappTemplateId: varchar("brevoWhatsappTemplateId", { length: 32 }),
  emailAtivo: boolean("emailAtivo").default(true).notNull(),
  smsAtivo: boolean("smsAtivo").default(false).notNull(),
  whatsappAtivo: boolean("whatsappAtivo").default(false).notNull(),
  atualizadoPor: int("atualizadoPor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
