import { MySqlDialect } from "drizzle-orm/mysql-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), clinicBrevoConfig: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./brevoConfig", () => ({ clinicBrevoConfig: mocks.clinicBrevoConfig, environmentBrevoConfig: vi.fn() }));
import { dispatchDueReminderEmails } from "./reminders";

function makeDb(results: unknown[][]) {
  const dialect = new MySqlDialect();
  const conditions: Array<{ sql: string; params: unknown[] }> = [];
  const update = vi.fn(() => ({ set: () => ({ where: async (condition: unknown) => {
    conditions.push(dialect.sqlToQuery(condition as any));
    return [{ affectedRows: 1 }];
  } }) }));
  return { conditions, update, select: () => ({ from: () => ({ where: (condition: unknown) => {
    conditions.push(dialect.sqlToQuery(condition as any));
    const rows = results.shift() ?? [];
    return { limit: async () => rows, orderBy: () => ({ limit: async () => rows }) };
  } }) }) };
}

describe("envio de lembretes entre clínicas", () => {
  beforeEach(() => vi.clearAllMocks());
  it("não envia quando a sessão pertence a outra clínica", async () => {
    const db = makeDb([[{ id: 4, clinicaId: 7, sessaoId: 91, canal: "EMAIL", destinatario: "CLIENTE" }], []]);
    mocks.getDb.mockResolvedValue(db);
    const send = vi.spyOn(globalThis, "fetch");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await dispatchDueReminderEmails()).toEqual({ processed: 1, sent: 0, failed: 1, skipped: 0 });
      expect(db.conditions[2].params).toEqual(expect.arrayContaining([91, 7]));
      expect(mocks.clinicBrevoConfig).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    } finally { send.mockRestore(); log.mockRestore(); }
  });
  it("não envia quando o destinatário não pertence à clínica do lembrete", async () => {
    const db = makeDb([[{ id: 4, clinicaId: 7, sessaoId: 91, canal: "EMAIL", destinatario: "CLIENTE" }], [{ id: 91, clienteId: 200 }], []]);
    mocks.getDb.mockResolvedValue(db);
    mocks.clinicBrevoConfig.mockResolvedValue({ apiKey: "test", fromEmail: "teste@example.com", smsSender: "", whatsappSender: "", whatsappTemplateId: "", emailAtivo: true, smsAtivo: false, whatsappAtivo: false });
    const send = vi.spyOn(globalThis, "fetch");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await dispatchDueReminderEmails()).toEqual({ processed: 1, sent: 0, failed: 1, skipped: 0 });
      expect(db.conditions[3].params).toEqual(expect.arrayContaining([200, 7]));
      expect(send).not.toHaveBeenCalled();
    } finally { send.mockRestore(); log.mockRestore(); }
  });
  it("não envia lembretes internos por e-mail", async () => {
    const db = makeDb([[{ id: 4, clinicaId: 7, sessaoId: 91, canal: "INTERNO", destinatario: "PROFISSIONAL" }]]);
    mocks.getDb.mockResolvedValue(db);
    expect(await dispatchDueReminderEmails()).toEqual({ processed: 1, sent: 0, failed: 0, skipped: 1 });
    expect(db.update).not.toHaveBeenCalled();
    expect(mocks.clinicBrevoConfig).not.toHaveBeenCalled();
  });
});