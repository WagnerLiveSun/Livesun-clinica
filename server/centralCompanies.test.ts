import express from "express";
import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb }));
import { registerCentralCompanies } from "./centralCompanies";
import { clinicas, clinicSettings, users, centralTenants, solicitacoesClinica } from "../drizzle/schema";

describe("consulta de clínicas existentes", () => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => { await close?.(); close = undefined; vi.clearAllMocks(); });
  async function start(enabled = true) {
    const app = express(); registerCentralCompanies(app, "s".repeat(40), enabled);
    const server = await new Promise<import("http").Server>(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    close = () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    const address = server.address(); if (!address || typeof address === "string") throw Error("servidor");
    return `http://127.0.0.1:${address.port}`;
  }
  function headers(path: string) {
    const stamp = String(Math.floor(Date.now() / 1000));
    return { "X-LiveSun-Timestamp": stamp, "X-LiveSun-Signature": `sha256=${createHmac("sha256", "s".repeat(40)).update(`${stamp}.${path}`).digest("hex")}` };
  }
  it("rejeita acesso sem assinatura e assinatura de outra consulta", async () => {
    const base = await start();
    expect((await fetch(base + "/central/empresas?apos=0")).status).toBe(401);
    expect((await fetch(base + "/central/empresas?apos=1", { headers: headers("/central/empresas?apos=0") })).status).toBe(401);
    expect(getDb).not.toHaveBeenCalled();
  });
  it("valida cursor e falha fechada sem banco", async () => {
    const base = await start();
    expect((await fetch(base + "/central/empresas?apos=x", { headers: headers("/central/empresas?apos=x") })).status).toBe(422);
    getDb.mockResolvedValue(null);
    expect((await fetch(base + "/central/empresas?apos=0", { headers: headers("/central/empresas?apos=0") })).status).toBe(503);
  });
  it("entrega dados de clínica existente apenas para requisição assinada", async () => {
    const base = await start();
    const rows = new Map<unknown, unknown[]>([
      [clinicas, [{ id: 7, nome: "Clínica Teste", ativa: true }]],
      [clinicSettings, [{ cnpj: "529.982.247-25", emailContato: "clinica@example.com", razaoSocial: "Clínica Teste", telefone: "11999999999" }]],
      [users, [{ name: "Gestora", email: "gestora@example.com", ativo: true }]],
      [centralTenants, []], [solicitacoesClinica, []],
    ]);
    getDb.mockResolvedValue({ select: () => ({ from: (table: unknown) => ({ where: () => ({ limit: async () => rows.get(table), orderBy: () => ({ limit: async () => rows.get(table) }) }) }) }) });
    const path = "/central/empresas/7";
    const response = await fetch(base + path, { headers: headers(path) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.empresa).toMatchObject({ ativo: true, cadastro_novo: false, gestor_ativo: true, cliente_id: null, dados: { empresa_id: 7, cnpj_cpf: "52998224725" } });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});