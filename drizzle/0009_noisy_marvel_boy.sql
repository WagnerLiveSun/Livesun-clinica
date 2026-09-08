ALTER TABLE `profissionais_servicos` ADD `comissaoAtiva` boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE `profissionais_servicos` SET `comissaoAtiva` = `ativo`;
