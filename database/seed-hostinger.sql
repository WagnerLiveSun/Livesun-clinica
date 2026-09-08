-- SEED HOSTINGER (u951548013_clinica) - idempotente, pode rodar mais de uma vez
-- SunSet â€” setup inicial idempotente (versÃ£o portÃ¡til)
-- Cria o usuÃ¡rio master (consultor), a clÃ­nica provisÃ³ria e o administrador,
-- preservando tudo o que jÃ¡ existir. Pode ser executado mais de uma vez.
USE `u951548013_clinica`;

-- 1) ClÃ­nica provisÃ³ria (somente se nÃ£o houver nenhuma clÃ­nica)
INSERT INTO `clinicas` (`id`, `nome`, `slug`, `ativa`, `createdAt`, `updatedAt`)
SELECT 1, 'ClÃ­nica Exemplo', 'clinica-principal', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `clinicas`);

-- 2) UsuÃ¡rio master â€” acesso global para consultores
--    Login: master@livesun.com.br  |  Senha: Master@2024SunSet
INSERT INTO `users` (`clinicaId`, `openId`, `name`, `email`, `loginMethod`, `passwordHash`, `passwordUpdatedAt`, `role`, `ativo`, `lastSignedIn`)
SELECT 0, 'local:seed-master-sunset', 'Consultor Master SunSet', 'master@livesun.com.br', 'local',
       '$2b$12$jnb0.aj7Gs0H8CpjtS14e.RtLniKyZvRtAnyLnySZzgENIhyfKRvO', NOW(), 'master', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `role` = 'master');

-- 3) ConfiguraÃ§Ãµes bÃ¡sicas da primeira clÃ­nica (somente se faltarem)
INSERT INTO `clinic_settings` (`clinicaId`, `nome`, `slogan`, `corPrimaria`, `corSecundaria`, `logoUrl`, `createdAt`, `updatedAt`)
SELECT c.`id`, c.`nome`, 'Seu cuidado, seu momento', '#C8627A', '#8F3B50', '/assets/logo-sunset.svg', NOW(), NOW()
FROM `clinicas` c
WHERE c.`id` = (SELECT MIN(`id`) FROM `clinicas`)
  AND NOT EXISTS (SELECT 1 FROM `clinic_settings` s WHERE s.`clinicaId` = c.`id`);

-- 4) Administrador temporÃ¡rio da primeira clÃ­nica (nÃ£o sobrescreve gestor existente)
--    Login: admin@clinica-exemplo.com  |  Senha temporÃ¡ria: Admin123456
INSERT INTO `users` (`clinicaId`, `openId`, `name`, `email`, `loginMethod`, `passwordHash`, `passwordUpdatedAt`, `role`, `ativo`, `lastSignedIn`)
SELECT (SELECT MIN(`id`) FROM `clinicas`), 'local:seed-admin-sunset', 'Administrador', 'admin@clinica-exemplo.com', 'local',
       '$2b$12$a7V1.ucCTLg9CbxApwjmEeidHjzsMFNwaR2TDmQdebHc0w5AHJoA.', NOW(), 'admin', true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `role` = 'admin'
    AND `clinicaId` = (SELECT MIN(`id`) FROM `clinicas`)
);

