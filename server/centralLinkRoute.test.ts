import express from "express";
import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

const { apply } = vi.hoisted(() => ({ apply: vi.fn() }));
vi.mock("./centralLink", () => ({ applyCentralLink: apply }));
vi.mock("./centralWebhook", () => ({ applyCentralWebhook: vi.fn() }));
import { registerCentralLinkRoute } from "./centralLinkRoute";

describe("receptor do vínculo Central", () => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => { await close?.(); close = undefined; vi.clearAllMocks(); });
  async function start(enabled = true) {
    const app = express();
    registerCentralLinkRoute(app, "s".repeat(40), enabled);
    const server = await new Promise<import("http").Server>(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    close = () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Servidor indisponível");
    return `http://127.0.0.1:${address.port}/central/cadastros/vincular`;
  }
  function headers(raw: string, timestamp = String(Math.floor(Date.now() / 1000))) {
    return { "content-type": "application/json", "X-LiveSun-Event": "CADASTRO_HABILITADO", "X-LiveSun-Timestamp": timestamp, "X-LiveSun-Signature": `sha256=${createHmac("sha256", "s".repeat(40)).update(`${timestamp}.${raw}`).digest("hex")}` };
  }
  it("valida HMAC dos bytes originais antes de processar", async () => {
    const url = await start();
    const raw = '{"produto":"CLINICAS"}';
    const response = await fetch(url, { method: "POST", headers: { ...headers(raw), "X-LiveSun-Signature": `sha256=${"0".repeat(64)}` }, body: raw });
    expect(response.status).toBe(401);
    expect(apply).not.toHaveBeenCalled();
  });
  it("rejeita mensagens expiradas e receptor desativado", async () => {
    const url = await start();
    const raw = '{}';
    const response = await fetch(url, { method: "POST", headers: headers(raw, String(Math.floor(Date.now() / 1000) - 301)), body: raw });
    expect(response.status).toBe(401);
    await close?.(); close = undefined;
    const disabled = await start(false);
    expect((await fetch(disabled, { method: "POST", headers: headers(raw), body: raw })).status).toBe(503);
    expect(apply).not.toHaveBeenCalled();
  });
  it("responde com o contrato de confirmação após persistência", async () => {
    apply.mockResolvedValue({ status: 200, evento_id: "cad_" + "a".repeat(32), empresa_id: 7, cliente_id: 12, resultado: "vinculado" });
    const url = await start();
    const raw = '{"produto":"CLINICAS"}';
    const response = await fetch(url, { method: "POST", headers: headers(raw), body: raw });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ evento_id: "cad_" + "a".repeat(32), empresa_id: 7, cliente_id: 12, status: "VINCULADA" });
    expect(apply).toHaveBeenCalledWith({ produto: "CLINICAS" });
  });
});