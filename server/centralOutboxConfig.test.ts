import { describe, expect, it } from "vitest";
import { shouldDispatchCentralOutbox } from "./centralOutboxConfig";

describe("configuração do processador de cadastro", () => {
  it("mantém o comportamento existente por padrão", () => {
    expect(shouldDispatchCentralOutbox({ CENTRAL_ENABLED: "true" })).toBe(true);
    expect(shouldDispatchCentralOutbox({ CENTRAL_ENABLED: "false" })).toBe(false);
  });
  it("delega a fila sem desligar o restante da integração", () => {
    const env = { CENTRAL_ENABLED: "true", CENTRAL_OUTBOX_WORKER: "external" };
    expect(shouldDispatchCentralOutbox(env)).toBe(false);
    expect(env.CENTRAL_ENABLED).toBe("true");
    expect(shouldDispatchCentralOutbox({ CENTRAL_ENABLED: "true", CENTRAL_OUTBOX_WORKER: "internal" })).toBe(true);
  });
});