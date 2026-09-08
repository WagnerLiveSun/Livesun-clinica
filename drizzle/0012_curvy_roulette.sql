ALTER TABLE `recebimentos` ADD `grupoRecebimento` varchar(64);--> statement-breakpoint
CREATE INDEX `recebimentos_grupo_idx` ON `recebimentos` (`grupoRecebimento`);