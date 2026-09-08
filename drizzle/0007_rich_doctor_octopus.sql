ALTER TABLE `recebimentos` ADD `statusLiquidacao` enum('PENDENTE','LIQUIDADO','ESTORNADO') DEFAULT 'LIQUIDADO' NOT NULL;--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `dataPrevistaLiquidacao` varchar(16);--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `dataLiquidacao` varchar(16);--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `liquidadoEm` timestamp;--> statement-breakpoint
CREATE INDEX `recebimentos_liquidacao_data_idx` ON `recebimentos` (`statusLiquidacao`,`dataLiquidacao`);