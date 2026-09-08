CREATE TABLE `clinicas` (
  `id` int AUTO_INCREMENT NOT NULL,
  `nome` varchar(120) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `ativa` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `clinicas_id` PRIMARY KEY(`id`),
  CONSTRAINT `clinicas_slug_unique` UNIQUE(`slug`)
);--> statement-breakpoint

INSERT INTO `clinicas` (`id`, `nome`, `slug`, `ativa`, `createdAt`, `updatedAt`)
SELECT 1, COALESCE(NULLIF((SELECT `nome` FROM `clinic_settings` ORDER BY `id` DESC LIMIT 1), ''), 'Clínica Principal'), 'clinica-principal', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `clinicas` WHERE `id` = 1);--> statement-breakpoint

ALTER TABLE `auditoria` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `caixas_diarios` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `clientes` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `clinic_settings` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `comissoes` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `contas_receber` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `despesas` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `equipamentos` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `evolucoes` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `fotos_prontuario` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `insumos` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `lembretes` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `perguntas` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `profissionais_servicos` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `prontuarios` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `public_booking_tokens` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `questionario_perguntas` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `questionarios` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `respostas` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `respostas_questionario` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `salas` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `servicos` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `servicos_insumos` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `sessoes` ADD `clinicaId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `clinicaId` int;--> statement-breakpoint

UPDATE `auditoria` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `caixas_diarios` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `clientes` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `clinic_settings` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `comissoes` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `contas_receber` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `despesas` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `equipamentos` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `evolucoes` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `fotos_prontuario` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `insumos` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `lembretes` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `password_reset_tokens` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `perguntas` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `profissionais_servicos` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `prontuarios` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `public_booking_tokens` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `questionario_perguntas` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `questionarios` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `recebimentos` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `respostas` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `respostas_questionario` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `salas` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `servicos` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `servicos_insumos` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `sessoes` SET `clinicaId` = 1;--> statement-breakpoint
UPDATE `users` SET `clinicaId` = 1;--> statement-breakpoint

ALTER TABLE `auditoria` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `caixas_diarios` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `clientes` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `clinic_settings` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `comissoes` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `contas_receber` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `despesas` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `equipamentos` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `evolucoes` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `fotos_prontuario` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `insumos` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `lembretes` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `perguntas` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `profissionais_servicos` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `prontuarios` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `public_booking_tokens` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `questionario_perguntas` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `questionarios` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `recebimentos` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `respostas` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `respostas_questionario` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `salas` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `servicos` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `servicos_insumos` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `sessoes` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY `clinicaId` int NOT NULL;--> statement-breakpoint

ALTER TABLE `caixas_diarios` DROP INDEX `caixas_diarios_dataCaixa_unique`;--> statement-breakpoint
ALTER TABLE `profissionais_servicos` DROP INDEX `profissionais_servicos_uq`;--> statement-breakpoint
ALTER TABLE `questionario_perguntas` DROP INDEX `questionario_perguntas_uq`;--> statement-breakpoint
ALTER TABLE `questionarios` DROP INDEX `questionarios_codigo_versao_uq`;--> statement-breakpoint
ALTER TABLE `servicos_insumos` DROP INDEX `servicos_insumos_uq`;--> statement-breakpoint
DROP INDEX `clientes_status_idx` ON `clientes`;--> statement-breakpoint
DROP INDEX `fotos_prontuario_cliente_idx` ON `fotos_prontuario`;--> statement-breakpoint
DROP INDEX `lembretes_status_agendado_idx` ON `lembretes`;--> statement-breakpoint
DROP INDEX `public_booking_tokens_client_expiry_idx` ON `public_booking_tokens`;--> statement-breakpoint
DROP INDEX `questionarios_servico_idx` ON `questionarios`;--> statement-breakpoint
DROP INDEX `recebimentos_liquidacao_data_idx` ON `recebimentos`;--> statement-breakpoint
DROP INDEX `recebimentos_grupo_idx` ON `recebimentos`;--> statement-breakpoint
DROP INDEX `sessoes_profissional_inicio_idx` ON `sessoes`;--> statement-breakpoint
DROP INDEX `sessoes_sala_inicio_idx` ON `sessoes`;--> statement-breakpoint
DROP INDEX `sessoes_cliente_inicio_idx` ON `sessoes`;--> statement-breakpoint

ALTER TABLE `caixas_diarios` ADD CONSTRAINT `caixas_diarios_clinica_data_uq` UNIQUE(`clinicaId`,`dataCaixa`);--> statement-breakpoint
ALTER TABLE `clinic_settings` ADD CONSTRAINT `clinic_settings_clinicaId_unique` UNIQUE(`clinicaId`);--> statement-breakpoint
ALTER TABLE `profissionais_servicos` ADD CONSTRAINT `profissionais_servicos_clinica_uq` UNIQUE(`clinicaId`,`profissionalId`,`servicoId`);--> statement-breakpoint
ALTER TABLE `questionario_perguntas` ADD CONSTRAINT `questionario_perguntas_clinica_uq` UNIQUE(`clinicaId`,`questionarioId`,`perguntaId`);--> statement-breakpoint
ALTER TABLE `questionarios` ADD CONSTRAINT `questionarios_clinica_codigo_versao_uq` UNIQUE(`clinicaId`,`codigo`,`versao`);--> statement-breakpoint
ALTER TABLE `servicos_insumos` ADD CONSTRAINT `servicos_insumos_clinica_uq` UNIQUE(`clinicaId`,`servicoId`,`insumoId`);--> statement-breakpoint
CREATE INDEX `clientes_clinica_status_idx` ON `clientes` (`clinicaId`,`status`);--> statement-breakpoint
CREATE INDEX `fotos_prontuario_clinica_cliente_idx` ON `fotos_prontuario` (`clinicaId`,`clienteId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `lembretes_clinica_status_agendado_idx` ON `lembretes` (`clinicaId`,`status`,`agendadoPara`);--> statement-breakpoint
CREATE INDEX `public_booking_tokens_clinica_cliente_expiry_idx` ON `public_booking_tokens` (`clinicaId`,`clienteId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `questionarios_clinica_servico_idx` ON `questionarios` (`clinicaId`,`servicoId`);--> statement-breakpoint
CREATE INDEX `recebimentos_clinica_liquidacao_data_idx` ON `recebimentos` (`clinicaId`,`statusLiquidacao`,`dataLiquidacao`);--> statement-breakpoint
CREATE INDEX `recebimentos_clinica_grupo_idx` ON `recebimentos` (`clinicaId`,`grupoRecebimento`);--> statement-breakpoint
CREATE INDEX `sessoes_clinica_profissional_inicio_idx` ON `sessoes` (`clinicaId`,`profissionalId`,`dataHoraInicio`);--> statement-breakpoint
CREATE INDEX `sessoes_clinica_sala_inicio_idx` ON `sessoes` (`clinicaId`,`salaId`,`dataHoraInicio`);--> statement-breakpoint
CREATE INDEX `sessoes_clinica_cliente_inicio_idx` ON `sessoes` (`clinicaId`,`clienteId`,`dataHoraInicio`);--> statement-breakpoint
CREATE INDEX `users_clinica_role_idx` ON `users` (`clinicaId`,`role`);
