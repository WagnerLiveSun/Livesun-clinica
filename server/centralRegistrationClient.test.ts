import { describe, expect, it, vi } from "vitest";
import { centralOrigin, centralRegistrationEvent, sendCentralRegistration } from "./centralRegistrationClient";

const payload = { evento_id: centralRegistrationEvent(12), empresa_id: 12, razao_social: "Estética Exemplo", nome_fantasia: "Estética Exemplo", cnpj_cpf: "52998224725", email: "gestora@example.test", telefone: "11999990000", responsavel: "Gestora Exemplo" };
const input = { baseUrl: "https://central.example", apiToken: "token-de-teste", environment: "production", allowLocalHttp: false, payload };
const acknowledgement = { produto: "CLINICAS", solicitacao_id: 23, empresa_id: 12, evento_id: payload.evento_id, status: "PENDENTE" };

describe("envio de solicitação ao Central", () => {
  it("gera evento estável e envia somente os dados do contrato existente", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(acknowledgement), { status: 202 }));
    expect(await sendCentralRegistration({ ...input, fetcher })).toEqual({ received: true, centralRequestId: 23, status: "PENDENTE" });
    expect(centralRegistrationEvent(12)).toBe(payload.evento_id);
    expect(centralRegistrationEvent(13)).not.toBe(payload.evento_id);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://central.example/api/v1/cadastros");
    expect(options?.redirect).toBe("error");
    expect(JSON.parse(String(options?.body))).toEqual(payload);
    expect(JSON.parse(String(options?.body))).not.toHaveProperty("senha");
  });
  it("aceita reconhecimento idempotente mas não presume liberação", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ...acknowledgement, status: "VINCULADA" }), { status: 200 }));
    expect(await sendCentralRegistration({ ...input, fetcher })).toEqual({ received: true, centralRequestId: 23, status: "VINCULADA" });
  });
  it("recusa resposta de outro produto, clínica ou evento", async () => {
    for (const invalid of [{ ...acknowledgement, produto: "PROPOSTAS" }, { ...acknowledgement, empresa_id: 13 }, { ...acknowledgement, evento_id: centralRegistrationEvent(13) }]) {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(invalid), { status: 200 }));
      expect(await sendCentralRegistration({ ...input, fetcher })).toEqual({ received: false, reason: "RESPOSTA_INVALIDA" });
    }
  });
  it("rejeita HTTP externo, credenciais na URL e dados extras antes da rede", async () => {
    const fetcher = vi.fn<typeof fetch>();
    for (const baseUrl of ["http://central.example", "https://user:pass@central.example", "https://central.example/api", "https://central.example/?x=1"]) {
      expect((await sendCentralRegistration({ ...input, baseUrl, fetcher })).received).toBe(false);
    }
    expect((await sendCentralRegistration({ ...input, payload: { ...payload, senha: "nao-enviar" } as any, fetcher })).received).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("permite HTTP loopback apenas com opt-in fora de produção", () => {
    expect(centralOrigin("http://127.0.0.1:5001", { environment: "development", allowLocalHttp: true })).toBe("http://127.0.0.1:5001");
    expect(() => centralOrigin("http://127.0.0.1:5001", { environment: "production", allowLocalHttp: true })).toThrow();
  });
  it("trata falhas HTTP e conexão sem expor segredo", async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(new Response("erro", { status: 503 }));
    expect(await sendCentralRegistration({ ...input, fetcher: http })).toEqual({ received: false, reason: "HTTP" });
    const network = vi.fn<typeof fetch>().mockRejectedValue(new Error("token-de-teste"));
    expect(await sendCentralRegistration({ ...input, fetcher: network })).toEqual({ received: false, reason: "CONEXAO" });
  });
  it("recusa resposta acima do limite", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("x".repeat(8193), { status: 200 }));
    expect(await sendCentralRegistration({ ...input, fetcher })).toEqual({ received: false, reason: "RESPOSTA_INVALIDA" });
  });
  it("interrompe a tentativa no tempo limite sem incluir detalhes sensíveis", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new Error("interrompido")), { once: true });
    }));
    expect(await sendCentralRegistration({ ...input, fetcher, timeoutMs: 10 })).toEqual({ received: false, reason: "TIMEOUT" });
  });
});