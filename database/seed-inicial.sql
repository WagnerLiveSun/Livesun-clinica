-- SunSet — setup inicial idempotente (versão portátil)
-- Cria o usuário master (consultor), a clínica provisória e o administrador,
-- preservando tudo o que já existir. Pode ser executado mais de uma vez.
USE `sunset`;

-- 1) Clínica provisória (somente se não houver nenhuma clínica)
INSERT INTO `clinicas` (`id`, `nome`, `slug`, `ativa`, `createdAt`, `updatedAt`)
SELECT 1, 'Clínica Exemplo', 'clinica-principal', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `clinicas`);

-- 2) Usuário master — acesso global para consultores
--    Login: master@livesun.com.br  |  Senha: Master@2024SunSet
INSERT INTO `users` (`clinicaId`, `openId`, `name`, `email`, `loginMethod`, `passwordHash`, `passwordUpdatedAt`, `role`, `ativo`, `lastSignedIn`)
SELECT 0, 'local:seed-master-sunset', 'Consultor Master SunSet', 'master@livesun.com.br', 'local',
       '$2b$12$jnb0.aj7Gs0H8CpjtS14e.RtLniKyZvRtAnyLnySZzgENIhyfKRvO', NOW(), 'master', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `role` = 'master');

-- 3) Configurações básicas da primeira clínica (somente se faltarem)
INSERT INTO `clinic_settings` (`clinicaId`, `nome`, `slogan`, `corPrimaria`, `corSecundaria`, `logoUrl`, `createdAt`, `updatedAt`)
SELECT c.`id`, c.`nome`, 'Seu cuidado, seu momento', '#C8627A', '#8F3B50', '/assets/logo-sunset.svg', NOW(), NOW()
FROM `clinicas` c
WHERE c.`id` = (SELECT MIN(`id`) FROM `clinicas`)
  AND NOT EXISTS (SELECT 1 FROM `clinic_settings` s WHERE s.`clinicaId` = c.`id`);

-- 4) Administrador temporário da primeira clínica (não sobrescreve gestor existente)
--    Login: admin@clinica-exemplo.com  |  Senha temporária: Admin123456
INSERT INTO `users` (`clinicaId`, `openId`, `name`, `email`, `loginMethod`, `passwordHash`, `passwordUpdatedAt`, `role`, `ativo`, `lastSignedIn`)
SELECT (SELECT MIN(`id`) FROM `clinicas`), 'local:seed-admin-sunset', 'Administrador', 'admin@clinica-exemplo.com', 'local',
       '$2b$12$a7V1.ucCTLg9CbxApwjmEeidHjzsMFNwaR2TDmQdebHc0w5AHJoA.', NOW(), 'admin', true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `role` = 'admin'
    AND `clinicaId` = (SELECT MIN(`id`) FROM `clinicas`)
);
