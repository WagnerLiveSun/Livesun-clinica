import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("./cadastroClinica", () => ({ cadastroClinicaRouter: { createCaller: () => ({ solicitar: invoke, reenviar: invoke, confirmar: invoke, concluir: invoke }) } }));
import { registerPublicRegistrationRoute } from "./publicRegistrationRoute";

describe("API pública da landing institucional", () => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => { await close?.(); close = undefined; invoke.mockReset(); });
  async function start() {
    const app = express(); registerPublicRegistrationRoute(app);
    const server = await new Promise<import("http").Server>(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    close = () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    const address = server.address(); if (!address || typeof address === "string") throw Error("servidor indisponível");
    return `http://127.0.0.1:${address.port}`;
  }
  it("permite somente a origem institucional e operações específicas", async () => {
    const base = await start();
    const path = "/api/public/cadastro-clinica/solicitar";
    const preflight = await fetch(base + path, { method: "OPTIONS", headers: { Origin: "https://livesun.com.br", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("https://livesun.com.br");
    expect(preflight.headers.get("access-control-allow-credentials")).toBeNull();
    expect((await fetch(base + path, { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: "{}" })).status).toBe(403);
    expect((await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status).toBe(403);
    expect((await fetch(base + path, { method: "POST", headers: { Origin: "https://livesun.com.br", "Content-Type": "text/plain" }, body: "{}" })).status).toBe(415);
    expect((await fetch(base + path, { method: "POST", headers: { Origin: "https://livesun.com.br", "Content-Type": "application/json" }, body: "{" })).status).toBe(400);
    expect((await fetch(base + "/api/public/cadastro-clinica/outro", { method: "POST", headers: { Origin: "https://livesun.com.br" } })).status).toBe(404);
    expect(invoke).not.toHaveBeenCalled();
  });
  it("não devolve tokens de homologação nem segredos em erros", async () => {
    const base = await start();
    invoke.mockResolvedValueOnce({ success: true, confirmacaoLocal: "token-secreto" }).mockRejectedValueOnce(new Error("segredo-interno"));
    const options = { method: "POST", headers: { Origin: "https://livesun.com.br", "Content-Type": "application/json" }, body: JSON.stringify({ token: "x".repeat(43) }) };
    const ok = await fetch(base + "/api/public/cadastro-clinica/solicitar", options);
    expect(await ok.json()).toEqual({ success: true });
    expect(invoke).toHaveBeenCalledWith({ token: "x".repeat(43) });
    const failure = await fetch(base + "/api/public/cadastro-clinica/concluir", options);
    expect(failure.status).toBe(503);
    expect(await failure.text()).not.toContain("segredo-interno");
  });
  it("registra apenas categoria segura quando há falha de configuração", async () => {
    const base = await start();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      invoke.mockRejectedValueOnce(new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "segredo-nao-exibir" }));
      const response = await fetch(base + "/api/public/cadastro-clinica/solicitar", { method: "POST", headers: { Origin: "https://livesun.com.br", "Content-Type": "application/json" }, body: "{}" });
      expect(response.status).toBe(503);
      expect(log).toHaveBeenCalledWith("[Cadastro público] solicitar: configuracao_indisponivel.");
      expect(JSON.stringify(log.mock.calls)).not.toContain("segredo-nao-exibir");
    } finally { log.mockRestore(); }
  });
});