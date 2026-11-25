import { describe, expect, it, vi } from "vitest";
import { sendRegistrationEmail } from "./registrationEmail";

describe("confirmação de cadastro por e-mail", () => {
  it("envia link de confirmação pela origem configurada, sem expor HTML", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 201 }));
    await sendRegistrationEmail({ email: "gestora@example.test", name: "Gestora <A>", token: "x".repeat(43), baseUrl: "https://clinicas.example", apiKey: "teste", fromEmail: "cadastro@example.test", environment: "production", allowLocalHttp: false, fetcher });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    const body = JSON.parse(String(options?.body));
    expect(body.htmlContent).toContain("https://livesun.com.br/lp/clinicas?confirmar=");
    expect(body.htmlContent).toContain("Gestora &lt;A&gt;");
    expect(body.htmlContent).not.toContain("Gestora <A>");
  });
  it("não envia quando a origem ou o remetente são inválidos", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(sendRegistrationEmail({ email: "gestora@example.test", name: "Gestora", token: "x".repeat(43), baseUrl: "http://externo.example", apiKey: "teste", fromEmail: "cadastro@example.test", environment: "production", allowLocalHttp: false, fetcher })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});