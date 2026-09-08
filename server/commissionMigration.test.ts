import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("migração da regra de comissão", () => {
  it("cria comissaoAtiva antes de copiar a disponibilidade anterior", async () => {
    const migration = await readFile(resolve(process.cwd(), "drizzle/0009_noisy_marvel_boy.sql"), "utf8");
    const addColumn = "ALTER TABLE `profissionais_servicos` ADD `comissaoAtiva` boolean DEFAULT true NOT NULL;";
    const preserveCurrentStatus = "UPDATE `profissionais_servicos` SET `comissaoAtiva` = `ativo`;";
    expect(migration).toContain(addColumn);
    expect(migration).toContain(preserveCurrentStatus);
    expect(migration.indexOf(addColumn)).toBeLessThan(migration.indexOf(preserveCurrentStatus));
  });
});
