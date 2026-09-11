import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { and, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  auditoria,
  caixasDiarios,
  clinicas,
  clientes,
  clinicMessagingSettings,
  comissoes,
  contasReceber,
  despesas,
  equipamentos,
  evolucoes,
  fotosProntuario,
  insumos,
  lembretes,
  perguntas,
  profissionaisServicos,
  prontuarios,
  publicBookingTokens,
  passwordResetTokens,
  questionarioPerguntas,
  questionarios,
  recebimentos,
  respostas,
  respostasQuestionario,
  salas,
  servicos,
  sessoes,
  users,
  clinicSettings,
} from "../drizzle/schema";
import { clearActiveClinicCookie, getActiveClinicId, getSessionCookieOptions, setActiveClinicCookie } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router, masterProcedure } from "./_core/trpc";
import { getDb, getUserByEmail } from "./db";
import { createLocalSessionToken, LOCAL_SESSION_MAX_AGE_MS } from "./localAuth";
import { createCommissionOnSessionCompletion } from "./commissionRules";
import { recordCommissionPayments } from "./commissionPayments";
import { selectPendingCommissionIds } from "./commissionSettlements";
import { resolveReminderDeliveryChannel, sendBrevoReminder } from "./reminders";
import { storagePut } from "./storage";
import { clinicBrevoConfig, decryptSecret, encryptSecret, maskSecret } from "./brevoConfig";
import { generateReceiptHTML, generateReceiptNumber } from "./receiptGenerator";

const roles = z.enum(["master", "user", "admin", "recepcao", "profissional", "cliente"]);
const sessionStatus = z.enum([
  "PENDENTE",
  "AGUARDANDO_CONFIRMACAO",
  "CONFIRMADA",
  "EM_ATENDIMENTO",
  "CONCLUIDA",
  "CANCELADA",
  "NAO_COMPARECEU",
  "BLOQUEADA",
]);
const money = z.string().regex(/^\d+(?:[.,]\d{1,2})?$/, "Informe um valor válido.");
const commissionPercentage = z.string().regex(/^\d{1,3}(?:[.,]\d{1,2})?$/, "Informe um percentual válido.").refine((value) => Number(toCurrency(value)) <= 100, "O percentual não pode ser superior a 100%.");
const commissionRuleInput = z.object({
  profissionalId: z.number().int().positive(),
  servicoId: z.number().int().positive(),
  tipoComissao: z.enum(["PERCENTUAL", "VALOR_FIXO"]),
  comissaoPercentual: commissionPercentage,
  comissaoValorFixo: money,
  ativo: z.boolean().default(true),
});
const paymentType = z.enum(["DINHEIRO", "PIX", "CARTAO_CREDITO", "CARTAO_DEBITO", "TRANSFERENCIA", "OUTRO"]);
const paymentItemInput = z.object({
  valor: money.refine((value) => Number(toCurrency(value)) > 0, "Informe um valor maior que zero."),
  tipoPagamento: paymentType,
  dataPrevistaLiquidacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const receiptInput = z.object({
  contaReceberId: z.number().int().positive(),
  clienteId: z.number().int().positive(),
  valor: money.optional(),
  tipoPagamento: paymentType.optional(),
  dataPrevistaLiquidacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  observacoes: z.string().max(2000).optional(),
  pagamentos: z.array(paymentItemInput).min(1).max(6).optional(),
}).refine((input) => Boolean(input.pagamentos?.length) || Boolean(input.valor && input.tipoPagamento), {
  message: "Informe pelo menos uma forma de pagamento.",
  path: ["pagamentos"],
});
const staffRoles = ["admin", "recepcao", "profissional"] as const;
const managementRoles = ["admin", "recepcao"] as const;

function requireRole(allowed: readonly z.infer<typeof roles>[]) {
  return protectedProcedure.use(({ ctx, next }) => {
    // O consultor master tem perfil de gestor em qualquer ambiente (acesso global).
    if (ctx.user.role !== "master" && !allowed.includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Seu perfil não tem permissão para esta operação." });
    }
    return next({ ctx });
  });
}

const staffProcedure = requireRole(staffRoles);
const managementProcedure = requireRole(managementRoles);
const adminOnlyProcedure = requireRole(["admin"]);

function toCurrency(value: string) {
  return value.replace(",", ".");
}

type BusyInterval = { dataHoraInicio: Date; dataHoraFim: Date };

export function publicAvailableSlots(date: string, durationMin: number, busyIntervals: BusyInterval[], now = new Date()) {
  const dayStart = new Date(`${date}T08:00:00`);
  const dayEnd = new Date(`${date}T20:00:00`);
  const earliest = now.getTime() + 15 * 60_000;
  const slots: Array<{ hora: string; dataHoraInicio: Date; dataHoraFim: Date }> = [];
  for (let start = dayStart.getTime(); start + durationMin * 60_000 <= dayEnd.getTime(); start += 30 * 60_000) {
    const dataHoraInicio = new Date(start);
    const dataHoraFim = new Date(start + durationMin * 60_000);
    const isBusy = busyIntervals.some((busy) => dataHoraInicio < busy.dataHoraFim && dataHoraFim > busy.dataHoraInicio);
    if (!isBusy && dataHoraInicio.getTime() >= earliest) {
      slots.push({ hora: dataHoraInicio.toTimeString().slice(0, 5), dataHoraInicio, dataHoraFim });
    }
  }
  return slots;
}

const CLINIC_TIME_ZONE = "America/Sao_Paulo";

export function formatAppointmentDateTime(value: Date, clientTimeZone?: string) {
  const format = (timeZone: string) => new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
  try {
    return format(clientTimeZone?.trim() || CLINIC_TIME_ZONE);
  } catch {
    return format(CLINIC_TIME_ZONE);
  }
}

export function publicBookingConfirmationMessage(serviceName: string, appointmentStart: Date, clientTimeZone?: string) {
  return `Recebemos sua solicitação de ${serviceName} para ${formatAppointmentDateTime(appointmentStart, clientTimeZone)}. A equipe SunSet confirmará o horário em breve.`;
}

export function publicBookingReminderMessage(appointmentStart: Date, clientTimeZone?: string) {
  return `Lembrete de atendimento em ${formatAppointmentDateTime(appointmentStart, clientTimeZone)}.`;
}

export function staffBookingReminderMessage(appointmentStart: Date) {
  return `Lembrete de atendimento agendado para ${formatAppointmentDateTime(appointmentStart)}.`;
}

function deliveryFallbackNotice(requestedChannel: "EMAIL" | "WHATSAPP" | "SMS", deliveryChannel: "EMAIL" | "WHATSAPP" | "SMS" | "INTERNO") {
  if (requestedChannel === deliveryChannel) return "";
  return " Como esse canal ainda não está ativo pela clínica, esta comunicação será enviada por e-mail.";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const localPassword = z.string().min(10, "A senha deve conter pelo menos 10 caracteres.").max(128);
const emailInput = z.string().trim().email("Informe um e-mail válido.").transform((value) => value.toLowerCase());
const resetTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const publicBookingTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const publicContactChannel = z.enum(["EMAIL", "WHATSAPP", "SMS"]);

const publicRegistrationInput = z.object({
  clinicaSlug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Link de agendamento inválido."),
  nome: z.string().trim().min(3, "Informe seu nome completo.").max(250),
  email: emailInput,
  telefone: z.string().trim().max(32).optional().or(z.literal("")),
  canalPreferido: publicContactChannel,
  consentimentoDados: z.boolean().refine((value) => value, { message: "É necessário aceitar o tratamento dos dados para continuar." }),
  optInComunicacao: z.boolean().refine((value) => value, { message: "Autorize as comunicações de agendamento para continuar." }),
}).superRefine((value, ctx) => {
  const phoneDigits = (value.telefone ?? "").replace(/\D/g, "");
  if (value.canalPreferido !== "EMAIL" && phoneDigits.length < 10) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["telefone"], message: "Informe um celular válido com DDD para esse canal." });
  }
});

const publicClinicInput = z.object({
  clinicaSlug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Link de agendamento inválido."),
});

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function publicAnswerHasValue(answer: { respostaTexto?: string; respostaBoolean?: boolean; respostaNumero?: string; respostaData?: string; respostaJson?: string }) {
  return Boolean(answer.respostaTexto?.trim() || answer.respostaBoolean !== undefined || answer.respostaNumero || answer.respostaData || answer.respostaJson);
}

async function resolvePublicBookingSession(token: string) {
  const db = requireDatabase(await getDb());
  const bookingSession = (await db.select().from(publicBookingTokens)
    .where(and(
      eq(publicBookingTokens.tokenHash, publicBookingTokenHash(token)),
      gt(publicBookingTokens.expiresAt, new Date()),
      isNull(publicBookingTokens.usedAt),
    )).limit(1))[0];
  if (!bookingSession) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sua sessão de agendamento expirou. Refaça o cadastro para continuar." });
  const client = (await db.select().from(clientes).where(eq(clientes.id, bookingSession.clienteId)).limit(1))[0];
  if (!client || client.clinicaId !== bookingSession.clinicaId || client.status !== "ATIVO") throw new TRPCError({ code: "FORBIDDEN", message: "Este cadastro não está disponível para agendamento." });
  return { db, bookingSession, client };
}

async function resolvePublicClinic(clinicaSlug: string) {
  const db = requireDatabase(await getDb());
  const clinic = (await db.select().from(clinicas).where(and(eq(clinicas.slug, clinicaSlug), eq(clinicas.ativa, true))).limit(1))[0];
  if (!clinic) throw new TRPCError({ code: "NOT_FOUND", message: "Clínica não encontrada ou indisponível para agendamento on-line." });
  return { db, clinic };
}

function appUrl(req: { protocol: string; get(name: string): string | undefined }) {
  return `${req.protocol}://${req.get("host")}`;
}

function requireDatabase<T>(db: T | null): T {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

async function currentClientId(userId: number, clinicaId: number) {
  const db = requireDatabase(await getDb());
  return (await db.select({ id: clientes.id }).from(clientes).where(and(eq(clientes.userId, userId), eq(clientes.clinicaId, clinicaId))).limit(1))[0]?.id;
}

async function canAccessClient(user: { id: number; role: string; clinicaId: number | null }, clientId: number) {
  if (user.role === "admin" || user.role === "recepcao" || user.role === "master") return true;
  if (user.role === "cliente" || user.role === "user") return (await currentClientId(user.id, user.clinicaId ?? 0)) === clientId;
  const db = requireDatabase(await getDb());
  return Boolean((await db.select({ id: sessoes.id }).from(sessoes)
    .where(and(eq(sessoes.clinicaId, user.clinicaId ?? 0), eq(sessoes.clienteId, clientId), eq(sessoes.profissionalId, user.id))).limit(1))[0]);
}

async function audit(userId: number, entity: string, action: string, entityId?: number, clientId?: number, after?: unknown) {
  const db = await getDb();
  if (!db) return;
  const user = (await db.select({ clinicaId: users.clinicaId }).from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user) return;
  await db.insert(auditoria).values({
    clinicaId: user.clinicaId ?? 0,
    usuarioId: userId,
    clienteId: clientId ?? null,
    entidade: entity,
    entidadeId: entityId ?? null,
    acao: action,
    dadosDepoisJson: after ? JSON.stringify(after) : null,
  });
}

function decodeImage(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Envie uma imagem PNG, JPEG ou WEBP válida." });
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A imagem deve ter no máximo 5 MB." });
  }
  const extension = match[1] === "image/jpeg" ? "jpg" : match[1].split("/")[1];
  return { buffer, contentType: match[1], extension };
}

export function hasScheduleConflict(
  activeSessions: Array<{ profissionalId: number; salaId: number | null; dataHoraInicio: Date; dataHoraFim: Date }>,
  input: { profissionalId: number; salaId?: number; dataHoraInicio: Date; dataHoraFim: Date },
) {
  return activeSessions.some((session) =>
    (session.profissionalId === input.profissionalId || (input.salaId && session.salaId === input.salaId))
    && input.dataHoraInicio < session.dataHoraFim
    && input.dataHoraFim > session.dataHoraInicio,
  );
}

export function filterPendingQuestionnaires<T extends { id: number; versao: number }>(
  published: T[],
  answered: Array<{ questionarioId: number; versaoQuestionario: number }>,
) {
  return published.filter((questionnaire) => !answered.some((response) => response.questionarioId === questionnaire.id && response.versaoQuestionario === questionnaire.versao));
}

export function reminderDeliveryUpdate(sentAt: Date) {
  return { status: "ENVIADO" as const, enviadoEm: sentAt };
}

export function canBootstrapFirstManager(activeLocalCredentials: Array<{ id: number }>) {
  return activeLocalCredentials.length === 0;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    login: publicProcedure.input(z.object({ email: emailInput, password: z.string().min(1) })).mutation(async ({ input, ctx }) => {
      const user = await getUserByEmail(input.email);
      if (!user?.ativo || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha inválidos." });
      }
      const db = requireDatabase(await getDb());
      await db.update(users).set({ lastSignedIn: new Date(), loginMethod: "local" }).where(eq(users.id, user.id));
      const token = await createLocalSessionToken(user.id);
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: LOCAL_SESSION_MAX_AGE_MS });
      return { success: true } as const;
    }),
    requestPasswordReset: publicProcedure.input(z.object({ email: emailInput })).mutation(async ({ input, ctx }) => {
      const user = await getUserByEmail(input.email);
      if (!user?.ativo || !user.email) return { success: true } as const;
      const db = requireDatabase(await getDb());
      const rawToken = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(passwordResetTokens).values({ clinicaId: user.clinicaId ?? 0, userId: user.id, tokenHash: resetTokenHash(rawToken), expiresAt });
      const url = `${appUrl(ctx.req)}/?reset=${encodeURIComponent(rawToken)}`;
      await sendBrevoReminder({ email: user.email, name: user.name ?? undefined }, `Recebemos uma solicitação para redefinir sua senha. Use este link em até 1 hora: ${url}`, user.clinicaId ? await clinicBrevoConfig(user.clinicaId) : undefined);
      return { success: true } as const;
    }),
    bootstrapFirstManager: publicProcedure.input(z.object({ email: emailInput })).mutation(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb());
      const existingCredentials = await db.select({ id: users.id }).from(users)
        .where(and(eq(users.ativo, true), isNotNull(users.passwordHash))).limit(1);
      if (!canBootstrapFirstManager(existingCredentials)) return { success: true } as const;

      const user = await getUserByEmail(input.email);
      if (!user?.ativo || user.role !== "admin" || !user.email || user.passwordHash) return { success: true } as const;
      const rawToken = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(passwordResetTokens).values({ clinicaId: user.clinicaId ?? 0, userId: user.id, tokenHash: resetTokenHash(rawToken), expiresAt });
      const url = `${appUrl(ctx.req)}/?reset=${encodeURIComponent(rawToken)}`;
      await sendBrevoReminder({ email: user.email, name: user.name ?? undefined }, `Este é o primeiro acesso do SunSet. Use este link em até 1 hora para definir sua senha de gestor: ${url}`, user.clinicaId ? await clinicBrevoConfig(user.clinicaId) : undefined);
      return { success: true } as const;
    }),
    resetPassword: publicProcedure.input(z.object({ token: z.string().min(32), password: localPassword })).mutation(async ({ input }) => {
      const db = requireDatabase(await getDb());
      const record = (await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, resetTokenHash(input.token)), isNull(passwordResetTokens.usedAt), gte(passwordResetTokens.expiresAt, new Date()))).limit(1))[0];
      if (!record) throw new TRPCError({ code: "BAD_REQUEST", message: "Este link de redefinição é inválido ou expirou." });
      const hash = await bcrypt.hash(input.password, 12);
      await db.update(users).set({ passwordHash: hash, passwordUpdatedAt: new Date(), loginMethod: "local" }).where(and(eq(users.id, record.userId), eq(users.clinicaId, record.clinicaId)));
      await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.id, record.id), eq(passwordResetTokens.clinicaId, record.clinicaId)));
      return { success: true } as const;
    }),
    createLocalUser: adminOnlyProcedure.input(z.object({ name: z.string().trim().min(2).max(120), email: emailInput, password: localPassword, role: roles, telefone: z.string().trim().max(32).optional() })).mutation(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb());
      if (await getUserByEmail(input.email)) throw new TRPCError({ code: "CONFLICT", message: "Já existe um usuário com este e-mail." });
      const passwordHash = await bcrypt.hash(input.password, 12);
      const result = await db.insert(users).values({ clinicaId: ctx.clinicaId, openId: `local:${nanoid(21)}`, name: input.name, email: input.email, telefone: input.telefone || null, role: input.role, passwordHash, passwordUpdatedAt: new Date(), loginMethod: "local", ativo: true });
      await audit(ctx.user.id, "usuario", "CRIAR_CREDENCIAL_LOCAL", Number(result[0].insertId), undefined, { email: input.email, role: input.role });
      return { id: Number(result[0].insertId) };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      clearActiveClinicCookie(ctx.req, ctx.res);
      return { success: true } as const;
    }),
    listUsers: adminOnlyProcedure.query(async ({ ctx }) => {
      const db = requireDatabase(await getDb());
      return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, ativo: users.ativo }).from(users).where(eq(users.clinicaId, ctx.clinicaId)).orderBy(users.name);
    }),
    updateRole: adminOnlyProcedure.input(z.object({ id: z.number().int().positive(), role: roles, ativo: z.boolean().optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        await db.update(users).set({ role: input.role, ...(input.ativo === undefined ? {} : { ativo: input.ativo }) }).where(and(eq(users.id, input.id), eq(users.clinicaId, ctx.clinicaId)));
        await audit(ctx.user.id, "usuario", "PERFIL_ATUALIZADO", input.id, undefined, input);
        return { success: true };
      }),
  }),

  clientes: router({
    list: staffProcedure.query(async ({ ctx }) => {
      const db = requireDatabase(await getDb());
      const list = await db.select().from(clientes).where(eq(clientes.clinicaId, ctx.clinicaId)).orderBy(desc(clientes.createdAt));
      if (ctx.user.role !== "profissional") return list;
      const own = await db.select({ clienteId: sessoes.clienteId }).from(sessoes).where(and(eq(sessoes.clinicaId, ctx.clinicaId), eq(sessoes.profissionalId, ctx.user.id)));
      return list.filter((client) => own.some((session) => session.clienteId === client.id));
    }),
    get: staffProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input, ctx }) => {
      if (!(await canAccessClient(ctx.user, input.id))) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a este prontuário." });
      const db = requireDatabase(await getDb());
      const client = (await db.select().from(clientes).where(and(eq(clientes.id, input.id), eq(clientes.clinicaId, ctx.clinicaId))).limit(1))[0];
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      const record = (await db.select().from(prontuarios).where(and(eq(prontuarios.clinicaId, ctx.clinicaId), eq(prontuarios.clienteId, input.id))).limit(1))[0] ?? null;
      const history = await db.select().from(sessoes).where(and(eq(sessoes.clinicaId, ctx.clinicaId), eq(sessoes.clienteId, input.id))).orderBy(desc(sessoes.dataHoraInicio));
      const photos = await db.select().from(fotosProntuario).where(and(eq(fotosProntuario.clinicaId, ctx.clinicaId), eq(fotosProntuario.clienteId, input.id))).orderBy(desc(fotosProntuario.createdAt));
      const submittedQuestionnaires = await db.select().from(respostasQuestionario)
        .where(and(eq(respostasQuestionario.clinicaId, ctx.clinicaId), eq(respostasQuestionario.clienteId, input.id))).orderBy(desc(respostasQuestionario.respondidoEm));
      const responseIds = submittedQuestionnaires.map((response) => response.id);
      const answeredItems = responseIds.length
        ? await db.select().from(respostas).where(and(eq(respostas.clinicaId, ctx.clinicaId), inArray(respostas.respostaQuestionarioId, responseIds)))
        : [];
      const questionnaireIds = Array.from(new Set(submittedQuestionnaires.map((response) => response.questionarioId)));
      const questionnaireList = questionnaireIds.length
        ? await db.select().from(questionarios).where(and(eq(questionarios.clinicaId, ctx.clinicaId), inArray(questionarios.id, questionnaireIds)))
        : [];
      const questionLinks = questionnaireIds.length
        ? await db.select().from(questionarioPerguntas).where(and(eq(questionarioPerguntas.clinicaId, ctx.clinicaId), inArray(questionarioPerguntas.questionarioId, questionnaireIds))).orderBy(questionarioPerguntas.ordem)
        : [];
      const questionIds = Array.from(new Set(questionLinks.map((link) => link.perguntaId)));
      const questionList = questionIds.length
        ? await db.select().from(perguntas).where(and(eq(perguntas.clinicaId, ctx.clinicaId), inArray(perguntas.id, questionIds)))
        : [];
      const anamneses = submittedQuestionnaires.map((response) => {
        const questionnaire = questionnaireList.find((item) => item.id === response.questionarioId);
        const orderedQuestions = questionLinks
          .filter((link) => link.questionarioId === response.questionarioId)
          .map((link) => ({ link, question: questionList.find((item) => item.id === link.perguntaId) }))
          .filter((item): item is { link: typeof questionLinks[number]; question: typeof questionList[number] } => Boolean(item.question));
        return {
          id: response.id,
          nome: questionnaire?.nome ?? "Questionário clínico",
          versao: response.versaoQuestionario,
          respondidoEm: response.respondidoEm,
          declaracaoVeracidade: response.declaracaoVeracidade,
          assinaturaDigital: response.assinaturaDigital,
          assinaturaDigitalUrl: response.assinaturaDigitalUrl,
          respostas: orderedQuestions.map(({ link, question }) => ({
            perguntaId: question.id,
            pergunta: question.texto,
            tipoResposta: question.tipoResposta,
            obrigatoria: link.obrigatoria,
            resposta: answeredItems.find((answer) => answer.respostaQuestionarioId === response.id && answer.perguntaId === question.id) ?? null,
          })),
        };
      });
      return { client, record, history, anamneses, photos: photos.map((photo) => ({ ...photo, url: `/storage/${encodeURI(photo.storageKey)}` })) };
    }),
    create: managementProcedure.input(z.object({
      nome: z.string().trim().min(3).max(250), email: z.string().email().optional().or(z.literal("")),
      telefone: z.string().trim().max(32).optional(), cpfHash: z.string().max(128).optional(), cpfEncrypted: z.string().optional(),
      dataNascimento: z.string().max(16).optional(), observacoesInternas: z.string().max(5000).optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb());
      const [result] = await db.insert(clientes).values({
        clinicaId: ctx.clinicaId,
        nome: input.nome, email: input.email || null, telefone: input.telefone || null, cpfHash: input.cpfHash || null,
        cpfEncrypted: input.cpfEncrypted || null, dataNascimento: input.dataNascimento || null, observacoesInternas: input.observacoesInternas || null,
      });
      await db.insert(prontuarios).values({ clinicaId: ctx.clinicaId, clienteId: result.insertId, atualizadoPor: ctx.user.id });
      await audit(ctx.user.id, "cliente", "CRIADO", result.insertId, result.insertId, { nome: input.nome });
      return { success: true, id: result.insertId };
    }),
    update: managementProcedure.input(z.object({ id: z.number().int().positive(), nome: z.string().trim().min(3).max(250), email: z.string().email().optional().or(z.literal("")), telefone: z.string().trim().max(32).optional(), dataNascimento: z.string().max(16).optional(), observacoesInternas: z.string().max(5000).optional(), status: z.enum(["ATIVO", "INATIVO", "BLOQUEADO"]).optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        await db.update(clientes).set({ nome: input.nome, email: input.email || null, telefone: input.telefone || null, dataNascimento: input.dataNascimento || null, observacoesInternas: input.observacoesInternas || null, ...(input.status ? { status: input.status } : {}) }).where(and(eq(clientes.id, input.id), eq(clientes.clinicaId, ctx.clinicaId)));
        await audit(ctx.user.id, "cliente", "ATUALIZADO", input.id, input.id, input);
        return { success: true };
      }),
    archive: managementProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb());
      await db.update(clientes).set({ status: "INATIVO" }).where(and(eq(clientes.id, input.id), eq(clientes.clinicaId, ctx.clinicaId)));
      await audit(ctx.user.id, "cliente", "ARQUIVADO", input.id, input.id);
      return { success: true };
    }),
  }),

  prontuario: router({
    update: staffProcedure.input(z.object({ clienteId: z.number().int().positive(), alergias: z.string().max(4000).optional(), restricoes: z.string().max(4000).optional(), observacoesClinicas: z.string().max(8000).optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!(await canAccessClient(ctx.user, input.clienteId))) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a este prontuário." });
        const db = requireDatabase(await getDb());
        await db.insert(prontuarios).values({ clinicaId: ctx.clinicaId, ...input, atualizadoPor: ctx.user.id }).onDuplicateKeyUpdate({ set: { alergias: input.alergias ?? null, restricoes: input.restricoes ?? null, observacoesClinicas: input.observacoesClinicas ?? null, atualizadoPor: ctx.user.id } });
        await audit(ctx.user.id, "prontuario", "ATUALIZADO", undefined, input.clienteId);
        return { success: true };
      }),
    addEvolution: staffProcedure.input(z.object({ clienteId: z.number().int().positive(), sessaoId: z.number().int().positive(), observacoes: z.string().trim().min(3).max(8000) }))
      .mutation(async ({ input, ctx }) => {
        if (!(await canAccessClient(ctx.user, input.clienteId))) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a este prontuário." });
        const db = requireDatabase(await getDb());
        const session = (await db.select().from(sessoes).where(and(eq(sessoes.id, input.sessaoId), eq(sessoes.clinicaId, ctx.clinicaId))).limit(1))[0];
        if (!session || session.clienteId !== input.clienteId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sessão inválida para esta evolução." });
        if (ctx.user.role === "profissional" && session.profissionalId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "A evolução deve pertencer à sua sessão." });
        await db.insert(evolucoes).values({ clinicaId: ctx.clinicaId, ...input, profissionalId: ctx.user.id }).onDuplicateKeyUpdate({ set: { observacoes: input.observacoes, profissionalId: ctx.user.id } });
        return { success: true };
      }),
    uploadPhoto: staffProcedure.input(z.object({ clienteId: z.number().int().positive(), sessaoId: z.number().int().positive().optional(), categoria: z.enum(["ANTES", "DEPOIS", "EVOLUCAO"]), legenda: z.string().max(250).optional(), dataUrl: z.string().min(20) }))
      .mutation(async ({ input, ctx }) => {
        if (!(await canAccessClient(ctx.user, input.clienteId))) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a este prontuário." });
        const db = requireDatabase(await getDb());
        const image = decodeImage(input.dataUrl);
        const uploaded = await storagePut(`clinica/${ctx.clinicaId}/prontuarios/${input.clienteId}/${crypto.randomUUID()}.${image.extension}`, image.buffer, image.contentType);
        const [result] = await db.insert(fotosProntuario).values({ clinicaId: ctx.clinicaId, clienteId: input.clienteId, sessaoId: input.sessaoId ?? null, categoria: input.categoria, legenda: input.legenda || null, storageKey: uploaded.key, enviadoPor: ctx.user.id });
        await audit(ctx.user.id, "foto_prontuario", "ENVIADA", result.insertId, input.clienteId);
        return { success: true, id: result.insertId, url: uploaded.url };
      }),
  }),

  servicos: router({
    list: protectedProcedure.query(async ({ ctx }) => requireDatabase(await getDb()).select().from(servicos).where(and(eq(servicos.clinicaId, ctx.clinicaId), eq(servicos.ativo, true))).orderBy(servicos.nome)),
    listAdmin: adminOnlyProcedure.query(async ({ ctx }) => requireDatabase(await getDb()).select().from(servicos).where(eq(servicos.clinicaId, ctx.clinicaId)).orderBy(servicos.nome)),
    create: adminOnlyProcedure.input(z.object({ nome: z.string().trim().min(3).max(250), descricao: z.string().max(3000).optional(), duracaoMin: z.number().int().min(10).max(600).default(60), valor: money, tipoServico: z.string().trim().max(64).default("procedimento"), exigeQuestionario: z.boolean().default(true) }))
      .mutation(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        const [result] = await db.insert(servicos).values({ clinicaId: ctx.clinicaId, ...input, valor: toCurrency(input.valor), descricao: input.descricao || null });
        await audit(ctx.user.id, "servico", "CRIADO", result.insertId, undefined, input);
        return { success: true, id: result.insertId };
      }),
    update: adminOnlyProcedure.input(z.object({ id: z.number().int().positive(), nome: z.string().trim().min(3).max(250), descricao: z.string().max(3000).optional(), duracaoMin: z.number().int().min(10).max(600), valor: money, exigeQuestionario: z.boolean(), ativo: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        const [service] = await db.select({ id: servicos.id }).from(servicos).where(and(eq(servicos.id, input.id), eq(servicos.clinicaId, ctx.clinicaId))).limit(1);
        if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Serviço não encontrado." });
        await db.update(servicos).set({ nome: input.nome, descricao: input.descricao || null, duracaoMin: input.duracaoMin, valor: toCurrency(input.valor), exigeQuestionario: input.exigeQuestionario, ativo: input.ativo }).where(and(eq(servicos.id, input.id), eq(servicos.clinicaId, ctx.clinicaId)));
        await audit(ctx.user.id, "servico", "ATUALIZADO", input.id, undefined, input);
        return { success: true };
      }),
    archive: adminOnlyProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb());
      await db.update(servicos).set({ ativo: false }).where(and(eq(servicos.id, input.id), eq(servicos.clinicaId, ctx.clinicaId)));
      await audit(ctx.user.id, "servico", "ARQUIVADO", input.id);
      return { success: true };
    }),
  }),

  profissionais: router({
    list: managementProcedure.query(async ({ ctx }) => requireDatabase(await getDb()).select({ id: users.id, name: users.name, email: users.email, role: users.role, telefone: users.telefone }).from(users).where(and(eq(users.clinicaId, ctx.clinicaId), eq(users.ativo, true), inArray(users.role, ["admin", "profissional"]))).orderBy(users.name)),
    listAdmin: adminOnlyProcedure.query(async ({ ctx }) => requireDatabase(await getDb()).select({ id: users.id, name: users.name, email: users.email, telefone: users.telefone, ativo: users.ativo }).from(users).where(and(eq(users.clinicaId, ctx.clinicaId), eq(users.role, "profissional"))).orderBy(users.name)),
    update: adminOnlyProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(120), email: emailInput, telefone: z.string().trim().max(32).optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        const professional = (await db.select({ id: users.id }).from(users).where(and(eq(users.id, input.id), eq(users.clinicaId, ctx.clinicaId), eq(users.role, "profissional"))).limit(1))[0];
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Profissional não encontrado." });
        const emailOwner = (await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1))[0];
        if (emailOwner && emailOwner.id !== input.id) throw new TRPCError({ code: "CONFLICT", message: "Já existe um usuário com este e-mail." });
        await db.update(users).set({ name: input.name, email: input.email, telefone: input.telefone || null }).where(and(eq(users.id, input.id), eq(users.clinicaId, ctx.clinicaId), eq(users.role, "profissional")));
        await audit(ctx.user.id, "profissional", "ATUALIZADO", input.id, undefined, input);
        return { success: true };
      }),
    archive: adminOnlyProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb());
      const [result] = await db.update(users).set({ ativo: false }).where(and(eq(users.id, input.id), eq(users.clinicaId, ctx.clinicaId), eq(users.role, "profissional")));
      if (!result.affectedRows) throw new TRPCError({ code: "NOT_FOUND", message: "Profissional não encontrado." });
      await audit(ctx.user.id, "profissional", "ARQUIVADO", input.id);
      return { success: true };
    }),
    regrasComissao: adminOnlyProcedure.query(async ({ ctx }) => {
      const db = requireDatabase(await getDb());
      const [links, professionalList, serviceList] = await Promise.all([db.select().from(profissionaisServicos).where(eq(profissionaisServicos.clinicaId, ctx.clinicaId)).orderBy(profissionaisServicos.profissionalId, profissionaisServicos.servicoId), db.select().from(users).where(eq(users.clinicaId, ctx.clinicaId)), db.select().from(servicos).where(eq(servicos.clinicaId, ctx.clinicaId))]);
      return links.map((link) => ({
        ...link,
        ativo: link.comissaoAtiva,
        disponivelAgendamento: link.ativo,
        profissionalNome: professionalList.find((professional) => professional.id === link.profissionalId)?.name ?? "Profissional",
        servicoNome: serviceList.find((service) => service.id === link.servicoId)?.nome ?? "Serviço",
        servicoValor: serviceList.find((service) => service.id === link.servicoId)?.valor ?? "0.00",
      }));
    }),
    salvarRegraComissao: adminOnlyProcedure.input(commissionRuleInput)
      .mutation(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        const professional = (await db.select({ id: users.id }).from(users).where(and(eq(users.id, input.profissionalId), eq(users.clinicaId, ctx.clinicaId), eq(users.role, "profissional"))).limit(1))[0];
        const service = (await db.select({ id: servicos.id }).from(servicos).where(and(eq(servicos.id, input.servicoId), eq(servicos.clinicaId, ctx.clinicaId))).limit(1))[0];
        if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Profissional não encontrado ou sem perfil profissional." });
        if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Serviço não encontrado." });
        const percentual = input.tipoComissao === "PERCENTUAL" ? toCurrency(input.comissaoPercentual) : "0.00";
        const valorFixo = input.tipoComissao === "VALOR_FIXO" ? toCurrency(input.comissaoValorFixo) : "0.00";
        await db.insert(profissionaisServicos).values({ clinicaId: ctx.clinicaId, profissionalId: input.profissionalId, servicoId: input.servicoId, tipoComissao: input.tipoComissao, comissaoPercentual: percentual, comissaoValorFixo: valorFixo, comissaoAtiva: input.ativo })
          .onDuplicateKeyUpdate({ set: { tipoComissao: input.tipoComissao, comissaoPercentual: percentual, comissaoValorFixo: valorFixo, comissaoAtiva: input.ativo } });
        await audit(ctx.user.id, "comissao", "REGRA_ATUALIZADA", input.profissionalId, undefined, input);
        return { success: true };
      }),
    habilitarServico: adminOnlyProcedure.input(z.object({ profissionalId: z.number().int().positive(), servicoId: z.number().int().positive(), comissaoPercentual: commissionPercentage }))
      .mutation(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        await db.insert(profissionaisServicos).values({ clinicaId: ctx.clinicaId, profissionalId: input.profissionalId, servicoId: input.servicoId, tipoComissao: "PERCENTUAL", comissaoPercentual: toCurrency(input.comissaoPercentual), comissaoValorFixo: "0.00", comissaoAtiva: true, ativo: true }).onDuplicateKeyUpdate({ set: { tipoComissao: "PERCENTUAL", comissaoPercentual: toCurrency(input.comissaoPercentual), comissaoValorFixo: "0.00", comissaoAtiva: true, ativo: true } });
        return { success: true };
      }),
  }),

  recursos: router({
    insumos: router({
      list: staffProcedure.query(async ({ ctx }) => {
        const items = await requireDatabase(await getDb()).select().from(insumos).where(and(eq(insumos.clinicaId, ctx.clinicaId), eq(insumos.ativo, true))).orderBy(insumos.nome);
        return items.map((item) => ({ ...item, abaixoDoMinimo: Number(item.estoqueAtual) <= Number(item.estoqueMinimo) }));
      }),
      create: adminOnlyProcedure.input(z.object({ nome: z.string().trim().min(2), unidade: z.string().trim().min(1).max(20), estoqueAtual: money, estoqueMinimo: money, custoUnitario: money }))
        .mutation(async ({ input, ctx }) => {
          const db = requireDatabase(await getDb());
          const [created] = await db.insert(insumos).values({ clinicaId: ctx.clinicaId, ...input, estoqueAtual: toCurrency(input.estoqueAtual), estoqueMinimo: toCurrency(input.estoqueMinimo), custoUnitario: toCurrency(input.custoUnitario) });
          await audit(ctx.user.id, "insumo", "CRIADO", created.insertId, undefined, input);
          return { success: true, id: created.insertId };
        }),
      update: adminOnlyProcedure.input(z.object({ id: z.number().int().positive(), nome: z.string().trim().min(2), unidade: z.string().trim().min(1).max(20), estoqueAtual: money, estoqueMinimo: money, custoUnitario: money, ativo: z.boolean().optional() }))
        .mutation(async ({ input, ctx }) => {
          const db = requireDatabase(await getDb());
          await db.update(insumos).set({ nome: input.nome, unidade: input.unidade, estoqueAtual: toCurrency(input.estoqueAtual), estoqueMinimo: toCurrency(input.estoqueMinimo), custoUnitario: toCurrency(input.custoUnitario), ...(input.ativo === undefined ? {} : { ativo: input.ativo }) }).where(and(eq(insumos.id, input.id), eq(insumos.clinicaId, ctx.clinicaId)));
          await audit(ctx.user.id, "insumo", "ATUALIZADO", input.id, undefined, input);
          return { success: true };
        }),
      archive: adminOnlyProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        await db.update(insumos).set({ ativo: false }).where(and(eq(insumos.id, input.id), eq(insumos.clinicaId, ctx.clinicaId)));
        await audit(ctx.user.id, "insumo", "ARQUIVADO", input.id);
        return { success: true };
      }),
    }),
    equipamentos: router({
      list: staffProcedure.query(async ({ ctx }) => requireDatabase(await getDb()).select().from(equipamentos).where(and(eq(equipamentos.clinicaId, ctx.clinicaId), eq(equipamentos.ativo, true))).orderBy(equipamentos.nome)),
      create: adminOnlyProcedure.input(z.object({ nome: z.string().trim().min(3), descricao: z.string().max(3000).optional(), tipo: z.string().max(64).optional(), localizacao: z.string().max(128).optional() }))
        .mutation(async ({ input, ctx }) => { const db = requireDatabase(await getDb()); const [result] = await db.insert(equipamentos).values({ clinicaId: ctx.clinicaId, ...input, descricao: input.descricao || null, tipo: input.tipo || null, localizacao: input.localizacao || null }); return { success: true, id: result.insertId }; }),
      update: adminOnlyProcedure.input(z.object({ id: z.number().int().positive(), nome: z.string().trim().min(3), descricao: z.string().max(3000).optional(), tipo: z.string().max(64).optional(), localizacao: z.string().max(128).optional(), ativo: z.boolean().optional(), proximaManutencaoEm: z.coerce.date().optional() }))
        .mutation(async ({ input, ctx }) => {
          const db = requireDatabase(await getDb());
          await db.update(equipamentos).set({ nome: input.nome, descricao: input.descricao || null, tipo: input.tipo || null, localizacao: input.localizacao || null, ...(input.ativo === undefined ? {} : { ativo: input.ativo }), ...(input.proximaManutencaoEm ? { proximaManutencaoEm: input.proximaManutencaoEm } : {}) }).where(and(eq(equipamentos.id, input.id), eq(equipamentos.clinicaId, ctx.clinicaId)));
          await audit(ctx.user.id, "equipamento", "ATUALIZADO", input.id, undefined, input);
          return { success: true };
        }),
      archive: adminOnlyProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        await db.update(equipamentos).set({ ativo: false }).where(and(eq(equipamentos.id, input.id), eq(equipamentos.clinicaId, ctx.clinicaId)));
        await audit(ctx.user.id, "equipamento", "ARQUIVADO", input.id);
        return { success: true };
      }),
    }),
    salas: router({
      list: staffProcedure.query(async ({ ctx }) => requireDatabase(await getDb()).select().from(salas).where(and(eq(salas.clinicaId, ctx.clinicaId), eq(salas.ativa, true))).orderBy(salas.nome)),
      create: adminOnlyProcedure.input(z.object({ nome: z.string().trim().min(2), descricao: z.string().max(3000).optional() }))
        .mutation(async ({ input, ctx }) => { const db = requireDatabase(await getDb()); const [result] = await db.insert(salas).values({ clinicaId: ctx.clinicaId, nome: input.nome, descricao: input.descricao || null }); return { success: true, id: result.insertId }; }),
    }),
  }),

  sessoes: router({
    list: staffProcedure.input(z.object({ inicio: z.coerce.date().optional(), fim: z.coerce.date().optional(), profissionalId: z.number().int().positive().optional(), salaId: z.number().int().positive().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        const clauses = [eq(sessoes.clinicaId, ctx.clinicaId)];
        if (input?.inicio) clauses.push(gte(sessoes.dataHoraInicio, input.inicio));
        if (input?.fim) clauses.push(lte(sessoes.dataHoraInicio, input.fim));
        if (input?.profissionalId) clauses.push(eq(sessoes.profissionalId, input.profissionalId));
        if (input?.salaId) clauses.push(eq(sessoes.salaId, input.salaId));
        if (ctx.user.role === "profissional") clauses.push(eq(sessoes.profissionalId, ctx.user.id));
        const list = await db.select().from(sessoes).where(clauses.length ? and(...clauses) : undefined).orderBy(sessoes.dataHoraInicio);
        const clientList = await db.select().from(clientes).where(eq(clientes.clinicaId, ctx.clinicaId));
        const serviceList = await db.select().from(servicos).where(eq(servicos.clinicaId, ctx.clinicaId));
        const professionalList = await db.select().from(users).where(eq(users.clinicaId, ctx.clinicaId));
        const roomList = await db.select().from(salas).where(eq(salas.clinicaId, ctx.clinicaId));
        return list.map((session) => ({ ...session, clienteNome: clientList.find((client) => client.id === session.clienteId)?.nome ?? "Cliente", servicoNome: serviceList.find((service) => service.id === session.servicoId)?.nome ?? "Serviço", profissionalNome: professionalList.find((professional) => professional.id === session.profissionalId)?.name ?? "Profissional", salaNome: roomList.find((room) => room.id === session.salaId)?.nome ?? null }));
      }),
    create: staffProcedure.input(z.object({ clienteId: z.number().int().positive(), servicoId: z.number().int().positive(), profissionalId: z.number().int().positive(), salaId: z.number().int().positive().optional(), equipamentoId: z.number().int().positive().optional(), dataHoraInicio: z.coerce.date(), duracaoMin: z.number().int().min(10).max(600), observacoesInternas: z.string().max(3000).optional() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role === "profissional" && input.profissionalId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Profissionais só podem agendar em sua própria agenda." });
        const db = requireDatabase(await getDb());
        const [client, service, professional, room, equipment, serviceLink] = await Promise.all([
          db.select({ id: clientes.id }).from(clientes).where(and(eq(clientes.id, input.clienteId), eq(clientes.clinicaId, ctx.clinicaId), eq(clientes.status, "ATIVO"))).limit(1),
          db.select({ id: servicos.id, duracaoMin: servicos.duracaoMin }).from(servicos).where(and(eq(servicos.id, input.servicoId), eq(servicos.clinicaId, ctx.clinicaId), eq(servicos.ativo, true))).limit(1),
          db.select({ id: users.id }).from(users).where(and(eq(users.id, input.profissionalId), eq(users.clinicaId, ctx.clinicaId), eq(users.role, "profissional"), eq(users.ativo, true))).limit(1),
          input.salaId ? db.select({ id: salas.id }).from(salas).where(and(eq(salas.id, input.salaId), eq(salas.clinicaId, ctx.clinicaId), eq(salas.ativa, true))).limit(1) : Promise.resolve([]),
          input.equipamentoId ? db.select({ id: equipamentos.id }).from(equipamentos).where(and(eq(equipamentos.id, input.equipamentoId), eq(equipamentos.clinicaId, ctx.clinicaId), eq(equipamentos.ativo, true))).limit(1) : Promise.resolve([]),
          db.select({ id: profissionaisServicos.id }).from(profissionaisServicos).where(and(eq(profissionaisServicos.clinicaId, ctx.clinicaId), eq(profissionaisServicos.profissionalId, input.profissionalId), eq(profissionaisServicos.servicoId, input.servicoId), eq(profissionaisServicos.ativo, true))).limit(1),
        ]);
        if (!client[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado ou inativo." });
        if (!service[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Serviço não encontrado ou inativo." });
        if (!professional[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Profissional não encontrado ou inativo." });
        if (input.salaId && !room[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Sala não encontrada ou inativa." });
        if (input.equipamentoId && !equipment[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Equipamento não encontrado ou inativo." });
        const serviceLinks = await db.select({ id: profissionaisServicos.id }).from(profissionaisServicos).where(and(eq(profissionaisServicos.clinicaId, ctx.clinicaId), eq(profissionaisServicos.servicoId, input.servicoId), eq(profissionaisServicos.ativo, true))).limit(1);
        if (serviceLinks.length && !serviceLink[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "O profissional selecionado não atende este serviço." });
        const end = new Date(input.dataHoraInicio.getTime() + input.duracaoMin * 60_000);
        const active = await db.select().from(sessoes).where(and(eq(sessoes.clinicaId, ctx.clinicaId), inArray(sessoes.status, ["PENDENTE", "AGUARDANDO_CONFIRMACAO", "CONFIRMADA", "EM_ATENDIMENTO"])));
        const conflicts = hasScheduleConflict(active, { profissionalId: input.profissionalId, salaId: input.salaId, dataHoraInicio: input.dataHoraInicio, dataHoraFim: end });
        if (conflicts) throw new TRPCError({ code: "CONFLICT", message: "Há conflito de horário para o profissional ou sala selecionados." });
        const [created] = await db.insert(sessoes).values({ clinicaId: ctx.clinicaId, ...input, dataHoraFim: end, salaId: input.salaId ?? null, equipamentoId: input.equipamentoId ?? null, observacoesInternas: input.observacoesInternas || null, status: "AGUARDANDO_CONFIRMACAO" });
        const serviceDetails = (await db.select().from(servicos).where(eq(servicos.id, input.servicoId)).limit(1))[0];
        await db.insert(contasReceber).values({ clinicaId: ctx.clinicaId, clienteId: input.clienteId, sessaoId: created.insertId, descricao: `Serviço: ${serviceDetails?.nome ?? "Serviço"}`, valorOriginal: serviceDetails?.valor ?? "0.00", valorFinal: serviceDetails?.valor ?? "0.00", dataVencimento: todayIso() });
        const reminderAt = new Date(input.dataHoraInicio.getTime() - 24 * 60 * 60_000);
        if (reminderAt > new Date()) await db.insert(lembretes).values([
          { clinicaId: ctx.clinicaId, sessaoId: created.insertId, destinatario: "CLIENTE", agendadoPara: reminderAt, conteudo: `Lembrete de atendimento em ${formatAppointmentDateTime(input.dataHoraInicio)}.` },
          { clinicaId: ctx.clinicaId, sessaoId: created.insertId, destinatario: "PROFISSIONAL", agendadoPara: reminderAt, conteudo: `Lembrete de atendimento agendado para ${formatAppointmentDateTime(input.dataHoraInicio)}.` },
        ]);
        await audit(ctx.user.id, "sessao", "CRIADA", created.insertId, input.clienteId, input);
        return { success: true, id: created.insertId };
      }),
    updateStatus: staffProcedure.input(z.object({ id: z.number().int().positive(), status: sessionStatus, motivoCancelamento: z.string().max(2000).optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        const session = (await db.select().from(sessoes).where(and(eq(sessoes.id, input.id), eq(sessoes.clinicaId, ctx.clinicaId))).limit(1))[0];
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada." });
        if (ctx.user.role === "profissional" && session.profissionalId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "A sessão não pertence à sua agenda." });
        await db.update(sessoes).set({ status: input.status, ...(input.motivoCancelamento === undefined ? {} : { motivoCancelamento: input.motivoCancelamento || null }) }).where(and(eq(sessoes.id, input.id), eq(sessoes.clinicaId, ctx.clinicaId)));
        if (input.status === "CONCLUIDA") {
          const link = (await db.select().from(profissionaisServicos).where(and(eq(profissionaisServicos.clinicaId, ctx.clinicaId), eq(profissionaisServicos.profissionalId, session.profissionalId), eq(profissionaisServicos.servicoId, session.servicoId))).limit(1))[0];
          const service = (await db.select().from(servicos).where(and(eq(servicos.id, session.servicoId), eq(servicos.clinicaId, ctx.clinicaId))).limit(1))[0];
          const existingCommission = (await db.select({ id: comissoes.id }).from(comissoes).where(and(eq(comissoes.clinicaId, ctx.clinicaId), eq(comissoes.sessaoId, session.id))).limit(1))[0];
          if (service) await createCommissionOnSessionCompletion(link ?? null, service.valor, Boolean(existingCommission), async (snapshot) => {
            await db.insert(comissoes).values({ clinicaId: ctx.clinicaId, sessaoId: session.id, profissionalId: session.profissionalId, ...snapshot });
          });
        }
        await audit(ctx.user.id, "sessao", `STATUS_${input.status}`, input.id, session.clienteId);
        return { success: true };
      }),
  }),

  questionarios: router({
    list: staffProcedure.query(async ({ ctx }) => requireDatabase(await getDb()).select().from(questionarios).where(eq(questionarios.clinicaId, ctx.clinicaId)).orderBy(desc(questionarios.createdAt))),
    create: adminOnlyProcedure.input(z.object({
      codigo: z.string().trim().min(2).max(64), nome: z.string().trim().min(3), descricao: z.string().max(3000).optional(),
      servicoId: z.number().int().positive().optional(), tipoSessao: z.string().max(64).default("PRIMEIRA_SESSAO"),
      perguntas: z.array(z.object({ texto: z.string().trim().min(3).max(3000), tipoResposta: z.enum(["BOOLEAN", "TEXTO", "DATA", "NUMERO", "SELECAO_UNICA", "SELECAO_MULTIPLA", "TERMO_ACEITE"]), obrigatoria: z.boolean().default(true), opcoesJson: z.string().max(4000).optional() })).min(1),
    }))
      .mutation(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        const versions = await db.select({ versao: questionarios.versao }).from(questionarios).where(and(eq(questionarios.clinicaId, ctx.clinicaId), eq(questionarios.codigo, input.codigo)));
        const version = Math.max(0, ...versions.map((item) => item.versao)) + 1;
        if (versions.length) await db.update(questionarios).set({ ativo: false }).where(and(eq(questionarios.clinicaId, ctx.clinicaId), eq(questionarios.codigo, input.codigo)));
        const [created] = await db.insert(questionarios).values({ clinicaId: ctx.clinicaId, codigo: input.codigo, nome: input.nome, descricao: input.descricao || null, servicoId: input.servicoId ?? null, tipoSessao: input.tipoSessao, versao: version, criadoPor: ctx.user.id, publicadoEm: new Date(), perguntasJson: JSON.stringify(input.perguntas) });
        const createdQuestions = await Promise.all(input.perguntas.map(async (pergunta) => {
          const [question] = await db.insert(perguntas).values({ clinicaId: ctx.clinicaId, texto: pergunta.texto, tipoResposta: pergunta.tipoResposta, opcoesJson: pergunta.opcoesJson || null });
          return { id: question.insertId, obrigatoria: pergunta.obrigatoria };
        }));
        await db.insert(questionarioPerguntas).values(createdQuestions.map((question, index) => ({ clinicaId: ctx.clinicaId, questionarioId: created.insertId, perguntaId: question.id, ordem: index + 1, obrigatoria: question.obrigatoria })));
        return { success: true, id: created.insertId, versao: version };
      }),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb());
      const questionnaire = (await db.select().from(questionarios).where(and(eq(questionarios.id, input.id), eq(questionarios.clinicaId, ctx.clinicaId))).limit(1))[0];
      if (!questionnaire || (!questionnaire.ativo && ctx.user.role !== "admin")) throw new TRPCError({ code: "NOT_FOUND", message: "Questionário não encontrado." });
      const links = await db.select().from(questionarioPerguntas).where(and(eq(questionarioPerguntas.clinicaId, ctx.clinicaId), eq(questionarioPerguntas.questionarioId, input.id))).orderBy(questionarioPerguntas.ordem);
      const questionIds = links.map((link) => link.perguntaId);
      const items = questionIds.length ? await db.select().from(perguntas).where(and(eq(perguntas.clinicaId, ctx.clinicaId), inArray(perguntas.id, questionIds))) : [];
      return { ...questionnaire, perguntas: links.map((link) => ({ ...items.find((item) => item.id === link.perguntaId), obrigatoria: link.obrigatoria, ordem: link.ordem })).filter(Boolean) };
    }),
    responder: protectedProcedure.input(z.object({ clienteId: z.number().int().positive(), sessaoId: z.number().int().positive().optional(), questionarioId: z.number().int().positive(), declaracaoVeracidade: z.literal(true), assinaturaDigital: z.string().trim().min(4).max(500000), respostas: z.array(z.object({ perguntaId: z.number().int().positive(), respostaTexto: z.string().max(8000).optional(), respostaBoolean: z.boolean().optional(), respostaNumero: z.string().regex(/^\d+(?:[.,]\d+)?$/).optional(), respostaData: z.string().max(16).optional(), respostaJson: z.string().max(8000).optional() })).min(1) }))
      .mutation(async ({ input, ctx }) => {
        if (!(await canAccessClient(ctx.user, input.clienteId))) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a este cliente." });
        if ((ctx.user.role === "cliente" || ctx.user.role === "user") && ctx.user.name) {
          const normalizar = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
          if (normalizar(input.assinaturaDigital) !== normalizar(ctx.user.name)) throw new TRPCError({ code: "BAD_REQUEST", message: "A assinatura deve corresponder ao nome da sua conta." });
        }
        const db = requireDatabase(await getDb());
        const questionnaire = (await db.select().from(questionarios).where(and(eq(questionarios.id, input.questionarioId), eq(questionarios.clinicaId, ctx.clinicaId))).limit(1))[0];
        if (!questionnaire) throw new TRPCError({ code: "NOT_FOUND", message: "Questionário não encontrado." });
        const [response] = await db.insert(respostasQuestionario).values({ clinicaId: ctx.clinicaId, clienteId: input.clienteId, sessaoId: input.sessaoId ?? null, questionarioId: input.questionarioId, versaoQuestionario: questionnaire.versao, declaracaoVeracidade: true, assinaturaDigital: input.assinaturaDigital, respondidoPor: ctx.user.id, respostasJson: JSON.stringify(input.respostas) });
        await db.insert(respostas).values(input.respostas.map((answer) => ({ clinicaId: ctx.clinicaId, respostaQuestionarioId: response.insertId, perguntaId: answer.perguntaId, respostaTexto: answer.respostaTexto ?? null, respostaBoolean: answer.respostaBoolean ?? null, respostaNumero: answer.respostaNumero ? toCurrency(answer.respostaNumero) : null, respostaData: answer.respostaData ?? null, respostaJson: answer.respostaJson ?? null })));
        await audit(ctx.user.id, "questionario", "RESPONDIDO", response.insertId, input.clienteId);
        return { success: true, id: response.insertId };
      }),
  }),

  lembretes: router({
    list: managementProcedure.input(z.object({ status: z.enum(["PENDENTE", "ENVIADO", "FALHA", "CANCELADO"]).optional() }).optional())
      .query(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        return db.select().from(lembretes).where(and(eq(lembretes.clinicaId, ctx.clinicaId), ...(input?.status ? [eq(lembretes.status, input.status)] : []))).orderBy(lembretes.agendadoPara);
      }),
    marcarEnviado: adminOnlyProcedure.input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        await db.update(lembretes).set({ ...reminderDeliveryUpdate(new Date()), tentativas: sql`${lembretes.tentativas} + 1` }).where(and(eq(lembretes.id, input.id), eq(lembretes.clinicaId, ctx.clinicaId)));
        await audit(ctx.user.id, "lembrete", "MARCADO_ENVIADO", input.id);
        return { success: true };
      }),
  }),

  financeiro: router({
    contas: managementProcedure.query(async ({ ctx }) => {
      const db = requireDatabase(await getDb());
      const accounts = await db.select().from(contasReceber).where(eq(contasReceber.clinicaId, ctx.clinicaId)).orderBy(desc(contasReceber.createdAt));
      const customerList = await db.select().from(clientes).where(eq(clientes.clinicaId, ctx.clinicaId));
      const sessionList = await db.select().from(sessoes).where(eq(sessoes.clinicaId, ctx.clinicaId));
      const allRecebimentos = await db.select().from(recebimentos).where(and(eq(recebimentos.clinicaId, ctx.clinicaId), isNull(recebimentos.estornadoEm)));
      return accounts.map((account) => {
        const pagamentos = allRecebimentos.filter((r) => r.contaReceberId === account.id);
        const totalPago = pagamentos.reduce((sum, r) => sum + Number(r.valor), 0);
        const valorFinal = Number(account.valorFinal);
        const saldoRestante = Math.max(0, valorFinal - totalPago);
        return {
          ...account,
          clienteNome: customerList.find((client) => client.id === account.clienteId)?.nome ?? "Cliente",
          sessaoStatus: sessionList.find((session) => session.id === account.sessaoId)?.status ?? null,
          totalPago,
          saldoRestante,
          pagamentos,
        };
      });
    }),
    receber: managementProcedure.input(receiptInput)
      .mutation(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        const conta = (await db.select().from(contasReceber).where(and(eq(contasReceber.id, input.contaReceberId), eq(contasReceber.clinicaId, ctx.clinicaId))).limit(1))[0];
        if (!conta) throw new TRPCError({ code: "NOT_FOUND", message: "Conta a receber não encontrada." });

        const itensRecebimento = input.pagamentos?.length
          ? input.pagamentos
          : [{ valor: input.valor!, tipoPagamento: input.tipoPagamento!, dataPrevistaLiquidacao: input.dataPrevistaLiquidacao }];
        const valorRecebidoNum = itensRecebimento.reduce((total, item) => total + Number(toCurrency(item.valor)), 0);
        const valorFinalNum = Number(conta.valorFinal);

        const pagamentosAnteriores = await db.select().from(recebimentos).where(and(eq(recebimentos.clinicaId, ctx.clinicaId), eq(recebimentos.contaReceberId, input.contaReceberId), isNull(recebimentos.estornadoEm)));
        const totalPagoAntes = pagamentosAnteriores.reduce((sum, r) => sum + Number(r.valor), 0);
        const saldoRestante = Math.max(0, valorFinalNum - totalPagoAntes);

        if (valorRecebidoNum > saldoRestante + 0.001) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `O valor informado (R$ ${valorRecebidoNum.toFixed(2)}) excede o saldo remanescente em aberto (R$ ${saldoRestante.toFixed(2)}).` });
        }

        const novoTotalPago = totalPagoAntes + valorRecebidoNum;

        const grupoRecebimento = `RCB-${randomUUID()}`;
        const dataRegistro = todayIso();
        await db.insert(recebimentos).values(itensRecebimento.map((item) => {
          const isCard = ["CARTAO_CREDITO", "CARTAO_DEBITO"].includes(item.tipoPagamento);
          return {
            clinicaId: ctx.clinicaId,
            grupoRecebimento,
            contaReceberId: input.contaReceberId,
            clienteId: input.clienteId,
            valor: toCurrency(item.valor),
            tipoPagamento: item.tipoPagamento,
            statusLiquidacao: isCard ? "PENDENTE" as const : "LIQUIDADO" as const,
            dataPrevistaLiquidacao: isCard ? (item.dataPrevistaLiquidacao ?? null) : dataRegistro,
            dataLiquidacao: isCard ? null : dataRegistro,
            liquidadoEm: isCard ? null : new Date(),
            observacoes: input.observacoes || null,
            registradoPor: ctx.user.id,
          };
        }));

        const novoStatus = novoTotalPago >= valorFinalNum ? "PAGA" : "PARCIAL";
        await db.update(contasReceber).set({ status: novoStatus }).where(and(eq(contasReceber.id, input.contaReceberId), eq(contasReceber.clinicaId, ctx.clinicaId)));
        await audit(ctx.user.id, "recebimento", "REGISTRADO", input.contaReceberId, input.clienteId, { ...input, pagamentos: itensRecebimento, grupoRecebimento });
        const temCartaoPendente = itensRecebimento.some((item) => ["CARTAO_CREDITO", "CARTAO_DEBITO"].includes(item.tipoPagamento));
        return { success: true, grupoRecebimento, itensRegistrados: itensRecebimento.length, statusLiquidacao: temCartaoPendente ? "PENDENTE" : "LIQUIDADO", status: novoStatus, totalPago: novoTotalPago, saldoRestante: Math.max(0, valorFinalNum - novoTotalPago) };
      }),
    liquidarRecebimento: managementProcedure.input(z.object({ id: z.number().int().positive(), dataLiquidacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .mutation(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        const receipt = (await db.select().from(recebimentos).where(and(eq(recebimentos.id, input.id), eq(recebimentos.clinicaId, ctx.clinicaId))).limit(1))[0];
        if (!receipt || receipt.estornadoEm) throw new TRPCError({ code: "NOT_FOUND", message: "Recebimento não disponível para liquidação." });
        if (receipt.statusLiquidacao === "LIQUIDADO") throw new TRPCError({ code: "BAD_REQUEST", message: "Este recebimento já foi liquidado." });
        await db.update(recebimentos).set({ statusLiquidacao: "LIQUIDADO", dataLiquidacao: input.dataLiquidacao, liquidadoEm: new Date() }).where(and(eq(recebimentos.id, input.id), eq(recebimentos.clinicaId, ctx.clinicaId)));
        await audit(ctx.user.id, "recebimento", "LIQUIDADO", input.id, receipt.clienteId, input);
        return { success: true };
      }),
    gerarRecibo: managementProcedure.input(z.object({ recebimentoId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        
        // Buscar recebimento
        const receipt = (await db.select().from(recebimentos).where(and(eq(recebimentos.id, input.recebimentoId), eq(recebimentos.clinicaId, ctx.clinicaId))).limit(1))[0];
        if (!receipt || receipt.estornadoEm) throw new TRPCError({ code: "NOT_FOUND", message: "Recebimento não encontrado." });

        // Buscar conta a receber
        const conta = (await db.select().from(contasReceber).where(eq(contasReceber.id, receipt.contaReceberId)).limit(1))[0];
        if (!conta) throw new TRPCError({ code: "NOT_FOUND", message: "Conta a receber não encontrada." });

        // Buscar informações da clínica
        const clinica = (await db.select().from(clinicas).where(eq(clinicas.id, ctx.clinicaId)).limit(1))[0];
        const settings = (await db.select().from(clinicSettings).where(eq(clinicSettings.clinicaId, ctx.clinicaId)).limit(1))[0];

        // Buscar cliente
        const cliente = (await db.select().from(clientes).where(eq(clientes.id, receipt.clienteId)).limit(1))[0];
        if (!cliente) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });

        // Buscar sessão e serviço
        const sessao = conta.sessaoId ? (await db.select().from(sessoes).where(eq(sessoes.id, conta.sessaoId)).limit(1))[0] : null;
        const servico = sessao ? (await db.select().from(servicos).where(eq(servicos.id, sessao.servicoId)).limit(1))[0] : null;
        
        // Buscar profissional
        const profissional = sessao ? (await db.select().from(users).where(eq(users.id, sessao.profissionalId)).limit(1))[0] : null;

        // Buscar todos os pagamentos da conta
        const todosPagamentos = await db.select().from(recebimentos).where(and(eq(recebimentos.contaReceberId, conta.id), isNull(recebimentos.estornadoEm)));
        const totalPago = todosPagamentos.reduce((sum, r) => sum + Number(r.valor), 0);
        const valorFinalNum = Number(conta.valorFinal);
        const saldoRestante = Math.max(0, valorFinalNum - totalPago);
        const tipoRecibo = saldoRestante <= 0.009 ? "TOTAL" as const : "PARCIAL" as const;

        // Gerar número do recibo
        const numeroRecibo = generateReceiptNumber(receipt.id);

        // Preparar dados do recibo
        const receiptData = {
          clinica: {
            nome: settings?.nome || clinica.nome,
            razaoSocial: settings?.razaoSocial,
            cnpj: settings?.cnpj,
            endereco: settings?.endereco,
            telefone: settings?.telefone,
            email: settings?.email,
            logoUrl: settings?.logoUrl
          },
          cliente: {
            nome: cliente.nome,
            cpf: cliente.cpfHash ? "***" + cliente.cpfHash.slice(-4) : undefined
          },
          profissional: {
            nome: profissional?.name || "Profissional"
          },
          servico: {
            nome: servico?.nome || conta.descricao,
            descricao: servico?.descricao
          },
          sessao: {
            dataAgendamento: new Date(sessao?.dataHoraInicio || conta.createdAt),
            dataExecucao: sessao?.status === "CONCLUIDA" ? new Date(sessao.dataHoraFim) : undefined,
            duracaoMin: servico?.duracaoMin || 60
          },
          pagamento: {
            valor: Number(receipt.valor),
            valorTotal: Number(conta.valorFinal),
            totalPago,
            saldoRestante,
            tipoPagamento: receipt.tipoPagamento,
            dataPagamento: new Date(receipt.createdAt),
            formaPagamento: receipt.tipoPagamento,
            observations: receipt.observacoes,
            historico: todosPagamentos.map((item) => ({
              valor: Number(item.valor),
              tipoPagamento: item.tipoPagamento,
              dataPagamento: new Date(item.createdAt),
              statusLiquidacao: item.statusLiquidacao,
            })),
          },
          recibo: {
            numero: numeroRecibo,
            dataEmissao: new Date(),
            tipo: tipoRecibo,
          }
        };

        // Gerar HTML do recibo
        const receiptHTML = generateReceiptHTML(receiptData);

        return {
          html: receiptHTML,
          numero: numeroRecibo,
          tipo: tipoRecibo,
          totalPago,
          saldoRestante,
          valorTotal: valorFinalNum,
          fileName: `recibo_${numeroRecibo}.html`
        };
      }),
    despesas: managementProcedure.query(async ({ ctx }) => requireDatabase(await getDb()).select().from(despesas).where(eq(despesas.clinicaId, ctx.clinicaId)).orderBy(desc(despesas.dataCompetencia))),
    criarDespesa: adminOnlyProcedure.input(z.object({ descricao: z.string().trim().min(3), categoria: z.string().trim().min(2).max(100), valor: money, dataCompetencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .mutation(async ({ input, ctx }) => { const db = requireDatabase(await getDb()); const [created] = await db.insert(despesas).values({ clinicaId: ctx.clinicaId, ...input, valor: toCurrency(input.valor), registradoPor: ctx.user.id }); return { success: true, id: created.insertId }; }),
    marcarDespesaPaga: adminOnlyProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => { const db = requireDatabase(await getDb()); await db.update(despesas).set({ status: "PAGA", pagoEm: new Date() }).where(and(eq(despesas.id, input.id), eq(despesas.clinicaId, ctx.clinicaId))); return { success: true }; }),
    caixa: managementProcedure.input(z.object({ data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).optional()).query(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb()); const data = input?.data ?? todayIso();
      const incoming = await db.select({ valor: recebimentos.valor, tipoPagamento: recebimentos.tipoPagamento, statusLiquidacao: recebimentos.statusLiquidacao, dataLiquidacao: recebimentos.dataLiquidacao, dataPrevistaLiquidacao: recebimentos.dataPrevistaLiquidacao, createdAt: recebimentos.createdAt, estornadoEm: recebimentos.estornadoEm }).from(recebimentos).where(eq(recebimentos.clinicaId, ctx.clinicaId));
      const outgoings = await db.select({ valor: despesas.valor, pagoEm: despesas.pagoEm, status: despesas.status }).from(despesas).where(eq(despesas.clinicaId, ctx.clinicaId));
      const settledOnDate = incoming.filter((item) => !item.estornadoEm && item.statusLiquidacao === "LIQUIDADO" && (item.dataLiquidacao ?? item.createdAt.toISOString().slice(0, 10)) === data);
      const entradasDinheiro = settledOnDate.filter((item) => item.tipoPagamento === "DINHEIRO").reduce((sum, item) => sum + Number(item.valor), 0);
      const entradasPix = settledOnDate.filter((item) => item.tipoPagamento === "PIX").reduce((sum, item) => sum + Number(item.valor), 0);
      const entradasLiquidadas = settledOnDate.reduce((sum, item) => sum + Number(item.valor), 0);
      const cartaoPendente = incoming.filter((item) => !item.estornadoEm && item.statusLiquidacao === "PENDENTE" && ["CARTAO_CREDITO", "CARTAO_DEBITO"].includes(item.tipoPagamento) && (item.dataPrevistaLiquidacao ?? item.createdAt.toISOString().slice(0, 10)) === data).reduce((sum, item) => sum + Number(item.valor), 0);
      const saidas = outgoings.filter((item) => item.status === "PAGA" && item.pagoEm?.toISOString().slice(0, 10) === data).reduce((sum, item) => sum + Number(item.valor), 0);
      const cash = (await db.select().from(caixasDiarios).where(and(eq(caixasDiarios.clinicaId, ctx.clinicaId), eq(caixasDiarios.dataCaixa, data))).limit(1))[0] ?? null;
      return { data, entradas: entradasDinheiro, entradasDinheiro, entradasPix, entradasLiquidadas, cartaoPendente, saidas, saldoCalculado: Number(cash?.saldoAbertura ?? 0) + entradasDinheiro - saidas, caixa: cash };
    }),
    abrirCaixa: managementProcedure.input(z.object({ data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), saldoAbertura: money, observacoes: z.string().max(2000).optional() })).mutation(async ({ input, ctx }) => { const db = requireDatabase(await getDb()); const data = input.data ?? todayIso(); await db.insert(caixasDiarios).values({ clinicaId: ctx.clinicaId, dataCaixa: data, saldoAbertura: toCurrency(input.saldoAbertura), observacoes: input.observacoes || null, abertoPor: ctx.user.id }).onDuplicateKeyUpdate({ set: { saldoAbertura: toCurrency(input.saldoAbertura), observacoes: input.observacoes || null } }); return { success: true }; }),
    comissoes: adminOnlyProcedure.input(z.object({ dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).optional()).query(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb()); const rows = await db.select().from(comissoes).where(eq(comissoes.clinicaId, ctx.clinicaId)).orderBy(desc(comissoes.geradaEm)); const professionalList = await db.select().from(users).where(eq(users.clinicaId, ctx.clinicaId));
      const inPeriod = (value: Date) => (!input?.dataInicio || value.toISOString().slice(0, 10) >= input.dataInicio) && (!input?.dataFim || value.toISOString().slice(0, 10) <= input.dataFim);
      return rows.filter((commission) => inPeriod(commission.geradaEm)).map((commission) => ({ ...commission, profissionalNome: professionalList.find((professional) => professional.id === commission.profissionalId)?.name ?? "Profissional" }));
    }),
    pagarComissoes: adminOnlyProcedure.input(z.object({
      ids: z.array(z.number().int().positive()).min(1).max(100),
      dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })).mutation(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb());
      const settlement = await recordCommissionPayments(
        input.ids,
        input.dataPagamento,
        async (ids) => db.select({ id: comissoes.id, status: comissoes.status }).from(comissoes).where(and(eq(comissoes.clinicaId, ctx.clinicaId), inArray(comissoes.id, ids))),
        async (ids, paidAt) => db.update(comissoes).set({ status: "PAGA", pagaEm: paidAt }).where(and(eq(comissoes.clinicaId, ctx.clinicaId), inArray(comissoes.id, ids), eq(comissoes.status, "PENDENTE"))),
      );
      if (settlement.pagas) {
        await audit(ctx.user.id, "comissao", "PAGAMENTO_REGISTRADO", settlement.pendingIds[0], undefined, { ids: settlement.pendingIds, dataPagamento: input.dataPagamento });
      }
      return { success: true, pagas: settlement.pagas, jaProcessadas: settlement.alreadyProcessed, naoEncontradas: settlement.notFound };
    }),
    relatorio: adminOnlyProcedure.input(z.object({ dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).refine((value) => value.dataInicio <= value.dataFim, { message: "A data inicial deve ser anterior ou igual à data final." }))
      .query(async ({ input, ctx }) => {
        const db = requireDatabase(await getDb());
        const [accounts, payments, expenses, sessions, serviceList, customerList, commissionList, professionalList] = await Promise.all([
          db.select().from(contasReceber).where(eq(contasReceber.clinicaId, ctx.clinicaId)), db.select().from(recebimentos).where(eq(recebimentos.clinicaId, ctx.clinicaId)), db.select().from(despesas).where(eq(despesas.clinicaId, ctx.clinicaId)), db.select().from(sessoes).where(eq(sessoes.clinicaId, ctx.clinicaId)), db.select().from(servicos).where(eq(servicos.clinicaId, ctx.clinicaId)), db.select().from(clientes).where(eq(clientes.clinicaId, ctx.clinicaId)), db.select().from(comissoes).where(eq(comissoes.clinicaId, ctx.clinicaId)), db.select().from(users).where(eq(users.clinicaId, ctx.clinicaId)),
        ]);
        const inPeriod = (value: Date | string | null | undefined) => {
          if (!value) return false;
          const day = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
          return day >= input.dataInicio && day <= input.dataFim;
        };
        const customerName = new Map(customerList.map((customer) => [customer.id, customer.nome]));
        const accountById = new Map(accounts.map((account) => [account.id, account]));
        const serviceById = new Map(serviceList.map((service) => [service.id, service]));
        const receivedPayments = payments.filter((payment) => !payment.estornadoEm && payment.statusLiquidacao === "LIQUIDADO" && inPeriod(payment.dataLiquidacao ?? payment.createdAt));
        const pendingCardPayments = payments.filter((payment) => !payment.estornadoEm && payment.statusLiquidacao === "PENDENTE" && ["CARTAO_CREDITO", "CARTAO_DEBITO"].includes(payment.tipoPagamento) && inPeriod(payment.dataPrevistaLiquidacao ?? payment.createdAt));
        const paidExpenses = expenses.filter((expense) => expense.status === "PAGA" && inPeriod(expense.pagoEm));
        const periodCommissions = commissionList.filter((commission) => inPeriod(commission.geradaEm));
        const openReceivables = accounts.filter((account) => ["ABERTA", "PARCIAL", "VENCIDA"].includes(account.status) && inPeriod(account.dataVencimento));
        const openPayables = expenses.filter((expense) => expense.status === "ABERTA" && inPeriod(expense.dataCompetencia));
        const receiptTotalBySession = new Map<number, number>();
        for (const payment of receivedPayments) {
          const sessionId = accountById.get(payment.contaReceberId)?.sessaoId;
          if (sessionId) receiptTotalBySession.set(sessionId, (receiptTotalBySession.get(sessionId) ?? 0) + Number(payment.valor));
        }
        const servicesReport = new Map<number, { servicoId: number; nome: string; agendados: number; realizados: number; cancelados: number; previsto: number; recebido: number }>();
        for (const session of sessions.filter((item) => inPeriod(item.dataHoraInicio))) {
          const service = serviceById.get(session.servicoId);
          if (!service) continue;
          const row = servicesReport.get(service.id) ?? { servicoId: service.id, nome: service.nome, agendados: 0, realizados: 0, cancelados: 0, previsto: 0, recebido: 0 };
          row.agendados += 1;
          row.realizados += session.status === "CONCLUIDA" ? 1 : 0;
          row.cancelados += ["CANCELADA", "NAO_COMPARECEU"].includes(session.status) ? 1 : 0;
          row.previsto += Number(service.valor);
          row.recebido += receiptTotalBySession.get(session.id) ?? 0;
          servicesReport.set(service.id, row);
        }
        const receivedTotal = receivedPayments.reduce((sum, payment) => sum + Number(payment.valor), 0);
        const paidTotal = paidExpenses.reduce((sum, expense) => sum + Number(expense.valor), 0);
        return {
          periodo: input,
          resumo: {
            aReceber: openReceivables.reduce((sum, account) => sum + Number(account.valorFinal), 0),
            recebido: receivedTotal,
            recebidoDinheiro: receivedPayments.filter((payment) => payment.tipoPagamento === "DINHEIRO").reduce((sum, payment) => sum + Number(payment.valor), 0),
            recebidoPix: receivedPayments.filter((payment) => payment.tipoPagamento === "PIX").reduce((sum, payment) => sum + Number(payment.valor), 0),
            cartaoPendente: pendingCardPayments.reduce((sum, payment) => sum + Number(payment.valor), 0),
            aPagar: openPayables.reduce((sum, expense) => sum + Number(expense.valor), 0),
            pago: paidTotal,
            comissoesPendentes: periodCommissions.filter((commission) => commission.status === "PENDENTE").reduce((sum, commission) => sum + Number(commission.valor), 0),
            comissoesPagas: periodCommissions.filter((commission) => commission.status === "PAGA").reduce((sum, commission) => sum + Number(commission.valor), 0),
            resultadoCaixa: receivedPayments.filter((payment) => payment.tipoPagamento === "DINHEIRO").reduce((sum, payment) => sum + Number(payment.valor), 0) - paidTotal,
            resultadoDisponivel: receivedTotal - paidTotal,
          },
          contasReceber: openReceivables.map((account) => ({ id: account.id, descricao: account.descricao, cliente: customerName.get(account.clienteId) ?? "Cliente", vencimento: account.dataVencimento, valor: Number(account.valorFinal), status: account.status })),
          recebimentos: receivedPayments.map((payment) => ({ id: payment.id, data: payment.dataLiquidacao ?? payment.createdAt, cliente: customerName.get(payment.clienteId) ?? "Cliente", descricao: accountById.get(payment.contaReceberId)?.descricao ?? "Recebimento", valor: Number(payment.valor), tipoPagamento: payment.tipoPagamento, statusLiquidacao: payment.statusLiquidacao })),
          cartoesPendentes: pendingCardPayments.map((payment) => ({ id: payment.id, previstoPara: payment.dataPrevistaLiquidacao, cliente: customerName.get(payment.clienteId) ?? "Cliente", descricao: accountById.get(payment.contaReceberId)?.descricao ?? "Recebimento", valor: Number(payment.valor), tipoPagamento: payment.tipoPagamento })),
          contasPagar: openPayables.map((expense) => ({ id: expense.id, descricao: expense.descricao, categoria: expense.categoria, vencimento: expense.dataCompetencia, valor: Number(expense.valor), status: expense.status })),
          pagamentos: paidExpenses.map((expense) => ({ id: expense.id, data: expense.pagoEm!, descricao: expense.descricao, categoria: expense.categoria, valor: Number(expense.valor) })),
          comissoes: periodCommissions.map((commission) => ({ id: commission.id, geradaEm: commission.geradaEm, pagaEm: commission.pagaEm, profissional: professionalList.find((professional) => professional.id === commission.profissionalId)?.name ?? "Profissional", tipoComissao: commission.tipoComissao, percentual: Number(commission.percentual), valorRegra: Number(commission.valorRegra), valor: Number(commission.valor), status: commission.status })).sort((a, b) => b.geradaEm.getTime() - a.geradaEm.getTime()),
          servicos: Array.from(servicesReport.values()).sort((a, b) => b.recebido - a.recebido || b.previsto - a.previsto),
        };
      }),
    dashboardStats: staffProcedure.query(async ({ ctx }) => {
      const db = requireDatabase(await getDb()); const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const end = new Date(start.getTime() + 86400000);
      const [todaySessions, allCustomers, payments, birthdates] = await Promise.all([
        db.select().from(sessoes).where(and(eq(sessoes.clinicaId, ctx.clinicaId), gte(sessoes.dataHoraInicio, start), lte(sessoes.dataHoraInicio, end), ...(ctx.user.role === "profissional" ? [eq(sessoes.profissionalId, ctx.user.id)] : []))),
        db.select({ id: clientes.id }).from(clientes).where(and(eq(clientes.clinicaId, ctx.clinicaId), eq(clientes.status, "ATIVO"))), db.select().from(recebimentos).where(eq(recebimentos.clinicaId, ctx.clinicaId)), db.select({ id: clientes.id, nome: clientes.nome, dataNascimento: clientes.dataNascimento }).from(clientes).where(eq(clientes.clinicaId, ctx.clinicaId)),
      ]);
      const monthRevenue = payments.filter((payment) => payment.createdAt.getMonth() === now.getMonth() && payment.createdAt.getFullYear() === now.getFullYear()).reduce((sum, payment) => sum + Number(payment.valor), 0);
      const attended = todaySessions.filter((session) => session.status === "CONCLUIDA").length;
      const confirmed = todaySessions.filter((session) => ["CONFIRMADA", "EM_ATENDIMENTO", "CONCLUIDA"].includes(session.status)).length;
      const birthdayKey = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const aniversariantes = birthdates.filter((client) => client.dataNascimento?.slice(5) === birthdayKey).map((client) => client.nome);
      return { faturamentoMes: monthRevenue, agendamentosHoje: todaySessions.length, sessoesRealizadas: attended, clientesTotal: allCustomers.length, taxaOcupacao: todaySessions.length ? Math.round((confirmed / todaySessions.length) * 100) : 0, aniversariantes, proximasSessoes: todaySessions.filter((session) => session.status !== "CANCELADA" && session.status !== "NAO_COMPARECEU").slice(0, 8) };
    }),
  }),

  settings: router({
    get: publicProcedure.input(publicClinicInput).query(async ({ input }) => {
      const db = requireDatabase(await getDb());
      const clinic = (await db.select({ id: clinicas.id }).from(clinicas).where(and(eq(clinicas.slug, input.clinicaSlug), eq(clinicas.ativa, true))).limit(1))[0];
      if (!clinic) throw new TRPCError({ code: "NOT_FOUND", message: "Clínica não encontrada." });
      const row = (await db.select().from(clinicSettings).where(eq(clinicSettings.clinicaId, clinic.id)).limit(1))[0];
      return row ?? {
        id: 1,
        nome: "SunSet",
        razaoSocial: "",
        segmento: "",
        slogan: "Seu cuidado, seu momento",
        logoUrl: "/assets/logo-sunset.svg",
        corPrimaria: "#C8627A",
        corSecundaria: "#8F3B50",
        endereco: "",
        cep: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        telefone: "",
        whatsapp: "",
        cnpj: "",
        emailContato: "",
      };
    }),
    getAtual: protectedProcedure.query(async ({ ctx }) => {
      const db = requireDatabase(await getDb());
      const row = (await db.select().from(clinicSettings).where(eq(clinicSettings.clinicaId, ctx.clinicaId)).limit(1))[0];
      const clinicRow = (await db.select({ slug: clinicas.slug }).from(clinicas).where(eq(clinicas.id, ctx.clinicaId)).limit(1))[0];
      const slug = clinicRow?.slug ?? "clinica-principal";
      return {
        ...(row ?? {
          id: 1,
          clinicaId: ctx.clinicaId,
          nome: "SunSet",
          razaoSocial: "",
          segmento: "",
          slogan: "Seu cuidado, seu momento",
          logoUrl: "/assets/logo-sunset.svg",
          corPrimaria: "#C8627A",
          corSecundaria: "#8F3B50",
          endereco: "",
          cep: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          estado: "",
          telefone: "",
          whatsapp: "",
          cnpj: "",
          emailContato: "",
        }),
        slug,
      };
    }),
    getMessaging: adminOnlyProcedure.query(async ({ ctx }) => {
      const db = requireDatabase(await getDb());
      const row = (await db.select().from(clinicMessagingSettings).where(eq(clinicMessagingSettings.clinicaId, ctx.clinicaId)).limit(1))[0];
      let apiKeyMasked = "";
      if (row?.brevoApiKeyEncrypted) {
        try { apiKeyMasked = maskSecret(decryptSecret(row.brevoApiKeyEncrypted)); } catch { apiKeyMasked = "configurada"; }
      }
      return {
        brevoFromEmail: row?.brevoFromEmail ?? "",
        brevoFromName: row?.brevoFromName ?? "",
        brevoReplyTo: row?.brevoReplyTo ?? "",
        brevoSmsSender: row?.brevoSmsSender ?? "",
        brevoWhatsappSender: row?.brevoWhatsappSender ?? "",
        brevoWhatsappTemplateId: row?.brevoWhatsappTemplateId ?? "",
        emailAtivo: row?.emailAtivo ?? true,
        smsAtivo: row?.smsAtivo ?? false,
        whatsappAtivo: row?.whatsappAtivo ?? false,
        apiKeyConfigured: Boolean(row?.brevoApiKeyEncrypted),
        apiKeyMasked,
      };
    }),
    updateMessaging: adminOnlyProcedure.input(z.object({
      apiKey: z.string().trim().min(10).max(300).optional().or(z.literal("")),
      fromEmail: z.string().trim().email("Informe um e-mail remetente válido.").or(z.literal("")),
      fromName: z.string().trim().max(120).optional(),
      replyTo: z.string().trim().email("Informe um e-mail de resposta válido.").or(z.literal("")),
      smsSender: z.string().trim().max(32).optional(),
      whatsappSender: z.string().trim().max(32).optional(),
      whatsappTemplateId: z.string().trim().regex(/^$|^\d+$/).max(32).optional(),
      emailAtivo: z.boolean().default(true),
      smsAtivo: z.boolean().default(false),
      whatsappAtivo: z.boolean().default(false),
    })).mutation(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb());
      const existing = (await db.select().from(clinicMessagingSettings).where(eq(clinicMessagingSettings.clinicaId, ctx.clinicaId)).limit(1))[0];
      const encryptedApiKey = input.apiKey ? encryptSecret(input.apiKey) : existing?.brevoApiKeyEncrypted ?? null;
      const values = {
        clinicaId: ctx.clinicaId,
        brevoApiKeyEncrypted: encryptedApiKey,
        brevoFromEmail: input.fromEmail || null,
        brevoFromName: input.fromName || null,
        brevoReplyTo: input.replyTo || null,
        brevoSmsSender: input.smsSender || null,
        brevoWhatsappSender: input.whatsappSender || null,
        brevoWhatsappTemplateId: input.whatsappTemplateId || null,
        emailAtivo: input.emailAtivo,
        smsAtivo: input.smsAtivo,
        whatsappAtivo: input.whatsappAtivo,
        atualizadoPor: ctx.user.id,
      };
      if (existing) await db.update(clinicMessagingSettings).set(values).where(and(eq(clinicMessagingSettings.id, existing.id), eq(clinicMessagingSettings.clinicaId, ctx.clinicaId)));
      else await db.insert(clinicMessagingSettings).values(values);
      await audit(ctx.user.id, "clinic_messaging_settings", "ATUALIZADO", existing?.id ?? undefined, undefined, { ...input, apiKey: input.apiKey ? "[CONFIGURADA]" : "[PRESERVADA]" });
      return { success: true } as const;
    }),
    testMessaging: adminOnlyProcedure.mutation(async ({ ctx }) => {
      const db = requireDatabase(await getDb());
      const row = (await db.select().from(clinicMessagingSettings).where(eq(clinicMessagingSettings.clinicaId, ctx.clinicaId)).limit(1))[0];
      const apiKey = row?.brevoApiKeyEncrypted ? decryptSecret(row.brevoApiKeyEncrypted) : null;
      if (!apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Configure a API key do Brevo antes de testar a conexão." });
      const response = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": apiKey, accept: "application/json" } });
      if (!response.ok) throw new TRPCError({ code: "BAD_REQUEST", message: `O Brevo recusou a conexão (${response.status}).` });
      const account = await response.json() as { email?: string; companyName?: string };
      return { success: true, accountEmail: account.email ?? null, accountName: account.companyName ?? null } as const;
    }),
    uploadLogo: adminOnlyProcedure.input(z.object({ dataUrl: z.string().min(20) })).mutation(async ({ input, ctx }) => {
      const image = decodeImage(input.dataUrl);
      const uploaded = await storagePut(`clinica/${ctx.clinicaId}/clinic-assets/logo.${image.extension}`, image.buffer, image.contentType);
      return { success: true, url: uploaded.url } as const;
    }),
    update: adminOnlyProcedure.input(z.object({
      nome: z.string().trim().min(1).max(120),
      razaoSocial: z.string().trim().max(180).optional(),
      segmento: z.string().trim().max(100).optional(),
      slogan: z.string().trim().max(250).optional(),
      logoUrl: z.string().trim().max(2000).optional(),
      corPrimaria: z.string().trim().max(32).optional(),
      corSecundaria: z.string().trim().max(32).optional(),
      endereco: z.string().trim().max(1000).optional(),
      cep: z.string().trim().regex(/^$|^\d{5}-?\d{3}$/, "Informe um CEP válido.").optional(),
      numero: z.string().trim().max(20).optional(),
      complemento: z.string().trim().max(120).optional(),
      bairro: z.string().trim().max(100).optional(),
      cidade: z.string().trim().max(100).optional(),
      estado: z.string().trim().regex(/^$|^[A-Za-z]{2}$/, "Informe a UF com duas letras.").optional(),
      telefone: z.string().trim().regex(/^$|^[+()\d\s-]{8,32}$/, "Informe um telefone válido.").optional(),
      whatsapp: z.string().trim().regex(/^$|^[+()\d\s-]{8,32}$/, "Informe um WhatsApp válido.").optional(),
      cnpj: z.string().trim().regex(/^$|^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, "Informe um CNPJ válido.").optional(),
      emailContato: z.string().trim().max(320).email("Informe um e-mail válido.").or(z.literal("")).optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb());
      const existing = (await db.select().from(clinicSettings).where(eq(clinicSettings.clinicaId, ctx.clinicaId)).limit(1))[0];
      if (existing) {
        await db.update(clinicSettings).set({
          ...input,
          atualizadoPor: ctx.user.id,
        }).where(eq(clinicSettings.id, existing.id));
      } else {
        await db.insert(clinicSettings).values({
          clinicaId: ctx.clinicaId,
          ...input,
          atualizadoPor: ctx.user.id,
        });
      }
      await audit(ctx.user.id, "clinic_settings", "ATUALIZADO", existing?.id ?? 1, undefined, input);
      return { success: true };
    }),
    firstAccessSetup: adminOnlyProcedure.input(z.object({
      clinicaNome: z.string().trim().min(2).max(120),
      clinicaSlug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido. Use apenas letras, números e hífens.").optional(),
      adminNome: z.string().trim().min(2).max(120),
      adminEmail: emailInput,
      adminSenha: localPassword,
    })).mutation(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb());
      
      // Gerar slug único se não fornecido
      let newSlug = input.clinicaSlug;
      if (!newSlug) {
        const baseSlug = input.clinicaNome
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        
        newSlug = baseSlug;
        let counter = 1;
        
        while (true) {
          const existing = await db.select({ id: clinicas.id }).from(clinicas).where(eq(clinicas.slug, newSlug)).limit(1);
          if (!existing.length) break;
          newSlug = `${baseSlug}-${counter}`;
          counter++;
        }
      }
      
      // Verificar se o slug já existe (se fornecido manualmente)
      if (input.clinicaSlug) {
        const existingSlug = await db.select({ id: clinicas.id }).from(clinicas).where(eq(clinicas.slug, newSlug)).limit(1);
        if (existingSlug.length && existingSlug[0].id !== ctx.clinicaId) {
          throw new TRPCError({ code: "CONFLICT", message: "Este slug já está em uso por outra clínica." });
        }
      }
      
      // Atualizar clínica
      await db.update(clinicas).set({
        nome: input.clinicaNome,
        slug: newSlug,
      }).where(eq(clinicas.id, ctx.clinicaId));
      
      // Actualizar configuración de la clínica
      const existingSettings = await db.select().from(clinicSettings).where(eq(clinicSettings.clinicaId, ctx.clinicaId)).limit(1);
      if (existingSettings.length) {
        await db.update(clinicSettings).set({
          nome: input.clinicaNome,
          atualizadoPor: ctx.user.id,
        }).where(eq(clinicSettings.id, existingSettings[0].id));
      } else {
        await db.insert(clinicSettings).values({
          clinicaId: ctx.clinicaId,
          nome: input.clinicaNome,
          atualizadoPor: ctx.user.id,
        });
      }
      
      // Resolver al gestor/administrador de la clínica objetivo (no a la cuenta del consultor master)
      if (ctx.clinicaId <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Primeiro selecione o ambiente (clínica) a configurar." });
      const passwordHash = await bcrypt.hash(input.adminSenha, 12);
      const adminOfClinic = (await db.select().from(users).where(and(eq(users.clinicaId, ctx.clinicaId), eq(users.role, "admin"))).limit(1))[0];
      const emailOwner = await db.select({ id: users.id, clinicaId: users.clinicaId }).from(users).where(eq(users.email, input.adminEmail)).limit(1);
      if (emailOwner.length && emailOwner[0].id !== adminOfClinic?.id) {
        throw new TRPCError({ code: "CONFLICT", message: "Este e-mail já está em uso por outro usuário do sistema." });
      }
      if (adminOfClinic) {
        await db.update(users).set({
          name: input.adminNome,
          email: input.adminEmail,
          passwordHash,
          passwordUpdatedAt: new Date(),
        }).where(eq(users.id, adminOfClinic.id));
      } else {
        await db.insert(users).values({
          clinicaId: ctx.clinicaId,
          openId: `local:${nanoid(21)}`,
          name: input.adminNome,
          email: input.adminEmail,
          role: "admin",
          passwordHash,
          passwordUpdatedAt: new Date(),
          loginMethod: "local",
          ativo: true,
        });
      }
      
      await audit(ctx.user.id, "clinica", "CONFIGURACION_INICIAL", ctx.clinicaId, undefined, {
        clinicaNome: input.clinicaNome,
        clinicaSlug: newSlug,
        adminNome: input.adminNome,
        adminEmail: input.adminEmail,
      });
      
      return {
        success: true,
        clinicaSlug: newSlug,
        bookingUrl: `/agendar?clinica=${newSlug}`,
      };
    }),
  }),

  administracaoDados: router({
    limparOperacao: adminOnlyProcedure.input(z.object({
      senha: z.string().min(1, "Informe sua senha para confirmar."),
      confirmacao: z.literal("LIMPAR DADOS", { message: "Digite LIMPAR DADOS para confirmar." }),
    })).mutation(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb());
      const gestor = (await db.select({ passwordHash: users.passwordHash }).from(users).where(and(eq(users.id, ctx.user.id), eq(users.clinicaId, ctx.clinicaId))).limit(1))[0];
      if (!gestor?.passwordHash || !(await bcrypt.compare(input.senha, gestor.passwordHash))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Senha do gestor inválida." });
      }
      await db.transaction(async (tx) => {
        await tx.delete(auditoria).where(eq(auditoria.clinicaId, ctx.clinicaId));
        await tx.delete(lembretes).where(eq(lembretes.clinicaId, ctx.clinicaId));
        await tx.delete(recebimentos).where(eq(recebimentos.clinicaId, ctx.clinicaId));
        await tx.delete(comissoes).where(eq(comissoes.clinicaId, ctx.clinicaId));
        await tx.delete(contasReceber).where(eq(contasReceber.clinicaId, ctx.clinicaId));
        await tx.delete(despesas).where(eq(despesas.clinicaId, ctx.clinicaId));
        await tx.delete(fotosProntuario).where(eq(fotosProntuario.clinicaId, ctx.clinicaId));
        await tx.delete(evolucoes).where(eq(evolucoes.clinicaId, ctx.clinicaId));
        await tx.delete(respostas).where(eq(respostas.clinicaId, ctx.clinicaId));
        await tx.delete(respostasQuestionario).where(eq(respostasQuestionario.clinicaId, ctx.clinicaId));
        await tx.delete(publicBookingTokens).where(eq(publicBookingTokens.clinicaId, ctx.clinicaId));
        await tx.delete(sessoes).where(eq(sessoes.clinicaId, ctx.clinicaId));
        await tx.delete(prontuarios).where(eq(prontuarios.clinicaId, ctx.clinicaId));
        await tx.delete(clientes).where(eq(clientes.clinicaId, ctx.clinicaId));
        await tx.delete(caixasDiarios).where(eq(caixasDiarios.clinicaId, ctx.clinicaId));
      });
      await audit(ctx.user.id, "administracao_dados", "LIMPEZA_OPERACIONAL", 0, undefined, { preservados: ["usuarios", "configuracoes", "servicos", "profissionais", "salas", "equipamentos", "insumos"] });
      return { success: true };
    }),
  }),

  agendamentoPublico: router({
    cadastro: publicProcedure.input(publicRegistrationInput).mutation(async ({ input }) => {
      const { db, clinic } = await resolvePublicClinic(input.clinicaSlug);
      const email = input.email ? input.email.toLowerCase() : null;
      const telefone = input.telefone?.trim() || null;
      const byEmail = email ? (await db.select().from(clientes).where(and(eq(clientes.clinicaId, clinic.id), eq(clientes.email, email))).limit(1))[0] : undefined;
      const byPhone = telefone ? (await db.select().from(clientes).where(and(eq(clientes.clinicaId, clinic.id), eq(clientes.telefone, telefone))).limit(1))[0] : undefined;
      if (byEmail && byPhone && byEmail.id !== byPhone.id) {
        throw new TRPCError({ code: "CONFLICT", message: "Os dados informados correspondem a cadastros diferentes. Entre em contato com a clínica para unificá-los." });
      }
      const existing = byEmail ?? byPhone;
      const consentedAt = new Date();
      const clientId = existing?.id ?? (await db.insert(clientes).values({
        clinicaId: clinic.id,
        nome: input.nome,
        email,
        telefone,
        canalPreferido: input.canalPreferido,
        consentimentoDadosEm: consentedAt,
        optInComunicacao: true,
      }))[0].insertId;

      if (existing) {
        if (existing.status === "BLOQUEADO") throw new TRPCError({ code: "FORBIDDEN", message: "Este cadastro não está disponível para agendamento on-line. Entre em contato com a clínica." });
        await db.update(clientes).set({
          nome: input.nome,
          email: email ?? existing.email,
          telefone: telefone ?? existing.telefone,
          canalPreferido: input.canalPreferido,
          consentimentoDadosEm: consentedAt,
          optInComunicacao: true,
          status: "ATIVO",
        }).where(and(eq(clientes.id, existing.id), eq(clientes.clinicaId, clinic.id)));
      } else {
        await db.insert(prontuarios).values({ clinicaId: clinic.id, clienteId: clientId });
      }

      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 4 * 60 * 60_000);
      await db.insert(publicBookingTokens).values({ clinicaId: clinic.id, clienteId: clientId, tokenHash: publicBookingTokenHash(token), expiresAt });
      await db.insert(auditoria).values({
        clinicaId: clinic.id,
        usuarioId: null,
        clienteId: clientId,
        entidade: "agendamento_publico",
        entidadeId: clientId,
        acao: existing ? "CADASTRO_ATUALIZADO" : "CADASTRO_CRIADO",
        dadosDepoisJson: JSON.stringify({ canalPreferido: input.canalPreferido, consentimentoDadosEm: consentedAt.toISOString() }),
      });
      return { success: true, token, clienteNome: input.nome, expiraEm: expiresAt };
    }),

    opcoes: publicProcedure.input(publicClinicInput).query(async ({ input }) => {
      const { db, clinic } = await resolvePublicClinic(input.clinicaSlug);
      const [serviceList, professionalList] = await Promise.all([
        db.select({ id: servicos.id, nome: servicos.nome, descricao: servicos.descricao, duracaoMin: servicos.duracaoMin, valor: servicos.valor }).from(servicos).where(and(eq(servicos.clinicaId, clinic.id), eq(servicos.ativo, true))).orderBy(servicos.nome),
        db.select({ id: users.id, nome: users.name }).from(users).where(and(eq(users.clinicaId, clinic.id), eq(users.role, "profissional"), eq(users.ativo, true))).orderBy(users.name),
      ]);
      const links = await db.select().from(profissionaisServicos).where(and(eq(profissionaisServicos.clinicaId, clinic.id), eq(profissionaisServicos.ativo, true)));
      return {
        servicos: serviceList,
        profissionais: professionalList,
        vinculosProfissionais: links.map((link) => ({ profissionalId: link.profissionalId, servicoId: link.servicoId })),
      };
    }),

    questionarios: publicProcedure.input(z.object({ token: z.string().min(20).max(128) })).query(async ({ input }) => {
      const { db, client, bookingSession } = await resolvePublicBookingSession(input.token);
      const published = await db.select().from(questionarios).where(and(eq(questionarios.clinicaId, bookingSession.clinicaId), eq(questionarios.ativo, true), isNull(questionarios.servicoId))).orderBy(questionarios.nome);
      const answered = await db.select({ questionarioId: respostasQuestionario.questionarioId, versaoQuestionario: respostasQuestionario.versaoQuestionario }).from(respostasQuestionario).where(and(eq(respostasQuestionario.clinicaId, bookingSession.clinicaId), eq(respostasQuestionario.clienteId, client.id)));
      const results = await Promise.all(published.map(async (questionnaire) => {
        const links = await db.select().from(questionarioPerguntas).where(and(eq(questionarioPerguntas.clinicaId, bookingSession.clinicaId), eq(questionarioPerguntas.questionarioId, questionnaire.id))).orderBy(questionarioPerguntas.ordem);
        const questionIds = links.map((link) => link.perguntaId);
        const items = questionIds.length ? await db.select().from(perguntas).where(and(eq(perguntas.clinicaId, bookingSession.clinicaId), inArray(perguntas.id, questionIds))) : [];
        return {
          id: questionnaire.id,
          nome: questionnaire.nome,
          descricao: questionnaire.descricao,
          versao: questionnaire.versao,
          respondido: answered.some((answer) => answer.questionarioId === questionnaire.id && answer.versaoQuestionario === questionnaire.versao),
          perguntas: links.map((link) => {
            const item = items.find((question) => question.id === link.perguntaId);
            return item ? { id: item.id, texto: item.texto, tipoResposta: item.tipoResposta, opcoesJson: item.opcoesJson, obrigatoria: link.obrigatoria, ordem: link.ordem } : null;
          }).filter((item): item is NonNullable<typeof item> => item !== null),
        };
      }));
      return results;
    }),

    responderAnamnese: publicProcedure.input(z.object({
      token: z.string().min(20).max(128),
      questionarioId: z.number().int().positive(),
      declaracaoVeracidade: z.literal(true),
      assinaturaDigital: z.string().trim().min(3).max(180),
      respostas: z.array(z.object({
        perguntaId: z.number().int().positive(),
        respostaTexto: z.string().max(8000).optional(),
        respostaBoolean: z.boolean().optional(),
        respostaNumero: z.string().regex(/^\d+(?:[.,]\d+)?$/).optional(),
        respostaData: z.string().max(16).optional(),
        respostaJson: z.string().max(8000).optional(),
      })).min(1),
    })).mutation(async ({ input }) => {
      const { db, client, bookingSession } = await resolvePublicBookingSession(input.token);
      if (normalizeName(input.assinaturaDigital) !== normalizeName(client.nome)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A assinatura deve corresponder ao nome informado no cadastro." });
      }
      const questionnaire = (await db.select().from(questionarios).where(and(eq(questionarios.id, input.questionarioId), eq(questionarios.clinicaId, bookingSession.clinicaId), eq(questionarios.ativo, true), isNull(questionarios.servicoId))).limit(1))[0];
      if (!questionnaire) throw new TRPCError({ code: "NOT_FOUND", message: "Questionário de anamnese não encontrado." });
      const links = await db.select().from(questionarioPerguntas).where(and(eq(questionarioPerguntas.clinicaId, bookingSession.clinicaId), eq(questionarioPerguntas.questionarioId, questionnaire.id)));
      const answerMap = new Map(input.respostas.map((answer) => [answer.perguntaId, answer]));
      const unansweredRequired = links.filter((link) => link.obrigatoria && !publicAnswerHasValue(answerMap.get(link.perguntaId) ?? {}));
      if (unansweredRequired.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Responda todas as perguntas obrigatórias para continuar." });
      const knownQuestionIds = new Set(links.map((link) => link.perguntaId));
      const validAnswers = input.respostas.filter((answer) => knownQuestionIds.has(answer.perguntaId));
      if (!validAnswers.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma resposta válida foi informada." });
      const existing = (await db.select({ id: respostasQuestionario.id }).from(respostasQuestionario)
        .where(and(eq(respostasQuestionario.clinicaId, bookingSession.clinicaId), eq(respostasQuestionario.clienteId, client.id), eq(respostasQuestionario.questionarioId, questionnaire.id), eq(respostasQuestionario.versaoQuestionario, questionnaire.versao))).limit(1))[0];
      if (existing) return { success: true, id: existing.id, existente: true };
      const [created] = await db.insert(respostasQuestionario).values({
        clinicaId: bookingSession.clinicaId,
        clienteId: client.id,
        questionarioId: questionnaire.id,
        versaoQuestionario: questionnaire.versao,
        declaracaoVeracidade: true,
        assinaturaDigital: input.assinaturaDigital,
        respostasJson: JSON.stringify(validAnswers),
      });
      await db.insert(respostas).values(validAnswers.map((answer) => ({
        clinicaId: bookingSession.clinicaId,
        respostaQuestionarioId: created.insertId,
        perguntaId: answer.perguntaId,
        respostaTexto: answer.respostaTexto ?? null,
        respostaBoolean: answer.respostaBoolean ?? null,
        respostaNumero: answer.respostaNumero ? toCurrency(answer.respostaNumero) : null,
        respostaData: answer.respostaData ?? null,
        respostaJson: answer.respostaJson ?? null,
      })));
      await db.insert(auditoria).values({ clinicaId: bookingSession.clinicaId, usuarioId: null, clienteId: client.id, entidade: "questionario", entidadeId: created.insertId, acao: "RESPONDIDO_PUBLICAMENTE" });
      return { success: true, id: created.insertId, existente: false };
    }),

    disponibilidade: publicProcedure.input(publicClinicInput.extend({
      profissionalId: z.number().int().positive(),
      servicoId: z.number().int().positive(),
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })).query(async ({ input }) => {
      const { db, clinic } = await resolvePublicClinic(input.clinicaSlug);
      const start = new Date(`${input.data}T00:00:00`);
      const end = new Date(start.getTime() + 24 * 60 * 60_000);
      const service = (await db.select({ duracaoMin: servicos.duracaoMin }).from(servicos).where(and(eq(servicos.id, input.servicoId), eq(servicos.clinicaId, clinic.id), eq(servicos.ativo, true))).limit(1))[0];
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Serviço não encontrado ou indisponível." });
      const busy = await db.select({ dataHoraInicio: sessoes.dataHoraInicio, dataHoraFim: sessoes.dataHoraFim }).from(sessoes)
        .where(and(eq(sessoes.clinicaId, clinic.id), eq(sessoes.profissionalId, input.profissionalId), lt(sessoes.dataHoraInicio, end), gt(sessoes.dataHoraFim, start), inArray(sessoes.status, ["PENDENTE", "AGUARDANDO_CONFIRMACAO", "CONFIRMADA", "EM_ATENDIMENTO"])));
      return { slots: publicAvailableSlots(input.data, service.duracaoMin, busy) };
    }),

    solicitar: publicProcedure.input(z.object({
      token: z.string().min(20).max(128),
      servicoId: z.number().int().positive(),
      profissionalId: z.number().int().positive(),
      dataHoraInicio: z.coerce.date(),
      timeZone: z.string().trim().min(1).max(64).optional(),
    })).mutation(async ({ input }) => {
      const { db, client, bookingSession } = await resolvePublicBookingSession(input.token);
      if (input.dataHoraInicio.getTime() < Date.now() + 15 * 60_000) throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha um horário com pelo menos 15 minutos de antecedência." });
      const service = (await db.select().from(servicos).where(and(eq(servicos.id, input.servicoId), eq(servicos.clinicaId, bookingSession.clinicaId), eq(servicos.ativo, true))).limit(1))[0];
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Serviço não encontrado ou indisponível." });
      const professional = (await db.select().from(users).where(and(eq(users.id, input.profissionalId), eq(users.clinicaId, bookingSession.clinicaId), eq(users.role, "profissional"), eq(users.ativo, true))).limit(1))[0];
      if (!professional) throw new TRPCError({ code: "NOT_FOUND", message: "Profissional não disponível para agendamento." });
      const serviceLinks = await db.select().from(profissionaisServicos).where(and(eq(profissionaisServicos.clinicaId, bookingSession.clinicaId), eq(profissionaisServicos.servicoId, service.id), eq(profissionaisServicos.ativo, true)));
      if (serviceLinks.length && !serviceLinks.some((link) => link.profissionalId === professional.id)) throw new TRPCError({ code: "BAD_REQUEST", message: "O profissional selecionado não atende este serviço." });
      const requiredQuestionnaires = await db.select({ id: questionarios.id, versao: questionarios.versao }).from(questionarios).where(and(eq(questionarios.clinicaId, bookingSession.clinicaId), eq(questionarios.ativo, true), isNull(questionarios.servicoId)));
      if (!requiredQuestionnaires.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A clínica ainda não disponibilizou a anamnese obrigatória para agendamento on-line." });
      const answered = await db.select({ questionarioId: respostasQuestionario.questionarioId, versaoQuestionario: respostasQuestionario.versaoQuestionario }).from(respostasQuestionario).where(and(eq(respostasQuestionario.clinicaId, bookingSession.clinicaId), eq(respostasQuestionario.clienteId, client.id)));
      if (filterPendingQuestionnaires(requiredQuestionnaires, answered).length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Conclua a anamnese obrigatória antes de solicitar o agendamento." });
      const dataHoraFim = new Date(input.dataHoraInicio.getTime() + service.duracaoMin * 60_000);
      const active = await db.select().from(sessoes).where(and(eq(sessoes.clinicaId, bookingSession.clinicaId), inArray(sessoes.status, ["PENDENTE", "AGUARDANDO_CONFIRMACAO", "CONFIRMADA", "EM_ATENDIMENTO"])));
      if (hasScheduleConflict(active, { profissionalId: professional.id, dataHoraInicio: input.dataHoraInicio, dataHoraFim })) throw new TRPCError({ code: "CONFLICT", message: "Este horário acabou de ser ocupado. Escolha outra opção." });
      const [created] = await db.insert(sessoes).values({
        clinicaId: bookingSession.clinicaId,
        clienteId: client.id,
        servicoId: service.id,
        profissionalId: professional.id,
        dataHoraInicio: input.dataHoraInicio,
        dataHoraFim,
        duracaoMin: service.duracaoMin,
        status: "AGUARDANDO_CONFIRMACAO",
      });
      await db.insert(contasReceber).values({ clinicaId: bookingSession.clinicaId, clienteId: client.id, sessaoId: created.insertId, descricao: `Serviço: ${service.nome}`, valorOriginal: service.valor, valorFinal: service.valor, dataVencimento: input.dataHoraInicio.toISOString().slice(0, 10) });
      const confirmationAt = new Date();
      const reminderAt = new Date(input.dataHoraInicio.getTime() - 24 * 60 * 60_000);
      const brevoConfig = await clinicBrevoConfig(bookingSession.clinicaId);
      const clientDeliveryChannel = resolveReminderDeliveryChannel(client.canalPreferido, brevoConfig);
      if (clientDeliveryChannel === "EMAIL" && !client.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe um e-mail para receber as confirmações enquanto WhatsApp e SMS estiverem indisponíveis." });
      const fallbackNotice = deliveryFallbackNotice(client.canalPreferido, clientDeliveryChannel);
      const notifications: Array<{ clinicaId: number; sessaoId: number; destinatario: "CLIENTE" | "PROFISSIONAL"; canal: "EMAIL" | "WHATSAPP" | "SMS" | "INTERNO"; agendadoPara: Date; conteudo: string }> = [
        { clinicaId: bookingSession.clinicaId, sessaoId: created.insertId, destinatario: "CLIENTE" as const, canal: clientDeliveryChannel, agendadoPara: confirmationAt, conteudo: `${publicBookingConfirmationMessage(service.nome, input.dataHoraInicio, input.timeZone)}${fallbackNotice}` },
      ];
      if (reminderAt > confirmationAt) notifications.push(
        { clinicaId: bookingSession.clinicaId, sessaoId: created.insertId, destinatario: "CLIENTE" as const, canal: clientDeliveryChannel, agendadoPara: reminderAt, conteudo: `${publicBookingReminderMessage(input.dataHoraInicio, input.timeZone)}${fallbackNotice}` },
        { clinicaId: bookingSession.clinicaId, sessaoId: created.insertId, destinatario: "PROFISSIONAL" as const, canal: "INTERNO" as const, agendadoPara: reminderAt, conteudo: staffBookingReminderMessage(input.dataHoraInicio) },
      );
      await db.insert(lembretes).values(notifications);
      await db.update(publicBookingTokens).set({ usedAt: new Date() }).where(and(eq(publicBookingTokens.id, bookingSession.id), eq(publicBookingTokens.clinicaId, bookingSession.clinicaId)));
      await db.insert(auditoria).values({ clinicaId: bookingSession.clinicaId, usuarioId: null, clienteId: client.id, entidade: "sessao", entidadeId: created.insertId, acao: "SOLICITADA_PUBLICAMENTE", dadosDepoisJson: JSON.stringify({ servicoId: service.id, profissionalId: professional.id, dataHoraInicio: input.dataHoraInicio.toISOString(), timeZone: input.timeZone ?? CLINIC_TIME_ZONE }) });
      return { success: true, id: created.insertId, status: "AGUARDANDO_CONFIRMACAO" as const, servico: service.nome, profissional: professional.name, dataHoraInicio: input.dataHoraInicio };
    }),
  }),

  master: router({
    listAllClinics: masterProcedure.query(async () => {
      const db = requireDatabase(await getDb());
      return db.select().from(clinicas).where(eq(clinicas.ativa, true)).orderBy(clinicas.nome);
    }),
    switchClinic: masterProcedure.input(z.object({ clinicaId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const db = requireDatabase(await getDb());
      const clinic = await db.select().from(clinicas).where(eq(clinicas.id, input.clinicaId)).limit(1);
      if (!clinic || !clinic[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Clínica não encontrada." });
      setActiveClinicCookie(ctx.req, ctx.res, clinic[0].id);
      return { success: true, clinic: clinic[0] };
    }),
    currentClinic: masterProcedure.query(async ({ ctx }) => {
      const activeClinicId = getActiveClinicId(ctx.req);
      if (!activeClinicId) return null;
      const db = requireDatabase(await getDb());
      const clinic = (await db.select().from(clinicas).where(and(eq(clinicas.id, activeClinicId), eq(clinicas.ativa, true))).limit(1))[0];
      return clinic ?? null;
    }),
  }),

  portal: router({
    opcoesAgendamento: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "cliente" && ctx.user.role !== "user") throw new TRPCError({ code: "FORBIDDEN", message: "Este acesso é exclusivo do portal do cliente." });
      const db = requireDatabase(await getDb());
      const [serviceList, professionalList] = await Promise.all([
        db.select({ id: servicos.id, nome: servicos.nome, duracaoMin: servicos.duracaoMin, valor: servicos.valor }).from(servicos).where(and(eq(servicos.clinicaId, ctx.clinicaId), eq(servicos.ativo, true))).orderBy(servicos.nome),
        db.select({ id: users.id, name: users.name }).from(users).where(and(eq(users.clinicaId, ctx.clinicaId), eq(users.role, "profissional"))).orderBy(users.name),
      ]);
      return { servicos: serviceList, profissionais: professionalList };
    }),
    resumo: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "cliente" && ctx.user.role !== "user") throw new TRPCError({ code: "FORBIDDEN", message: "Este acesso é exclusivo do portal do cliente." });
      const clientId = await currentClientId(ctx.user.id, ctx.clinicaId);
      if (!clientId) return { vinculado: false, agendamentos: [], questionariosPendentes: [] };
      const db = requireDatabase(await getDb());
      const appointments = await db.select().from(sessoes).where(and(eq(sessoes.clinicaId, ctx.clinicaId), eq(sessoes.clienteId, clientId))).orderBy(sessoes.dataHoraInicio);
      const [published, answered] = await Promise.all([
        db.select().from(questionarios).where(and(eq(questionarios.clinicaId, ctx.clinicaId), eq(questionarios.ativo, true))),
        db.select({ questionarioId: respostasQuestionario.questionarioId, versaoQuestionario: respostasQuestionario.versaoQuestionario }).from(respostasQuestionario).where(and(eq(respostasQuestionario.clinicaId, ctx.clinicaId), eq(respostasQuestionario.clienteId, clientId))),
      ]);
      const pending = filterPendingQuestionnaires(published, answered);
      return { vinculado: true, clientId, agendamentos: appointments, questionariosPendentes: pending };
    }),
    solicitarAgendamento: protectedProcedure.input(z.object({ servicoId: z.number().int().positive(), profissionalId: z.number().int().positive(), dataHoraInicio: z.coerce.date(), duracaoMin: z.number().int().min(10).max(600), timeZone: z.string().trim().min(1).max(100).optional() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "cliente" && ctx.user.role !== "user") throw new TRPCError({ code: "FORBIDDEN", message: "Este acesso é exclusivo do portal do cliente." });
        const clientId = await currentClientId(ctx.user.id, ctx.clinicaId); if (!clientId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Seu acesso ainda não está vinculado a um cadastro de cliente." });
        const db = requireDatabase(await getDb()); const end = new Date(input.dataHoraInicio.getTime() + input.duracaoMin * 60_000);
        const [client, service, professional, serviceLink] = await Promise.all([
          db.select().from(clientes).where(and(eq(clientes.id, clientId), eq(clientes.clinicaId, ctx.clinicaId))).limit(1),
          db.select().from(servicos).where(and(eq(servicos.id, input.servicoId), eq(servicos.clinicaId, ctx.clinicaId), eq(servicos.ativo, true))).limit(1),
          db.select({ id: users.id }).from(users).where(and(eq(users.id, input.profissionalId), eq(users.clinicaId, ctx.clinicaId), eq(users.role, "profissional"), eq(users.ativo, true))).limit(1),
          db.select({ id: profissionaisServicos.id }).from(profissionaisServicos).where(and(eq(profissionaisServicos.clinicaId, ctx.clinicaId), eq(profissionaisServicos.profissionalId, input.profissionalId), eq(profissionaisServicos.servicoId, input.servicoId), eq(profissionaisServicos.ativo, true))).limit(1),
        ]);
        if (!client[0] || !service[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente ou procedimento não encontrado." });
        if (!professional[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Profissional não encontrado ou inativo." });
        const serviceLinks = await db.select({ id: profissionaisServicos.id }).from(profissionaisServicos).where(and(eq(profissionaisServicos.clinicaId, ctx.clinicaId), eq(profissionaisServicos.servicoId, input.servicoId), eq(profissionaisServicos.ativo, true))).limit(1);
        if (serviceLinks.length && !serviceLink[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "O profissional selecionado não atende este serviço." });
        const active = await db.select().from(sessoes).where(and(eq(sessoes.clinicaId, ctx.clinicaId), inArray(sessoes.status, ["PENDENTE", "AGUARDANDO_CONFIRMACAO", "CONFIRMADA", "EM_ATENDIMENTO"])));
        if (hasScheduleConflict(active, { profissionalId: input.profissionalId, dataHoraInicio: input.dataHoraInicio, dataHoraFim: end })) throw new TRPCError({ code: "CONFLICT", message: "Este horário acabou de ser ocupado. Escolha outra opção." });
        const [created] = await db.insert(sessoes).values({ clinicaId: ctx.clinicaId, servicoId: input.servicoId, profissionalId: input.profissionalId, dataHoraInicio: input.dataHoraInicio, duracaoMin: input.duracaoMin, clienteId: clientId, dataHoraFim: end, status: "PENDENTE" });
        const confirmationAt = new Date();
        const reminderAt = new Date(input.dataHoraInicio.getTime() - 24 * 60 * 60_000);
        const brevoConfig = await clinicBrevoConfig(ctx.clinicaId);
        const clientDeliveryChannel = resolveReminderDeliveryChannel(client[0].canalPreferido, brevoConfig);
        if (clientDeliveryChannel === "EMAIL" && !client[0].email) throw new TRPCError({ code: "BAD_REQUEST", message: "Cadastre um e-mail para receber as confirmações enquanto WhatsApp e SMS estiverem indisponíveis." });
        const fallbackNotice = deliveryFallbackNotice(client[0].canalPreferido, clientDeliveryChannel);
        const notifications = [{ clinicaId: ctx.clinicaId, sessaoId: created.insertId, destinatario: "CLIENTE" as const, canal: clientDeliveryChannel, agendadoPara: confirmationAt, conteudo: `${publicBookingConfirmationMessage(service[0].nome, input.dataHoraInicio, input.timeZone)}${fallbackNotice}` }];
        if (reminderAt > confirmationAt) notifications.push({ clinicaId: ctx.clinicaId, sessaoId: created.insertId, destinatario: "CLIENTE" as const, canal: clientDeliveryChannel, agendadoPara: reminderAt, conteudo: `${publicBookingReminderMessage(input.dataHoraInicio, input.timeZone)}${fallbackNotice}` });
        await db.insert(lembretes).values(notifications);
        await audit(ctx.user.id, "sessao", "SOLICITADA_PELO_PORTAL", created.insertId, clientId, { ...input, timeZone: input.timeZone ?? CLINIC_TIME_ZONE });
        return { success: true, id: created.insertId };
      }),
  }),
});

export type AppRouter = typeof appRouter;
