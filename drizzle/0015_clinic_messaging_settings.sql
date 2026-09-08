CREATE TABLE `clinic_messaging_settings` (
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
