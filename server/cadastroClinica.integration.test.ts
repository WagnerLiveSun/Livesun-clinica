import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { cadastroClinicaRouter, validDocument } from "./cadastroClinica";
import { getDb } from "./db";
import { centralTenants, clinicas, clinicSettings, solicitacoesClinica, solicitacoesCentral, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { deliverPendingRegistrations, deliverRegistration } from "./centralRegistrationOutbox";
import { applyCentralLink } from "./centralLink";
import { applyCentralWebhook } from "./centralWebhook";

describe("CPF/CNPJ", () => {
  it("aceita documentos de teste válidos e rejeita inválidos", () => {
    expect(validDocument("52998224725")).toBe(true);
    expect(validDocument("11222333000181")).toBe(true);
    expect(validDocument("11111111111")).toBe(false);
    expect(validDocument("52998224726")).toBe(false);
  });
});

describe.skipIf(process.env.RUN_CADASTRO_LOCAL_TESTS !== "1")("cadastro em banco descartável", () => {
  it("registra, confirma uma vez e rejeita e-mail duplicado", async () => {
    const caller = cadastroClinicaRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    const form = { nome: "Gestora Teste", email: `teste-${randomBytes(6).toString("hex")}@example.test`, telefone: "11999990000", empresa: "Clínica de Teste", cidade: "São Paulo", estado: "SP", documento: "529.982.247-25", aceite: true as const };
    const result = await caller.solicitar(form);
    expect(result.confirmacaoLocal).toHaveLength(43);
    await expect(caller.confirmar({ token: result.confirmacaoLocal })).resolves.toEqual({ success: true });
    await expect(caller.confirmar({ token: result.confirmacaoLocal })).rejects.toThrow("já utilizado");
    await expect(caller.solicitar(form)).rejects.toThrow("Já existe");
  });

  it("recusa UF inválida e nome de clínica maior que o suportado", async () => {
    const caller = cadastroClinicaRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    const form = { nome: "Gestora Teste", email: "teste@example.test", telefone: "11999990000", empresa: "Clínica Teste", cidade: "São Paulo", estado: "XX", documento: "52998224725", aceite: true as const };
    await expect(caller.solicitar(form)).rejects.toThrow("UF válida");
    await expect(caller.solicitar({ ...form, estado: "SP", empresa: "A".repeat(121) })).rejects.toThrow();
  });

  it("cria duas clínicas individuais inativas com gestor próprio e link único", async () => {
    const caller = cadastroClinicaRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    const suffix = randomBytes(6).toString("hex");
    const forms = [
      { nome: "Gestora Aurora", email: `aurora-${suffix}@example.test`, telefone: "11999990001", empresa: "Estética Aurora", cidade: "São Paulo", estado: "SP", documento: "52998224725", aceite: true as const },
      { nome: "Gestora Brisa", email: `brisa-${suffix}@example.test`, telefone: "21999990002", empresa: "Estética Aurora", cidade: "Rio de Janeiro", estado: "RJ", documento: "11222333000181", aceite: true as const },
    ];
    const completed = [];
    const db = (await getDb())!;
    for (const form of forms) {
      const request = await caller.solicitar(form);
      await expect(caller.concluir({ token: request.confirmacaoLocal, senha: "Senha segura 123" })).rejects.toThrow("não confirmado");
      await caller.confirmar({ token: request.confirmacaoLocal });
      const result = await caller.concluir({ token: request.confirmacaoLocal, senha: "Senha segura 123" });
      await expect(caller.concluir({ token: request.confirmacaoLocal, senha: "Senha segura 123" })).rejects.toThrow("já concluído");
      const registration = (await db.select().from(solicitacoesClinica).where(eq(solicitacoesClinica.email, form.email)).limit(1))[0];
      const clinic = (await db.select().from(clinicas).where(eq(clinicas.id, registration.clinicaId!)).limit(1))[0];
      const settings = (await db.select().from(clinicSettings).where(eq(clinicSettings.clinicaId, clinic.id)).limit(1))[0];
      const user = (await db.select().from(users).where(eq(users.id, registration.usuarioId!)).limit(1))[0];
      expect(result.liberado).toBe(false);
      expect(clinic).toMatchObject({ nome: form.empresa, slug: result.clinicaSlug, ativa: false });
      expect(settings).toMatchObject({ nome: form.empresa, cidade: form.cidade, estado: form.estado, emailContato: form.email });
      expect(user).toMatchObject({ clinicaId: clinic.id, email: form.email, role: "admin", ativo: false });
      expect(user.passwordHash).not.toBe("Senha segura 123");
      const outbox = (await db.select().from(solicitacoesCentral).where(eq(solicitacoesCentral.cadastroId, registration.id)).limit(1))[0];
      expect(outbox).toMatchObject({ empresaId: clinic.id, status: "PENDENTE", tentativas: 0 });
      const payload = JSON.parse(outbox.payload);
      expect(payload).toMatchObject({ empresa_id: clinic.id, email: form.email, responsavel: form.nome, cnpj_cpf: form.documento });
      expect(payload).not.toHaveProperty("senha");
      const fetcher = async () => new Response(JSON.stringify({ produto: "CLINICAS", empresa_id: clinic.id, evento_id: outbox.eventoId, solicitacao_id: clinic.id + 1000, status: "PENDENTE" }), { status: 202 });
      await expect(deliverRegistration(outbox.id, { baseUrl: "http://127.0.0.1:5001", apiToken: "token-teste", environment: "test", allowLocalHttp: true, fetcher })).resolves.toEqual({ claimed: true, received: true });
      const saved = (await db.select().from(solicitacoesCentral).where(eq(solicitacoesCentral.id, outbox.id)).limit(1))[0];
      expect(saved).toMatchObject({ status: "RECEBIDA_CENTRAL", centralSolicitacaoId: clinic.id + 1000, tentativas: 1 });
      expect((await db.select().from(users).where(eq(users.id, user.id)).limit(1))[0].ativo).toBe(false);
      await expect(deliverRegistration(outbox.id, { baseUrl: "http://127.0.0.1:5001", apiToken: "token-teste", environment: "test", allowLocalHttp: true, fetcher })).resolves.toEqual({ claimed: false });
      completed.push({ clinic, user });
    }
    expect(completed[0].clinic.id).not.toBe(completed[1].clinic.id);
    expect(completed[0].clinic.slug).not.toBe(completed[1].clinic.slug);
    expect(completed[0].user.clinicaId).not.toBe(completed[1].user.clinicaId);
  });

  it("mantém solicitação pendente em falha e reenvia o mesmo evento sem liberar acesso", async () => {
    const caller = cadastroClinicaRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    const email = `retry-${randomBytes(6).toString("hex")}@example.test`;
    const request = await caller.solicitar({ nome: "Gestora Retry", email, telefone: "11999990000", empresa: "Clínica Retry", cidade: "São Paulo", estado: "SP", documento: "52998224725", aceite: true });
    await caller.confirmar({ token: request.confirmacaoLocal });
    await caller.concluir({ token: request.confirmacaoLocal, senha: "Senha segura 123" });
    const db = (await getDb())!;
    const registration = (await db.select().from(solicitacoesClinica).where(eq(solicitacoesClinica.email, email)).limit(1))[0];
    const initial = (await db.select().from(solicitacoesCentral).where(eq(solicitacoesCentral.cadastroId, registration.id)).limit(1))[0];
    const config = { baseUrl: "http://127.0.0.1:5001", apiToken: "token-teste", environment: "test", allowLocalHttp: true };
    const fail = async () => { throw new Error("indisponível"); };
    await expect(deliverRegistration(initial.id, { ...config, fetcher: fail })).resolves.toEqual({ claimed: true, received: false });
    const failed = (await db.select().from(solicitacoesCentral).where(eq(solicitacoesCentral.id, initial.id)).limit(1))[0];
    expect(failed).toMatchObject({ status: "PENDENTE", erroCategoria: "CONEXAO", tentativas: 1, leaseId: null });
    await expect(deliverRegistration(initial.id, { ...config, fetcher: fail })).resolves.toEqual({ claimed: false });
    await db.update(solicitacoesCentral).set({ proximaTentativaEm: new Date(Date.now() - 1000) }).where(eq(solicitacoesCentral.id, initial.id));
    const succeed = async (_url: unknown, options?: RequestInit) => {
      expect(JSON.parse(String(options?.body)).evento_id).toBe(initial.eventoId);
      return new Response(JSON.stringify({ produto: "CLINICAS", empresa_id: initial.empresaId, evento_id: initial.eventoId, solicitacao_id: 777, status: "PENDENTE" }), { status: 200 });
    };
    await expect(deliverRegistration(initial.id, { ...config, fetcher: succeed as typeof fetch })).resolves.toEqual({ claimed: true, received: true });
    const saved = (await db.select().from(solicitacoesCentral).where(eq(solicitacoesCentral.id, initial.id)).limit(1))[0];
    expect(saved).toMatchObject({ eventoId: initial.eventoId, status: "RECEBIDA_CENTRAL", tentativas: 2 });
    expect((await db.select().from(users).where(eq(users.id, registration.usuarioId!)).limit(1))[0].ativo).toBe(false);
  });

  it("processa pendência em concorrência sem enviar o mesmo cadastro duas vezes", async () => {
    const caller = cadastroClinicaRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    const email = `concorrencia-${randomBytes(6).toString("hex")}@example.test`;
    const request = await caller.solicitar({ nome: "Gestora Teste", email, telefone: "11999990000", empresa: "Clínica Concorrência", cidade: "São Paulo", estado: "SP", documento: "52998224725", aceite: true });
    await caller.confirmar({ token: request.confirmacaoLocal });
    await caller.concluir({ token: request.confirmacaoLocal, senha: "Senha segura 123" });
    const db = (await getDb())!;
    const reg = (await db.select().from(solicitacoesClinica).where(eq(solicitacoesClinica.email, email)).limit(1))[0];
    const row = (await db.select().from(solicitacoesCentral).where(eq(solicitacoesCentral.cadastroId, reg.id)).limit(1))[0];
    let sends = 0;
    const fetcher = async () => { sends++; await new Promise(resolve => setTimeout(resolve, 50)); return new Response(JSON.stringify({ produto: "CLINICAS", empresa_id: row.empresaId, evento_id: row.eventoId, solicitacao_id: 999, status: "PENDENTE" }), { status: 202 }); };
    const config = { baseUrl: "http://127.0.0.1:5001", apiToken: "token-teste", environment: "test", allowLocalHttp: true, fetcher };
    const results = await Promise.all([deliverRegistration(row.id, config), deliverRegistration(row.id, config)]);
    expect(sends).toBe(1);
    expect(results.filter(result => result.claimed)).toHaveLength(1);
    expect((await db.select().from(solicitacoesCentral).where(eq(solicitacoesCentral.id, row.id)).limit(1))[0]).toMatchObject({ status: "RECEBIDA_CENTRAL", tentativas: 1 });
  });

  it("processa cadastro pendente automaticamente quando chamado pelo executor", async () => {
    const caller = cadastroClinicaRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    const email = `fila-${randomBytes(6).toString("hex")}@example.test`;
    const request = await caller.solicitar({ nome: "Gestora Fila", email, telefone: "11999990000", empresa: "Clínica Fila", cidade: "São Paulo", estado: "SP", documento: "52998224725", aceite: true });
    await caller.confirmar({ token: request.confirmacaoLocal });
    await caller.concluir({ token: request.confirmacaoLocal, senha: "Senha segura 123" });
    const db = (await getDb())!;
    const reg = (await db.select().from(solicitacoesClinica).where(eq(solicitacoesClinica.email, email)).limit(1))[0];
    const row = (await db.select().from(solicitacoesCentral).where(eq(solicitacoesCentral.cadastroId, reg.id)).limit(1))[0];
    const fetcher = async (_url: unknown, options?: RequestInit) => {
      const body = JSON.parse(String(options?.body));
      return new Response(JSON.stringify({ produto: "CLINICAS", empresa_id: body.empresa_id, evento_id: body.evento_id, solicitacao_id: 1001, status: "PENDENTE" }), { status: 202 });
    };
    const result = await deliverPendingRegistrations({ baseUrl: "http://127.0.0.1:5001", apiToken: "token-teste", environment: "test", allowLocalHttp: true, fetcher: fetcher as typeof fetch }, 50);
    expect(result.claimed).toBeGreaterThanOrEqual(1);
    expect((await db.select().from(solicitacoesCentral).where(eq(solicitacoesCentral.id, row.id)).limit(1))[0].status).toBe("RECEBIDA_CENTRAL");
  });

  it("vincula apenas clínica aprovada e reconhece reenvio idempotente", async () => {
    const caller = cadastroClinicaRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    const email = `vinculo-${randomBytes(6).toString("hex")}@example.test`;
    const request = await caller.solicitar({ nome: "Gestora Vínculo", email, telefone: "11999990000", empresa: "Clínica Vínculo", cidade: "São Paulo", estado: "SP", documento: "52998224725", aceite: true });
    await caller.confirmar({ token: request.confirmacaoLocal });
    await caller.concluir({ token: request.confirmacaoLocal, senha: "Senha segura 123" });
    const db = (await getDb())!;
    const reg = (await db.select().from(solicitacoesClinica).where(eq(solicitacoesClinica.email, email)).limit(1))[0];
    const row = (await db.select().from(solicitacoesCentral).where(eq(solicitacoesCentral.cadastroId, reg.id)).limit(1))[0];
    const generated = new Date();
    const entitlement = { cliente_id: String(reg.clinicaId! + 100000), produto: "CLINICAS", assinatura_id: reg.clinicaId! + 200000, status: "ATIVA", plano: "TESTE", acesso_produto: true, modulos: [], limites: {}, versao: 1, gerado_em: generated.toISOString(), valido_ate: new Date(generated.getTime() + 900_000).toISOString() };
    const payload = { produto: "CLINICAS", empresa_id: reg.clinicaId!, cliente_id: reg.clinicaId! + 100000, assinatura_id: entitlement.assinatura_id, solicitacao_id: reg.clinicaId! + 300000, evento_id: row.eventoId, status: "VINCULO_PENDENTE", cnpj_cpf: "52998224725", entitlements: entitlement };
    expect(await applyCentralLink({ ...payload, cnpj_cpf: "11222333000181" })).toEqual({ status: 409 });
    expect((await db.select().from(users).where(eq(users.id, reg.usuarioId!)).limit(1))[0].ativo).toBe(false);
    expect(await applyCentralLink(payload)).toMatchObject({ status: 200, resultado: "vinculado" });
    expect(await applyCentralLink(payload)).toMatchObject({ status: 200, resultado: "duplicado" });
    expect((await db.select().from(users).where(eq(users.id, reg.usuarioId!)).limit(1))[0].ativo).toBe(true);
    expect((await db.select().from(clinicas).where(eq(clinicas.id, reg.clinicaId!)).limit(1))[0].ativa).toBe(true);
    expect((await db.select().from(centralTenants).where(eq(centralTenants.empresaId, reg.clinicaId!)).limit(1))[0]).toMatchObject({ centralClienteId: payload.cliente_id, assinaturaId: entitlement.assinatura_id, versao: 1 });
    const suspended = { ...entitlement, status: "SUSPENSA", acesso_produto: false, versao: 2 };
    const event = { evento: "ASSINATURA_SUSPENSA", evento_id: `evt_${randomBytes(12).toString("hex")}`, produto: "CLINICAS", cliente_id: entitlement.cliente_id, assinatura_id: entitlement.assinatura_id, versao: 2, status_novo: "SUSPENSA", entitlements: suspended };
    expect(await applyCentralWebhook(event, "ASSINATURA_SUSPENSA")).toEqual({ status: 200, resultado: "aplicado" });
    expect(await applyCentralWebhook(event, "ASSINATURA_SUSPENSA")).toEqual({ status: 200, resultado: "duplicado" });
    const older = { ...event, evento_id: `evt_${randomBytes(12).toString("hex")}`, versao: 1, status_novo: "ATIVA", entitlements: entitlement };
    expect(await applyCentralWebhook(older, "ASSINATURA_SUSPENSA")).toEqual({ status: 200, resultado: "obsoleto" });
    const current = (await db.select().from(centralTenants).where(eq(centralTenants.empresaId, reg.clinicaId!)).limit(1))[0];
    expect(current.versao).toBe(2);
    expect(JSON.parse(current.payload).acesso_produto).toBe(false);
  });
});