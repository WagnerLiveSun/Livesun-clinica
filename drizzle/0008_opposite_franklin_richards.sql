ALTER TABLE `comissoes` ADD `tipoComissao` enum('PERCENTUAL','VALOR_FIXO') DEFAULT 'PERCENTUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE `comissoes` ADD `tipoComissao` enum('PERCENTUAL','VALOR_FIXO') DEFAULT 'PERCENTUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE `comissoes` ADD `valorRegra` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `profissionais_servicos` ADD `tipoComissao` enum('PERCENTUAL','VALOR_FIXO') DEFAULT 'PERCENTUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE `profissionais_servicos` ADD `comissaoValorFixo` decimal(10,2) DEFAULT '0.00' NOT NULL;
