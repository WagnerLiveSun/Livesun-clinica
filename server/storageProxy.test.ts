import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ read: vi.fn(), authenticate: vi.fn() }));
vi.mock("./storage", () => ({ storageRead: mocks.read }));
vi.mock("./localAuth", () => ({ authenticateLocalRequest: mocks.authenticate }));
import { registerStorageProxy } from "./_core/storageProxy";

describe("proxy de arquivos", () => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => { await close?.(); close = undefined; vi.clearAllMocks(); });

  async function start() {
    const app = express();
    registerStorageProxy(app);
    const server = await new Promise<import("http").Server>(resolve => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    close = () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Endereço indisponível");
    return `http://127.0.0.1:${address.port}`;
  }

  it("nega caminhos que não possuem política de acesso", async () => {
    const base = await start();
    const response = await fetch(`${base}/storage/clinica/1/financeiro/comprovante.pdf`);
    expect(response.status).toBe(404);
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("exige autenticação antes de abrir foto de prontuário", async () => {
    mocks.authenticate.mockResolvedValue(null);
    const base = await start();
    const response = await fetch(`${base}/storage/clinica/1/prontuarios/2/12345678-abcd_01234567.jpg`);
    expect(response.status).toBe(401);
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("permite carregar o logotipo público da clínica", async () => {
    mocks.read.mockResolvedValue(Buffer.from("imagem-teste"));
    const base = await start();
    const response = await fetch(`${base}/storage/clinica/1/clinic-assets/logo_1234abcd.png`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
    expect(mocks.read).toHaveBeenCalledOnce();
  });
});