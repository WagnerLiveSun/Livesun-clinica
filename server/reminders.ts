import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { clientes, lembretes, sessoes, users } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { clinicBrevoConfig, environmentBrevoConfig, type BrevoConfig } from "./brevoConfig";

type BrevoRecipient = { email: string; name?: string };
type PhoneRecipient = { telefone: string; name?: string };
type ReminderChannel = "INTERNO" | "EMAIL" | "WHATSAPP" | "SMS";

export function normalizeBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12 && digits.length <= 15) return digits;
  throw new Error("Telefone inválido. Informe o número com DDD.");
}

export function automaticDeliveryIssue(channel: ReminderChannel, config = {
  smsSender: ENV.brevoSmsSender,
  whatsappSender: ENV.brevoWhatsappSender,
  whatsappTemplateId: ENV.brevoWhatsappTemplateId,
}) {
  if (channel === "WHATSAPP" && (!config.whatsappSender || !config.whatsappTemplateId || ("whatsappAtivo" in config && !config.whatsappAtivo))) return "O canal WhatsApp ainda não está ativado na conta Brevo da clínica.";
  if (channel === "SMS" && (!config.smsSender || ("smsAtivo" in config && !config.smsAtivo))) return "O canal SMS ainda não está ativado na conta Brevo da clínica.";
  return null;
}

export function resolveReminderDeliveryChannel(channel: ReminderChannel, config = {
  smsSender: ENV.brevoSmsSender,
  whatsappSender: ENV.brevoWhatsappSender,
  whatsappTemplateId: ENV.brevoWhatsappTemplateId,
}): ReminderChannel {
  return automaticDeliveryIssue(channel, config) ? "EMAIL" : channel;
}

export function parseBrevoSender(raw: string) {
  const matched = raw.trim().match(/^(.*?)\s*<([^<>\s]+@[^<>\s]+)>$/);
  const email = matched?.[2] ?? raw.trim();
  const name = matched?.[1]?.trim() || "SunSet";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("BREVO_FROM_EMAIL não contém um remetente válido.");
  return { email, name };
}

export function buildBrevoReminderPayload(recipient: BrevoRecipient, content: string, config: BrevoConfig = environmentBrevoConfig()) {
  return {
    sender: { ...parseBrevoSender(config.fromEmail), ...(config.fromName ? { name: config.fromName } : {}) },
    ...(config.replyTo ? { replyTo: { email: config.replyTo } } : {}),
    to: [{ email: recipient.email, ...(recipient.name ? { name: recipient.name } : {}) }],
    subject: "Lembrete de atendimento — SunSet",
    textContent: content,
    htmlContent: `<div style="font-family:Arial,sans-serif;color:#2c2627;line-height:1.5"><p style="color:#8f3156;font-weight:700;letter-spacing:.08em">SUNSET</p><h1 style="font-family:Georgia,serif;font-size:24px">Lembrete de atendimento</h1><p>${content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p><p style="color:#776d70;font-size:13px">Em caso de necessidade, entre em contato com a clínica.</p></div>`,
  };
}

export async function sendBrevoReminder(recipient: BrevoRecipient, content: string, config: BrevoConfig = environmentBrevoConfig()) {
  if (!config.apiKey) throw new Error("API key do Brevo não configurada.");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": config.apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(buildBrevoReminderPayload(recipient, content, config)),
  });
  if (!response.ok) throw new Error(`Brevo recusou o envio (${response.status}): ${(await response.text()).slice(0, 500)}`);
  return response.json().catch(() => ({}));
}

export function buildBrevoSmsPayload(recipient: PhoneRecipient, content: string, config: BrevoConfig = environmentBrevoConfig()) {
  if (!config.smsSender) throw new Error("Remetente SMS não configurado.");
  return { sender: config.smsSender, recipient: normalizeBrazilianPhone(recipient.telefone), content, type: "transactional", unicodeEnabled: true };
}

export async function sendBrevoSms(recipient: PhoneRecipient, content: string, config: BrevoConfig = environmentBrevoConfig()) {
  if (!config.apiKey) throw new Error("API key do Brevo não configurada.");
  const response = await fetch("https://api.brevo.com/v3/transactionalSMS/send", {
    method: "POST",
    headers: { "api-key": config.apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(buildBrevoSmsPayload(recipient, content, config)),
  });
  if (!response.ok) throw new Error(`Brevo recusou o SMS (${response.status}): ${(await response.text()).slice(0, 500)}`);
  return response.json().catch(() => ({}));
}

export function buildBrevoWhatsappPayload(recipient: PhoneRecipient, config: BrevoConfig = environmentBrevoConfig()) {
  if (!config.whatsappSender || !config.whatsappTemplateId) throw new Error("O remetente ou modelo WhatsApp do Brevo não está configurado.");
  const templateId = Number(config.whatsappTemplateId);
  if (!Number.isSafeInteger(templateId) || templateId <= 0) throw new Error("BREVO_WHATSAPP_TEMPLATE_ID deve ser um identificador numérico válido.");
  return { senderNumber: normalizeBrazilianPhone(ENV.brevoWhatsappSender), contactNumbers: [normalizeBrazilianPhone(recipient.telefone)], templateId };
}

export async function sendBrevoWhatsapp(recipient: PhoneRecipient, config: BrevoConfig = environmentBrevoConfig()) {
  if (!config.apiKey) throw new Error("API key do Brevo não configurada.");
  const response = await fetch("https://api.brevo.com/v3/whatsapp/sendMessage", {
    method: "POST",
    headers: { "api-key": config.apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(buildBrevoWhatsappPayload(recipient, config)),
  });
  if (!response.ok) throw new Error(`Brevo recusou o WhatsApp (${response.status}): ${(await response.text()).slice(0, 500)}`);
  return response.json().catch(() => ({}));
}

export async function dispatchDueReminderEmails() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível para processar lembretes.");
  const due = await db.select().from(lembretes)
    .where(and(eq(lembretes.status, "PENDENTE"), lte(lembretes.agendadoPara, new Date()), isNull(lembretes.enviadoEm)))
    .orderBy(lembretes.agendadoPara)
    .limit(50);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of due) {
    const claimed = await db.update(lembretes).set({ enviadoEm: new Date(), tentativas: sql`${lembretes.tentativas} + 1` })
      .where(and(eq(lembretes.id, reminder.id), eq(lembretes.status, "PENDENTE"), isNull(lembretes.enviadoEm)));
    if (!claimed[0].affectedRows) { skipped += 1; continue; }

    try {
      const session = (await db.select().from(sessoes).where(eq(sessoes.id, reminder.sessaoId)).limit(1))[0];
      if (!session) throw new Error("Sessão do lembrete não encontrada.");
      const requestedChannel = reminder.canal;
      const config = await clinicBrevoConfig(reminder.clinicaId);
      const deliveryChannel = resolveReminderDeliveryChannel(requestedChannel, config);
      if (deliveryChannel !== requestedChannel) console.info(`[Lembretes] Canal ${requestedChannel} indisponível; envio ${reminder.id} redirecionado para e-mail.`);
      const recipient = reminder.destinatario === "CLIENTE"
        ? (await db.select({ email: clientes.email, telefone: clientes.telefone, name: clientes.nome }).from(clientes).where(eq(clientes.id, session.clienteId)).limit(1))[0]
        : (await db.select({ email: users.email, telefone: sql<string | null>`NULL`, name: users.name }).from(users).where(eq(users.id, session.profissionalId)).limit(1))[0];
      if (deliveryChannel === "WHATSAPP") {
        if (!recipient?.telefone) throw new Error("Destinatário sem telefone cadastrado.");
        await sendBrevoWhatsapp({ telefone: recipient.telefone, name: recipient.name ?? undefined }, config);
      } else if (deliveryChannel === "SMS") {
        if (!recipient?.telefone) throw new Error("Destinatário sem telefone cadastrado.");
        await sendBrevoSms({ telefone: recipient.telefone, name: recipient.name ?? undefined }, reminder.conteudo, config);
      } else {
        if (!recipient?.email) throw new Error("Destinatário sem e-mail cadastrado.");
        await sendBrevoReminder({ email: recipient.email, name: recipient.name ?? undefined }, reminder.conteudo, config);
      }
      await db.update(lembretes).set({ status: "ENVIADO", enviadoEm: new Date() }).where(eq(lembretes.id, reminder.id));
      sent += 1;
    } catch (error) {
      await db.update(lembretes).set({ status: "FALHA", enviadoEm: null }).where(eq(lembretes.id, reminder.id));
      console.error(`[Lembretes] Falha ao enviar o lembrete ${reminder.id}:`, error);
      failed += 1;
    }
  }
  return { processed: due.length, sent, failed, skipped };
}
