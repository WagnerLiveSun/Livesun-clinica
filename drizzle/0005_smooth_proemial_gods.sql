CREATE TABLE `public_booking_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clienteId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `public_booking_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_booking_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `clientes` ADD `canalPreferido` enum('EMAIL','WHATSAPP','SMS') DEFAULT 'EMAIL' NOT NULL;--> statement-breakpoint
ALTER TABLE `clientes` ADD `consentimentoDadosEm` timestamp;--> statement-breakpoint
ALTER TABLE `clientes` ADD `optInComunicacao` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `public_booking_tokens_client_expiry_idx` ON `public_booking_tokens` (`clienteId`,`expiresAt`);