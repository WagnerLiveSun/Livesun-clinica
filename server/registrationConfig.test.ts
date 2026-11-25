import { describe, expect, it } from "vitest";
import { registrationConfig } from "./registrationConfig";

describe("configuração de cadastro", () => {
  const valid = { NODE_ENV: "production", CENTRAL_ENABLED: "true", CENTRAL_API_TOKEN: "token-teste", CENTRAL_WEBHOOK_SECRET: "s".repeat(40), BREVO_API_KEY: "chave-teste", BREVO_FROM_EMAIL: "contato@example.com", PUBLIC_BASE_URL: "https://clinicas.example", CENTRAL_BASE_URL: "https://central.example" };
  it("aceita configuração válida e o remetente alternativo do Propostas", () => {
    expect(registrationConfig(valid).problems).toEqual([]);
    expect(registrationConfig({ ...valid, BREVO_FROM_EMAIL: undefined, BREVO_SENDER_EMAIL: "contato@example.com" }).problems).toEqual([]);
    expect(registrationConfig({ ...valid, BREVO_FROM_EMAIL: " ", BREVO_SENDER_EMAIL: "contato@example.com" }).problems).toEqual([]);
  });
  it("identifica variáveis faltantes sem retornar segredos", () => {
    const result = registrationConfig({ ...valid, CENTRAL_WEBHOOK_SECRET: "curto", BREVO_API_KEY: "", PUBLIC_BASE_URL: "http://example.com" });
    expect(result.problems).toEqual(["CENTRAL_WEBHOOK_SECRET", "BREVO_API_KEY", "PUBLIC_BASE_URL"]);
    expect(JSON.stringify(result)).not.toContain("token-teste");
    expect(JSON.stringify(result)).not.toContain("curto");
  });
});