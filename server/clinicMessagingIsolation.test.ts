import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb }));
import { clinicBrevoConfig } from "./brevoConfig";
import { sendBrevoReminder } from "./reminders";

describe("comunicação por clínica", () => {
  beforeEach(() => vi.clearAllMocks());
  it("não usa configurações globais quando a clínica não tem configuração", async () => {
    const dialect = new MySqlDialect();
    const conditions: Array<{ params: unknown[] }> = [];
    getDb.mockResolvedValue({ select: () => ({ from: () => ({ where: (condition: unknown) => {
      conditions.push(dialect.sqlToQuery(condition as any));
      return { limit: async () => [] };
    } }) }) });
    const config = await clinicBrevoConfig(7);
    expect(conditions[0].params).toContain(7);
    expect(config).toMatchObject({ apiKey: "", fromEmail: "", emailAtivo: false, whatsappAtivo: false, smsAtivo: false });
  });
  it("não envia quando o canal da clínica está desligado", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    try {
      await expect(sendBrevoReminder({ email: "teste@example.com" }, "teste", { apiKey: "segredo", fromEmail: "envio@example.com", smsSender: "", whatsappSender: "", whatsappTemplateId: "", emailAtivo: false, whatsappAtivo: false, smsAtivo: false })).rejects.toThrow("E-mail não está ativo");
      expect(fetchMock).not.toHaveBeenCalled();
    } finally { fetchMock.mockRestore(); }
  });
  it("não mistura remetente global com configuração incompleta da clínica", async () => {
    getDb.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ brevoApiKeyEncrypted: null, brevoFromEmail: null, brevoFromName: "Clínica A", brevoReplyTo: null, brevoSmsSender: null, brevoWhatsappSender: null, brevoWhatsappTemplateId: null, emailAtivo: true, smsAtivo: false, whatsappAtivo: false }] }) }) }) });
    expect(await clinicBrevoConfig(7)).toMatchObject({ apiKey: "", fromEmail: "", fromName: "Clínica A" });
  });
});