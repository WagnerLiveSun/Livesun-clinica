CREATE TABLE `clinic_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` text NOT NULL DEFAULT ('Aura'),
	`slogan` text DEFAULT ('Seu cuidado, seu momento'),
	`logoUrl` text,
	`corPrimaria` varchar(32) DEFAULT '#C8627A',
	`corSecundaria` varchar(32) DEFAULT '#8F3B50',
	`endereco` text,
	`telefone` varchar(32),
	`cnpj` varchar(32),
	`emailContato` varchar(320),
	`atualizadoPor` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinic_settings_id` PRIMARY KEY(`id`)
);
