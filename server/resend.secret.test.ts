import { describe, expect, it } from "vitest";

describe("configuração de e-mail Brevo", () => {
  it("valida a presença e o formato dos dados de configuração", () => {
    expect(process.env.BREVO_API_KEY).toMatch(/\S{10,}/);
    expect(process.env.BREVO_FROM_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  const runLiveValidation = process.env.BREVO_VALIDATE_LIVE === "1";
  (runLiveValidation ? it : it.skip)("valida a conta Brevo em uma verificação remota opcional", async () => {
    const response = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": process.env.BREVO_API_KEY ?? "" },
    });
    expect(response.ok).toBe(true);
  }, 20_000);
});
