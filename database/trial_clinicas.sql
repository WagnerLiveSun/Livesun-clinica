-- Aplicar somente após backup e homologação; antes de publicar o servidor e o receptor.
CREATE TABLE clinicas_trial (
  clinica_id int NOT NULL PRIMARY KEY,
  usuario_id int NOT NULL UNIQUE,
  iniciado_em datetime NULL DEFAULT NULL
) ENGINE=InnoDB;