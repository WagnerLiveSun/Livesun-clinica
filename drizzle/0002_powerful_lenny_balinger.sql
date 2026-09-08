CREATE TABLE `caixas_diarios` (
  `id` int AUTO_INCREMENT NOT NULL,
  `dataCaixa` varchar(16) NOT NULL,
  `saldoAbertura` decimal(10,2) NOT NULL DEFAULT '0.00',
  `saldoFechamentoInformado` decimal(10,2),
  `abertoPor` int NOT NULL,
  `fechadoPor` int,
  `abertoEm` timestamp NOT NULL DEFAULT (now()),
  `fechadoEm` timestamp,
  `observacoes` text,
  CONSTRAINT `caixas_diarios_id` PRIMARY KEY(`id`),
  CONSTRAINT `caixas_diarios_dataCaixa_unique` UNIQUE(`dataCaixa`)
);
--> statement-breakpoint
CREATE TABLE `comissoes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `sessaoId` int NOT NULL,
  `profissionalId` int NOT NULL,
  `percentual` decimal(5,2) NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `status` enum('PENDENTE','PAGA','CANCELADA') NOT NULL DEFAULT 'PENDENTE',
  `geradaEm` timestamp NOT NULL DEFAULT (now()),
  `pagaEm` timestamp,
  CONSTRAINT `comissoes_id` PRIMARY KEY(`id`),
  CONSTRAINT `comissoes_sessaoId_unique` UNIQUE(`sessaoId`)
);
--> statement-breakpoint
CREATE TABLE `despesas` (
  `id` int AUTO_INCREMENT NOT NULL,
  `descricao` text NOT NULL,
  `categoria` varchar(100) NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `dataCompetencia` varchar(16) NOT NULL,
  `status` enum('ABERTA','PAGA','CANCELADA') NOT NULL DEFAULT 'ABERTA',
  `pagoEm` timestamp,
  `registradoPor` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `despesas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evolucoes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `clienteId` int NOT NULL,
  `sessaoId` int NOT NULL,
  `profissionalId` int NOT NULL,
  `observacoes` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `evolucoes_id` PRIMARY KEY(`id`),
  CONSTRAINT `evolucoes_sessaoId_unique` UNIQUE(`sessaoId`)
);
--> statement-breakpoint
CREATE TABLE `fotos_prontuario` (
  `id` int AUTO_INCREMENT NOT NULL,
  `clienteId` int NOT NULL,
  `sessaoId` int,
  `categoria` enum('ANTES','DEPOIS','EVOLUCAO') NOT NULL,
  `storageKey` text NOT NULL,
  `legenda` varchar(250),
  `enviadoPor` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `fotos_prontuario_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insumos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `nome` text NOT NULL,
  `unidade` varchar(20) NOT NULL DEFAULT 'un',
  `estoqueAtual` decimal(10,2) NOT NULL DEFAULT '0.00',
  `estoqueMinimo` decimal(10,2) NOT NULL DEFAULT '0.00',
  `custoUnitario` decimal(10,2) NOT NULL DEFAULT '0.00',
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `insumos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lembretes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `sessaoId` int NOT NULL,
  `destinatario` enum('CLIENTE','PROFISSIONAL') NOT NULL,
  `canal` enum('INTERNO','WHATSAPP','EMAIL') NOT NULL DEFAULT 'INTERNO',
  `agendadoPara` timestamp NOT NULL,
  `enviadoEm` timestamp,
  `status` enum('PENDENTE','ENVIADO','FALHA','CANCELADO') NOT NULL DEFAULT 'PENDENTE',
  `conteudo` text NOT NULL,
  `tentativas` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `lembretes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `perguntas` (
  `id` int AUTO_INCREMENT NOT NULL,
  `texto` text NOT NULL,
  `tipoResposta` enum('BOOLEAN','TEXTO','DATA','NUMERO','SELECAO_UNICA','SELECAO_MULTIPLA','TERMO_ACEITE') NOT NULL,
  `opcoesJson` text,
  `orientacaoInterna` text,
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `perguntas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profissionais_servicos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `profissionalId` int NOT NULL,
  `servicoId` int NOT NULL,
  `comissaoPercentual` decimal(5,2) NOT NULL DEFAULT '0.00',
  `ativo` boolean NOT NULL DEFAULT true,
  CONSTRAINT `profissionais_servicos_id` PRIMARY KEY(`id`),
  CONSTRAINT `profissionais_servicos_uq` UNIQUE(`profissionalId`,`servicoId`)
);
--> statement-breakpoint
CREATE TABLE `prontuarios` (
  `id` int AUTO_INCREMENT NOT NULL,
  `clienteId` int NOT NULL,
  `alergias` text,
  `restricoes` text,
  `observacoesClinicas` text,
  `atualizadoPor` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `prontuarios_id` PRIMARY KEY(`id`),
  CONSTRAINT `prontuarios_clienteId_unique` UNIQUE(`clienteId`)
);
--> statement-breakpoint
CREATE TABLE `questionario_perguntas` (
  `id` int AUTO_INCREMENT NOT NULL,
  `questionarioId` int NOT NULL,
  `perguntaId` int NOT NULL,
  `ordem` int NOT NULL,
  `obrigatoria` boolean NOT NULL DEFAULT true,
  CONSTRAINT `questionario_perguntas_id` PRIMARY KEY(`id`),
  CONSTRAINT `questionario_perguntas_uq` UNIQUE(`questionarioId`,`perguntaId`)
);
--> statement-breakpoint
CREATE TABLE `respostas` (
  `id` int AUTO_INCREMENT NOT NULL,
  `respostaQuestionarioId` int NOT NULL,
  `perguntaId` int NOT NULL,
  `respostaTexto` text,
  `respostaBoolean` boolean,
  `respostaNumero` decimal(12,2),
  `respostaData` varchar(16),
  `respostaJson` text,
  CONSTRAINT `respostas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salas` (
  `id` int AUTO_INCREMENT NOT NULL,
  `nome` text NOT NULL,
  `descricao` text,
  `ativa` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `salas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `servicos_insumos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `servicoId` int NOT NULL,
  `insumoId` int NOT NULL,
  `quantidade` decimal(10,2) NOT NULL DEFAULT '1.00',
  CONSTRAINT `servicos_insumos_id` PRIMARY KEY(`id`),
  CONSTRAINT `servicos_insumos_uq` UNIQUE(`servicoId`,`insumoId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','recepcao','profissional','cliente') NOT NULL DEFAULT 'user';
--> statement-breakpoint
ALTER TABLE `auditoria` ADD `clienteId` int;
--> statement-breakpoint
ALTER TABLE `auditoria` ADD `dadosAntesJson` text;
--> statement-breakpoint
ALTER TABLE `auditoria` ADD `dadosDepoisJson` text;
--> statement-breakpoint
ALTER TABLE `clientes` ADD `userId` int;
--> statement-breakpoint
ALTER TABLE `questionarios` ADD `codigo` varchar(64);
--> statement-breakpoint
ALTER TABLE `questionarios` ADD `servicoId` int;
--> statement-breakpoint
ALTER TABLE `questionarios` ADD `criadoPor` int;
--> statement-breakpoint
ALTER TABLE `questionarios` ADD `publicadoEm` timestamp;
--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `comprovanteKey` text;
--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `estornadoEm` timestamp;
--> statement-breakpoint
ALTER TABLE `respostas_questionario` ADD `assinaturaDigital` text;
--> statement-breakpoint
ALTER TABLE `respostas_questionario` ADD `respondidoPor` int;
--> statement-breakpoint
ALTER TABLE `respostas_questionario` ADD `retificacaoDeId` int;
--> statement-breakpoint
ALTER TABLE `sessoes` ADD `salaId` int;
--> statement-breakpoint
ALTER TABLE `sessoes` ADD `lembreteEnviadoEm` timestamp;
--> statement-breakpoint
ALTER TABLE `clientes` ADD CONSTRAINT `clientes_userId_unique` UNIQUE(`userId`);
--> statement-breakpoint
ALTER TABLE `questionarios` ADD CONSTRAINT `questionarios_codigo_versao_uq` UNIQUE(`codigo`,`versao`);
--> statement-breakpoint
CREATE INDEX `fotos_prontuario_cliente_idx` ON `fotos_prontuario` (`clienteId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `lembretes_status_agendado_idx` ON `lembretes` (`status`,`agendadoPara`);
--> statement-breakpoint
CREATE INDEX `clientes_status_idx` ON `clientes` (`status`);
--> statement-breakpoint
CREATE INDEX `questionarios_servico_idx` ON `questionarios` (`servicoId`);
--> statement-breakpoint
CREATE INDEX `sessoes_profissional_inicio_idx` ON `sessoes` (`profissionalId`,`dataHoraInicio`);
--> statement-breakpoint
CREATE INDEX `sessoes_sala_inicio_idx` ON `sessoes` (`salaId`,`dataHoraInicio`);
--> statement-breakpoint
CREATE INDEX `sessoes_cliente_inicio_idx` ON `sessoes` (`clienteId`,`dataHoraInicio`);
