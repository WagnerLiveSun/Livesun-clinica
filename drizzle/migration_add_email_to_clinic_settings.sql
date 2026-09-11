-- Adicionar campo email à tabela clinic_settings
ALTER TABLE `clinic_settings` ADD COLUMN `email` VARCHAR(320) AFTER `whatsapp`;