-- ============================================================
-- LiveSun Clinicas - IMPORTACAO HOSTINGER (phpMyAdmin)
-- Destino: u951548013_clinica  |  Usuario: u951548013_LS_Clinica
-- Como usar: hPanel > Bancos de Dados > phpMyAdmin > selecionar
-- u951548013_clinica > aba Importar > escolher este arquivo > Executar
-- ============================================================
-- SunSet â€” esquema MySQL completo correspondente a drizzle/schema.ts
-- Execute em uma instalaÃ§Ã£o vazia do MySQL 8.0+.
# Banco de destino: u951548013_clinica (Hostinger)
USE `u951548013_clinica`;

CREATE TABLE `auditoria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`usuarioId` int,
	`clienteId` int,
	`entidade` varchar(64) NOT NULL,
	`entidadeId` int,
	`acao` varchar(64) NOT NULL,
	`detalhesJson` text,
	`dadosAntesJson` text,
	`dadosDepoisJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditoria_id` PRIMARY KEY(`id`)
);

CREATE TABLE `caixas_diarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`dataCaixa` varchar(16) NOT NULL,
	`saldoAbertura` decimal(10,2) NOT NULL DEFAULT '0.00',
	`saldoFechamentoInformado` decimal(10,2),
	`abertoPor` int NOT NULL,
	`fechadoPor` int,
	`abertoEm` timestamp NOT NULL DEFAULT (now()),
	`fechadoEm` timestamp,
	`observacoes` text,
	CONSTRAINT `caixas_diarios_id` PRIMARY KEY(`id`),
	CONSTRAINT `caixas_diarios_clinica_data_uq` UNIQUE(`clinicaId`,`dataCaixa`)
);

CREATE TABLE `clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`userId` int,
	`nome` text NOT NULL,
	`email` varchar(320),
	`telefone` varchar(32),
	`canalPreferido` enum('EMAIL','WHATSAPP','SMS') NOT NULL DEFAULT 'EMAIL',
	`consentimentoDadosEm` timestamp,
	`optInComunicacao` boolean NOT NULL DEFAULT false,
	`cpfHash` varchar(128),
	`cpfEncrypted` text,
	`dataNascimento` varchar(16),
	`status` enum('ATIVO','INATIVO','BLOQUEADO') NOT NULL DEFAULT 'ATIVO',
	`observacoesInternas` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientes_id` PRIMARY KEY(`id`),
	CONSTRAINT `clientes_userId_unique` UNIQUE(`userId`)
);

CREATE TABLE `clinic_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`nome` varchar(120) NOT NULL DEFAULT 'SunSet',
	`razaoSocial` varchar(180),
	`segmento` varchar(100),
	`slogan` varchar(250) DEFAULT 'Seu cuidado, seu momento',
	`logoUrl` text,
	`corPrimaria` varchar(32) DEFAULT '#C8627A',
	`corSecundaria` varchar(32) DEFAULT '#8F3B50',
	`endereco` text,
	`cep` varchar(16),
	`numero` varchar(20),
	`complemento` varchar(120),
	`bairro` varchar(100),
	`cidade` varchar(100),
	`estado` varchar(2),
	`telefone` varchar(32),
	`whatsapp` varchar(32),
	`cnpj` varchar(32),
	`emailContato` varchar(320),
	`atualizadoPor` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinic_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `clinic_settings_clinicaId_unique` UNIQUE(`clinicaId`)
);

CREATE TABLE `clinicas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(120) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`ativa` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinicas_id` PRIMARY KEY(`id`),
	CONSTRAINT `clinicas_slug_unique` UNIQUE(`slug`)
);

CREATE TABLE `comissoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`sessaoId` int NOT NULL,
	`profissionalId` int NOT NULL,
	`tipoComissao` enum('PERCENTUAL','VALOR_FIXO') NOT NULL DEFAULT 'PERCENTUAL',
	`percentual` decimal(5,2) NOT NULL,
	`valorRegra` decimal(10,2) NOT NULL DEFAULT '0.00',
	`valor` decimal(10,2) NOT NULL,
	`status` enum('PENDENTE','PAGA','CANCELADA') NOT NULL DEFAULT 'PENDENTE',
	`geradaEm` timestamp NOT NULL DEFAULT (now()),
	`pagaEm` timestamp,
	CONSTRAINT `comissoes_id` PRIMARY KEY(`id`),
	CONSTRAINT `comissoes_sessaoId_unique` UNIQUE(`sessaoId`)
);

CREATE TABLE `contas_receber` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`clienteId` int NOT NULL,
	`sessaoId` int,
	`descricao` text NOT NULL,
	`valorOriginal` decimal(10,2) NOT NULL,
	`valorDesconto` decimal(10,2) NOT NULL DEFAULT '0.00',
	`valorFinal` decimal(10,2) NOT NULL,
	`dataVencimento` varchar(16) NOT NULL,
	`status` enum('ABERTA','PARCIAL','PAGA','CANCELADA','VENCIDA') NOT NULL DEFAULT 'ABERTA',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contas_receber_id` PRIMARY KEY(`id`)
);

CREATE TABLE `despesas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
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

CREATE TABLE `equipamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`nome` text NOT NULL,
	`descricao` text,
	`tipo` varchar(64),
	`localizacao` varchar(128),
	`ativo` boolean NOT NULL DEFAULT true,
	`ultimaManutencaoEm` timestamp,
	`proximaManutencaoEm` timestamp,
	`observacoesInternas` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipamentos_id` PRIMARY KEY(`id`)
);

CREATE TABLE `evolucoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`clienteId` int NOT NULL,
	`sessaoId` int NOT NULL,
	`profissionalId` int NOT NULL,
	`observacoes` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evolucoes_id` PRIMARY KEY(`id`),
	CONSTRAINT `evolucoes_sessaoId_unique` UNIQUE(`sessaoId`)
);

CREATE TABLE `fotos_prontuario` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`clienteId` int NOT NULL,
	`sessaoId` int,
	`categoria` enum('ANTES','DEPOIS','EVOLUCAO') NOT NULL,
	`storageKey` text NOT NULL,
	`legenda` varchar(250),
	`enviadoPor` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fotos_prontuario_id` PRIMARY KEY(`id`)
);

CREATE TABLE `insumos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
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

CREATE TABLE `lembretes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`sessaoId` int NOT NULL,
	`destinatario` enum('CLIENTE','PROFISSIONAL') NOT NULL,
	`canal` enum('INTERNO','WHATSAPP','EMAIL','SMS') NOT NULL DEFAULT 'INTERNO',
	`agendadoPara` timestamp NOT NULL,
	`enviadoEm` timestamp,
	`status` enum('PENDENTE','ENVIADO','FALHA','CANCELADO') NOT NULL DEFAULT 'PENDENTE',
	`conteudo` text NOT NULL,
	`tentativas` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lembretes_id` PRIMARY KEY(`id`)
);

CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);

CREATE TABLE `perguntas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`texto` text NOT NULL,
	`tipoResposta` enum('BOOLEAN','TEXTO','DATA','NUMERO','SELECAO_UNICA','SELECAO_MULTIPLA','TERMO_ACEITE') NOT NULL,
	`opcoesJson` text,
	`orientacaoInterna` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `perguntas_id` PRIMARY KEY(`id`)
);

CREATE TABLE `profissionais_servicos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`profissionalId` int NOT NULL,
	`servicoId` int NOT NULL,
	`tipoComissao` enum('PERCENTUAL','VALOR_FIXO') NOT NULL DEFAULT 'PERCENTUAL',
	`comissaoPercentual` decimal(5,2) NOT NULL DEFAULT '0.00',
	`comissaoValorFixo` decimal(10,2) NOT NULL DEFAULT '0.00',
	`comissaoAtiva` boolean NOT NULL DEFAULT true,
	`ativo` boolean NOT NULL DEFAULT true,
	CONSTRAINT `profissionais_servicos_id` PRIMARY KEY(`id`),
	CONSTRAINT `profissionais_servicos_clinica_uq` UNIQUE(`clinicaId`,`profissionalId`,`servicoId`)
);

CREATE TABLE `prontuarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
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

CREATE TABLE `public_booking_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`clienteId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `public_booking_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_booking_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);

CREATE TABLE `questionario_perguntas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`questionarioId` int NOT NULL,
	`perguntaId` int NOT NULL,
	`ordem` int NOT NULL,
	`obrigatoria` boolean NOT NULL DEFAULT true,
	CONSTRAINT `questionario_perguntas_id` PRIMARY KEY(`id`),
	CONSTRAINT `questionario_perguntas_clinica_uq` UNIQUE(`clinicaId`,`questionarioId`,`perguntaId`)
);

CREATE TABLE `questionarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`codigo` varchar(64),
	`nome` text NOT NULL,
	`descricao` text,
	`servicoId` int,
	`tipoSessao` varchar(64) NOT NULL DEFAULT 'PRIMEIRA_SESSAO',
	`versao` int NOT NULL DEFAULT 1,
	`ativo` boolean NOT NULL DEFAULT true,
	`criadoPor` int,
	`publicadoEm` timestamp,
	`perguntasJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questionarios_id` PRIMARY KEY(`id`),
	CONSTRAINT `questionarios_clinica_codigo_versao_uq` UNIQUE(`clinicaId`,`codigo`,`versao`)
);

CREATE TABLE `recebimentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`grupoRecebimento` varchar(64),
	`contaReceberId` int NOT NULL,
	`clienteId` int NOT NULL,
	`valor` decimal(10,2) NOT NULL,
	`tipoPagamento` enum('DINHEIRO','PIX','CARTAO_CREDITO','CARTAO_DEBITO','TRANSFERENCIA','OUTRO') NOT NULL DEFAULT 'PIX',
	`statusLiquidacao` enum('PENDENTE','LIQUIDADO','ESTORNADO') NOT NULL DEFAULT 'LIQUIDADO',
	`dataPrevistaLiquidacao` varchar(16),
	`dataLiquidacao` varchar(16),
	`liquidadoEm` timestamp,
	`comprovante` text,
	`comprovanteKey` text,
	`observacoes` text,
	`registradoPor` int NOT NULL,
	`estornadoEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recebimentos_id` PRIMARY KEY(`id`)
);

CREATE TABLE `respostas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`respostaQuestionarioId` int NOT NULL,
	`perguntaId` int NOT NULL,
	`respostaTexto` text,
	`respostaBoolean` boolean,
	`respostaNumero` decimal(12,2),
	`respostaData` varchar(16),
	`respostaJson` text,
	CONSTRAINT `respostas_id` PRIMARY KEY(`id`)
);

CREATE TABLE `respostas_questionario` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`clienteId` int NOT NULL,
	`sessaoId` int,
	`questionarioId` int NOT NULL,
	`versaoQuestionario` int NOT NULL,
	`declaracaoVeracidade` boolean NOT NULL DEFAULT true,
	`assinaturaDigital` text,
	`assinaturaDigitalUrl` text,
	`respostasJson` text,
	`respondidoPor` int,
	`respondidoEm` timestamp NOT NULL DEFAULT (now()),
	`retificacaoDeId` int,
	CONSTRAINT `respostas_questionario_id` PRIMARY KEY(`id`)
);

CREATE TABLE `salas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`nome` text NOT NULL,
	`descricao` text,
	`ativa` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salas_id` PRIMARY KEY(`id`)
);

CREATE TABLE `servicos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`nome` text NOT NULL,
	`descricao` text,
	`duracaoMin` int NOT NULL DEFAULT 60,
	`valor` decimal(10,2) NOT NULL,
	`tipoServico` varchar(64) NOT NULL DEFAULT 'procedimento',
	`ativo` boolean NOT NULL DEFAULT true,
	`exigeQuestionario` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `servicos_id` PRIMARY KEY(`id`)
);

CREATE TABLE `servicos_insumos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`servicoId` int NOT NULL,
	`insumoId` int NOT NULL,
	`quantidade` decimal(10,2) NOT NULL DEFAULT '1.00',
	CONSTRAINT `servicos_insumos_id` PRIMARY KEY(`id`),
	CONSTRAINT `servicos_insumos_clinica_uq` UNIQUE(`clinicaId`,`servicoId`,`insumoId`)
);

CREATE TABLE `sessoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`clienteId` int NOT NULL,
	`servicoId` int NOT NULL,
	`profissionalId` int NOT NULL,
	`salaId` int,
	`equipamentoId` int,
	`dataHoraInicio` timestamp NOT NULL,
	`dataHoraFim` timestamp NOT NULL,
	`duracaoMin` int NOT NULL,
	`status` enum('PENDENTE','AGUARDANDO_CONFIRMACAO','CONFIRMADA','EM_ATENDIMENTO','CONCLUIDA','CANCELADA','NAO_COMPARECEU','BLOQUEADA') NOT NULL DEFAULT 'AGUARDANDO_CONFIRMACAO',
	`observacoesInternas` text,
	`observacoesAtendimento` text,
	`fotosAntesUrl` text,
	`fotosDepoisUrl` text,
	`motivoCancelamento` text,
	`googleEventId` varchar(128),
	`lembreteEnviadoEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessoes_id` PRIMARY KEY(`id`)
);

CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`telefone` varchar(32),
	`loginMethod` varchar(64),
	`passwordHash` varchar(255),
	`passwordUpdatedAt` timestamp,
	`role` enum('master','user','admin','recepcao','profissional','cliente') NOT NULL DEFAULT 'user',
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

CREATE INDEX `clientes_clinica_status_idx` ON `clientes` (`clinicaId`,`status`);
CREATE INDEX `fotos_prontuario_clinica_cliente_idx` ON `fotos_prontuario` (`clinicaId`,`clienteId`,`createdAt`);
CREATE INDEX `lembretes_clinica_status_agendado_idx` ON `lembretes` (`clinicaId`,`status`,`agendadoPara`);
CREATE INDEX `password_reset_tokens_user_expiry_idx` ON `password_reset_tokens` (`userId`,`expiresAt`);
CREATE INDEX `public_booking_tokens_clinica_cliente_expiry_idx` ON `public_booking_tokens` (`clinicaId`,`clienteId`,`expiresAt`);
CREATE INDEX `questionarios_clinica_servico_idx` ON `questionarios` (`clinicaId`,`servicoId`);
CREATE INDEX `recebimentos_clinica_liquidacao_data_idx` ON `recebimentos` (`clinicaId`,`statusLiquidacao`,`dataLiquidacao`);
CREATE INDEX `recebimentos_clinica_grupo_idx` ON `recebimentos` (`clinicaId`,`grupoRecebimento`);
CREATE INDEX `sessoes_clinica_profissional_inicio_idx` ON `sessoes` (`clinicaId`,`profissionalId`,`dataHoraInicio`);
CREATE INDEX `sessoes_clinica_sala_inicio_idx` ON `sessoes` (`clinicaId`,`salaId`,`dataHoraInicio`);
CREATE INDEX `sessoes_clinica_cliente_inicio_idx` ON `sessoes` (`clinicaId`,`clienteId`,`dataHoraInicio`);
CREATE INDEX `users_clinica_role_idx` ON `users` (`clinicaId`,`role`);

CREATE TABLE IF NOT EXISTS `clinic_messaging_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicaId` int NOT NULL,
	`brevoApiKeyEncrypted` text,
	`brevoFromEmail` varchar(320),
	`brevoFromName` varchar(120),
	`brevoReplyTo` varchar(320),
	`brevoSmsSender` varchar(32),
	`brevoWhatsappSender` varchar(32),
	`brevoWhatsappTemplateId` varchar(32),
	`emailAtivo` boolean NOT NULL DEFAULT true,
	`smsAtivo` boolean NOT NULL DEFAULT false,
	`whatsappAtivo` boolean NOT NULL DEFAULT false,
	`atualizadoPor` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinic_messaging_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `clinic_messaging_settings_clinicaId_unique` UNIQUE(`clinicaId`)
);


-- ============ SEED INICIAL ============

-- SunSet â€” setup inicial idempotente (versÃ£o portÃ¡til)
-- Cria o usuÃ¡rio master (consultor), a clÃ­nica provisÃ³ria e o administrador,
-- preservando tudo o que jÃ¡ existir. Pode ser executado mais de uma vez.
USE `u951548013_clinica`;

-- 1) ClÃ­nica provisÃ³ria (somente se nÃ£o houver nenhuma clÃ­nica)
INSERT INTO `clinicas` (`id`, `nome`, `slug`, `ativa`, `createdAt`, `updatedAt`)
SELECT 1, 'ClÃ­nica Exemplo', 'clinica-principal', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `clinicas`);

-- 2) UsuÃ¡rio master â€” acesso global para consultores
--    Login: master@livesun.com.br  |  Senha: Master@2024SunSet
INSERT INTO `users` (`clinicaId`, `openId`, `name`, `email`, `loginMethod`, `passwordHash`, `passwordUpdatedAt`, `role`, `ativo`, `lastSignedIn`)
SELECT 0, 'local:seed-master-sunset', 'Consultor Master SunSet', 'master@livesun.com.br', 'local',
       '$2b$12$jnb0.aj7Gs0H8CpjtS14e.RtLniKyZvRtAnyLnySZzgENIhyfKRvO', NOW(), 'master', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `role` = 'master');

-- 3) ConfiguraÃ§Ãµes bÃ¡sicas da primeira clÃ­nica (somente se faltarem)
INSERT INTO `clinic_settings` (`clinicaId`, `nome`, `slogan`, `corPrimaria`, `corSecundaria`, `logoUrl`, `createdAt`, `updatedAt`)
SELECT c.`id`, c.`nome`, 'Seu cuidado, seu momento', '#C8627A', '#8F3B50', '/assets/logo-sunset.svg', NOW(), NOW()
FROM `clinicas` c
WHERE c.`id` = (SELECT MIN(`id`) FROM `clinicas`)
  AND NOT EXISTS (SELECT 1 FROM `clinic_settings` s WHERE s.`clinicaId` = c.`id`);

-- 4) Administrador temporÃ¡rio da primeira clÃ­nica (nÃ£o sobrescreve gestor existente)
--    Login: admin@clinica-exemplo.com  |  Senha temporÃ¡ria: Admin123456
INSERT INTO `users` (`clinicaId`, `openId`, `name`, `email`, `loginMethod`, `passwordHash`, `passwordUpdatedAt`, `role`, `ativo`, `lastSignedIn`)
SELECT (SELECT MIN(`id`) FROM `clinicas`), 'local:seed-admin-sunset', 'Administrador', 'admin@clinica-exemplo.com', 'local',
       '$2b$12$a7V1.ucCTLg9CbxApwjmEeidHjzsMFNwaR2TDmQdebHc0w5AHJoA.', NOW(), 'admin', true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `role` = 'admin'
    AND `clinicaId` = (SELECT MIN(`id`) FROM `clinicas`)
);


