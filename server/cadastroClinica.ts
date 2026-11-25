import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNotNull, isNull, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { solicitacoesClinica, solicitacoesCentral, clinicas, clinicSettings, users } from "../drizzle/schema";
import { centralRegistrationEvent } from "./centralRegistrationClient";
import { getDb } from "./db";
import { publicProcedure, router } from "./_core/trpc";
import { sendRegistrationEmail } from "./registrationEmail";
import { registrationConfig } from "./registrationConfig";
import { deliverPendingRegistrations } from "./centralRegistrationOutbox";

function validateDocument(value: string) {
  if (!/^\d{11}$|^\d{14}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  const digit = (digits: string, weights: number[]) => {
    const rem = digits.split("").reduce((sum, n, index) => sum + Number(n) * weights[index], 0) % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  if (value.length === 11) return digit(value.slice(0, 9), [10,9,8,7,6,5,4,3,2]) === Number(value[9]) && digit(value.slice(0, 10), [11,10,9,8,7,6,5,4,3,2]) === Number(value[10]);
  return digit(value.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]) === Number(value[12]) && digit(value.slice(0, 13), [6,5,4,3,2,9,8,7,6,5,4,3,2]) === Number(value[13]);
}

export const validDocument = validateDocument;
const estadosBrasil = new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
function requireHomologation() {
  if (process.env.NODE_ENV === "production" || process.env.CLINICA_CADASTRO_HOMOLOGACAO !== "1") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cadastro ainda não habilitado." });
  }
  const url = process.env.DATABASE_URL;
  try {
    const parsed = new URL(url ?? "");
    if (parsed.protocol === "mysql:" && ["localhost", "127.0.0.1"].includes(parsed.hostname) && ["/clinica_homologacao_descartavel", "/clinica_cadastro_duplo_homologacao_20261124"].includes(parsed.pathname)) return;
  } catch { /* configuração inválida */ }
  throw new TRPCError({ code: "FORBIDDEN", message: "Cadastro disponível somente no banco local de homologação." });
}

function registrationMode() {
  if (process.env.PUBLIC_REGISTRATION_ENABLED === "true") {
    const baseUrl = process.env.PUBLIC_BASE_URL ?? "";
    const apiKey = process.env.BREVO_API_KEY ?? "";
    const { problems, fromEmail } = registrationConfig(process.env);
    if (problems.length) {
      console.error(`[Cadastro] Configuração inválida: ${problems.join(", ")}.`);
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Cadastro indisponível. Tente novamente mais tarde." });
    }
    return { local: false as const, baseUrl, apiKey, fromEmail };
  }
  requireHomologation();
  return { local: true as const };
}

export const cadastroClinicaRouter = router({
  solicitar: publicProcedure.input(z.object({
    nome: z.string().trim().min(3).max(150),
    email: z.string().trim().email().max(320).transform(v => v.toLowerCase()),
    telefone: z.string().trim().min(10).max(30),
    empresa: z.string().trim().min(2).max(120),
    cidade: z.string().trim().min(2).max(100),
    estado: z.string().trim().transform(value => value.toUpperCase()).refine(value => estadosBrasil.has(value), "Selecione uma UF válida."),
    documento: z.string().transform(v => v.replace(/\D/g, "")).refine(validateDocument, "Informe um CPF ou CNPJ válido."),
    aceite: z.literal(true),
  })).mutation(async ({ input }) => {
    const mode = registrationMode();
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível." });
    const existing = (await db.select({ id: solicitacoesClinica.id }).from(solicitacoesClinica).where(eq(solicitacoesClinica.email, input.email)).limit(1))[0];
    if (existing) {
      if (mode.local) throw new TRPCError({ code: "CONFLICT", message: "Já existe uma solicitação para este e-mail na homologação." });
      return { success: true as const, confirmacaoLocal: "" };
    }
    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    try {
      await db.insert(solicitacoesClinica).values({ nome: input.nome, email: input.email, telefone: input.telefone, empresa: input.empresa, cidade: input.cidade, estado: input.estado, documento: input.documento, tokenHash: tokenHash(token), tokenExpiraEm: new Date(now.getTime() + 3600_000), aceiteEm: now });
    } catch (error) {
      if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
        if (mode.local) throw new TRPCError({ code: "CONFLICT", message: "Já existe uma solicitação para este e-mail na homologação." });
        return { success: true as const, confirmacaoLocal: "" };
      }
      throw error;
    }
    if (mode.local) return { success: true as const, confirmacaoLocal: token };
    try { await sendRegistrationEmail({ email: input.email, name: input.nome, token, baseUrl: mode.baseUrl, apiKey: mode.apiKey, fromEmail: mode.fromEmail, environment: process.env.NODE_ENV ?? "production", allowLocalHttp: process.env.CENTRAL_ALLOW_LOCAL_HTTP === "true" }); }
    catch { console.error("[Cadastro] Falha ou incerteza no envio da confirmação."); }
    return { success: true as const, confirmacaoLocal: "" };
  }),
  confirmar: publicProcedure.input(z.object({ token: z.string().min(32).max(128) })).mutation(async ({ input }) => {
    registrationMode();
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível." });
    const result = await db.update(solicitacoesClinica).set({ emailConfirmadoEm: new Date() }).where(and(eq(solicitacoesClinica.tokenHash, tokenHash(input.token)), isNull(solicitacoesClinica.emailConfirmadoEm), gt(solicitacoesClinica.tokenExpiraEm, new Date())));
    if (result[0].affectedRows !== 1) {
      const confirmed = (await db.select({ id: solicitacoesClinica.id }).from(solicitacoesClinica).where(and(eq(solicitacoesClinica.tokenHash, tokenHash(input.token)), isNotNull(solicitacoesClinica.emailConfirmadoEm), gt(solicitacoesClinica.tokenExpiraEm, new Date()), isNull(solicitacoesClinica.clinicaId), isNull(solicitacoesClinica.usuarioId))).limit(1))[0];
      if (!confirmed) throw new TRPCError({ code: "BAD_REQUEST", message: "Link inválido, expirado ou já utilizado." });
    }
    return { success: true } as const;
  }),
  reenviar: publicProcedure.input(z.object({ email: z.string().trim().email().max(320).transform(value => value.toLowerCase()) })).mutation(async ({ input }) => {
    const mode = registrationMode();
    if (mode.local) return { success: true as const };
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Cadastro indisponível. Tente novamente mais tarde." });
    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const updated = await db.update(solicitacoesClinica).set({ tokenHash: tokenHash(token), tokenExpiraEm: new Date(now.getTime() + 3600_000) }).where(and(eq(solicitacoesClinica.email, input.email), isNull(solicitacoesClinica.emailConfirmadoEm), isNull(solicitacoesClinica.clinicaId), lte(solicitacoesClinica.tokenExpiraEm, new Date(now.getTime() + 58 * 60_000))));
    if (updated[0].affectedRows === 1) {
      const row = (await db.select({ nome: solicitacoesClinica.nome }).from(solicitacoesClinica).where(eq(solicitacoesClinica.email, input.email)).limit(1))[0];
      if (row) try { await sendRegistrationEmail({ email: input.email, name: row.nome, token, baseUrl: mode.baseUrl, apiKey: mode.apiKey, fromEmail: mode.fromEmail, environment: process.env.NODE_ENV ?? "production", allowLocalHttp: process.env.CENTRAL_ALLOW_LOCAL_HTTP === "true" }); } catch { console.error("[Cadastro] Falha ou incerteza no reenvio de confirmação."); }
    }
    return { success: true as const };
  }),
  concluir: publicProcedure.input(z.object({ token: z.string().min(32).max(128), senha: z.string().min(10).max(128) })).mutation(async ({ input }) => {
    registrationMode();
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível." });
    const passwordHash = await bcrypt.hash(input.senha, 12);
    const result = await db.transaction(async tx => {
      const registration = (await tx.select().from(solicitacoesClinica).where(and(eq(solicitacoesClinica.tokenHash, tokenHash(input.token)), gt(solicitacoesClinica.tokenExpiraEm, new Date()))).limit(1).for("update"))[0];
      if (!registration || !registration.emailConfirmadoEm || registration.clinicaId || registration.usuarioId) throw new TRPCError({ code: "BAD_REQUEST", message: "Cadastro não confirmado, expirado ou já concluído." });
      const existing = (await tx.select({ id: users.id }).from(users).where(eq(users.email, registration.email)).limit(1))[0];
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Este e-mail já possui usuário na homologação." });
      const base = registration.empresa.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 95).replace(/-+$/, "") || "clinica";
      const slug = `${base}-${randomBytes(6).toString("hex")}`;
      const [clinic] = await tx.insert(clinicas).values({ nome: registration.empresa, slug, ativa: false });
      const clinicaId = Number(clinic.insertId);
      await tx.insert(clinicSettings).values({ clinicaId, nome: registration.empresa, cidade: registration.cidade, estado: registration.estado, telefone: registration.telefone, emailContato: registration.email });
      const [user] = await tx.insert(users).values({ clinicaId, openId: `local:${nanoid(21)}`, name: registration.nome, email: registration.email, telefone: registration.telefone, role: "admin", passwordHash, passwordUpdatedAt: new Date(), loginMethod: "local", ativo: false });
      await tx.update(solicitacoesClinica).set({ clinicaId, usuarioId: Number(user.insertId) }).where(eq(solicitacoesClinica.id, registration.id));
      const eventoId = centralRegistrationEvent(clinicaId);
      await tx.insert(solicitacoesCentral).values({ cadastroId: registration.id, empresaId: clinicaId, eventoId, payload: JSON.stringify({ evento_id: eventoId, empresa_id: clinicaId, razao_social: registration.empresa, nome_fantasia: registration.empresa, cnpj_cpf: registration.documento, email: registration.email, telefone: registration.telefone, responsavel: registration.nome }) });
      return { success: true as const, clinicaSlug: slug, liberado: false as const };
    });
    if (process.env.CENTRAL_ENABLED === "true") {
      void deliverPendingRegistrations({ baseUrl: process.env.CENTRAL_BASE_URL ?? "", apiToken: process.env.CENTRAL_API_TOKEN ?? "", environment: process.env.NODE_ENV ?? "production", allowLocalHttp: process.env.CENTRAL_ALLOW_LOCAL_HTTP === "true" }).catch(() => console.error("[Central] Falha no envio de cadastro."));
    }
    return result;
  }),
});