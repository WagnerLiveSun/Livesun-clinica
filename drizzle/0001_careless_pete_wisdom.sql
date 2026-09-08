CREATE TABLE `auditoria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuarioId` int,
	`entidade` varchar(64) NOT NULL,
	`entidadeId` int,
	`acao` varchar(64) NOT NULL,
	`detalhesJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditoria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` text NOT NULL,
	`email` varchar(320),
	`telefone` varchar(32),
	`cpfHash` varchar(128),
	`cpfEncrypted` text,
	`dataNascimento` varchar(16),
	`status` enum('ATIVO','INATIVO','BLOQUEADO') NOT NULL DEFAULT 'ATIVO',
	`observacoesInternas` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contas_receber` (
	`id` int AUTO_INCREMENT NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `equipamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `questionarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` text NOT NULL,
	`descricao` text,
	`tipoSessao` varchar(64) NOT NULL DEFAULT 'PRIMEIRA_SESSAO',
	`versao` int NOT NULL DEFAULT 1,
	`ativo` boolean NOT NULL DEFAULT true,
	`perguntasJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questionarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recebimentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contaReceberId` int NOT NULL,
	`clienteId` int NOT NULL,
	`valor` decimal(10,2) NOT NULL,
	`tipoPagamento` enum('DINHEIRO','PIX','CARTAO_CREDITO','CARTAO_DEBITO','TRANSFERENCIA','OUTRO') NOT NULL DEFAULT 'PIX',
	`comprovante` text,
	`observacoes` text,
	`registradoPor` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recebimentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `respostas_questionario` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clienteId` int NOT NULL,
	`sessaoId` int,
	`questionarioId` int NOT NULL,
	`versaoQuestionario` int NOT NULL,
	`declaracaoVeracidade` boolean NOT NULL DEFAULT true,
	`respostasJson` text NOT NULL,
	`assinaturaDigitalUrl` text,
	`respondidoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `respostas_questionario_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `servicos` (
	`id` int AUTO_INCREMENT NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `sessoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clienteId` int NOT NULL,
	`servicoId` int NOT NULL,
	`equipamentoId` int,
	`profissionalId` int NOT NULL,
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','recepcao','profissional','cliente') NOT NULL DEFAULT 'cliente';--> statement-breakpoint
ALTER TABLE `users` ADD `telefone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `ativo` boolean DEFAULT true NOT NULL;