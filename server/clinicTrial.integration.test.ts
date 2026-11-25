import { afterAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { clinicasTrial, centralTenants } from "../drizzle/schema";
import { getDb } from "./db";
import { startClinicTrial, trialAccess } from "./clinicTrial";
import { clinicCommercialAccess } from "./centralAccess";
import { appRouter } from "./routers";
import { clinicas, users } from "../drizzle/schema";
import bcrypt from "bcryptjs";

const enabled = process.env.RUN_TRIAL_LOCAL_TESTS === "1";
const expected = "mysql://root:LocalOnly-Test-33918@127.0.0.1:33918/clinicas_php_homologacao_20261125";
const id = 1700000000 + Math.floor(Math.random() * 10000000);
const userId = id + 10000000;

describe.skipIf(!enabled)("trial no MariaDB descartável", () => {
  afterAll(async () => {
    if (process.env.DATABASE_URL !== expected) return;
    const db = (await getDb())!;
    await db.delete(centralTenants).where(eq(centralTenants.empresaId, id));
    await db.delete(clinicasTrial).where(eq(clinicasTrial.clinicaId, id));
  });
  it("começa apenas para o gestor, é atômico, expira e não é renovado", async () => {
    if (process.env.DATABASE_URL !== expected) throw new Error("Banco de teste inválido");
    const db = (await getDb())!;
    await db.insert(clinicasTrial).values({ clinicaId: id, usuarioId: userId });
    expect(await trialAccess(id)).toBe(false);
    await startClinicTrial(id, userId + 1);
    expect(await trialAccess(id)).toBe(false);
    await Promise.all(Array.from({ length: 4 }, () => startClinicTrial(id, userId)));
    expect(await trialAccess(id)).toBe(true);
    const first = (await db.select().from(clinicasTrial).where(eq(clinicasTrial.clinicaId, id)))[0].iniciadoEm;
    await startClinicTrial(id, userId);
    expect((await db.select().from(clinicasTrial).where(eq(clinicasTrial.clinicaId, id)))[0].iniciadoEm).toEqual(first);
    await db.update(clinicasTrial).set({ iniciadoEm: sql`DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)` }).where(eq(clinicasTrial.clinicaId, id));
    expect(await trialAccess(id)).toBe(false);
    await startClinicTrial(id, userId);
    expect(await trialAccess(id)).toBe(false);
    await db.update(clinicasTrial).set({ iniciadoEm: sql`DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY)` }).where(eq(clinicasTrial.clinicaId, id));
    process.env.CENTRAL_ENABLED = "true";
    expect(await clinicCommercialAccess(id)).toBe(true);
    const future = new Date(Date.now() + 600000);
    await db.insert(centralTenants).values({ empresaId: id, centralClienteId: id, assinaturaId: id, versao: 1, validoAte: future, payload: JSON.stringify({ cliente_id: String(id), produto: "CLINICAS", assinatura_id: id, status: "SUSPENSA", plano: "TESTE", acesso_produto: false, modulos: [], limites: {}, versao: 1, gerado_em: new Date().toISOString(), valido_ate: future.toISOString() }) });
    expect(await clinicCommercialAccess(id)).toBe(false);
    delete process.env.CENTRAL_ENABLED;
  });
  it("login com senha incorreta não inicia trial e login válido inicia uma única vez", async () => {
    if (process.env.DATABASE_URL !== expected) throw new Error("Banco de teste inválido");
    const db = (await getDb())!;
    const email = `trial-${id}@example.test`;
    await db.delete(centralTenants).where(eq(centralTenants.empresaId, id));
    await db.insert(clinicas).values({ id, nome: "Clínica de teste", slug: `trial-${id}`, ativa: true });
    await db.insert(users).values({ id: userId, clinicaId: id, openId: `trial-${id}`, name: "Teste", email, role: "admin", ativo: true, passwordHash: await bcrypt.hash("Senha segura 123", 10) });
    try {
      await db.update(clinicasTrial).set({ iniciadoEm: null }).where(eq(clinicasTrial.clinicaId, id));
      const cookies: unknown[] = [];
      const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} }, res: { cookie: (...args: unknown[]) => cookies.push(args) } } as any);
      await expect(caller.auth.login({ email, password: "incorreta" })).rejects.toThrow("inválidos");
      expect((await db.select().from(clinicasTrial).where(eq(clinicasTrial.clinicaId, id)))[0].iniciadoEm).toBeNull();
      process.env.CENTRAL_ENABLED = "true";
      await expect(caller.auth.login({ email, password: "Senha segura 123" })).resolves.toEqual({ success: true });
      expect(cookies).toHaveLength(1);
      expect(await trialAccess(id)).toBe(true);
      const initial = (await db.select().from(clinicasTrial).where(eq(clinicasTrial.clinicaId, id)))[0].iniciadoEm;
      await caller.auth.login({ email, password: "Senha segura 123" });
      expect((await db.select().from(clinicasTrial).where(eq(clinicasTrial.clinicaId, id)))[0].iniciadoEm).toEqual(initial);
    } finally {
      delete process.env.CENTRAL_ENABLED;
      await db.delete(users).where(eq(users.id, userId));
      await db.delete(clinicas).where(eq(clinicas.id, id));
    }
  });
});