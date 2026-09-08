import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { clinicMessagingSettings } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

const CIPHER_VERSION = "v1";
const ALGORITHM = "aes-256-gcm";

function masterKey() {
  if (!ENV.appMasterKey) throw new Error("APP_MASTER_KEY não configurada.");
  if (/^[0-9a-fA-F]{64}$/.test(ENV.appMasterKey)) return Buffer.from(ENV.appMasterKey, "hex");
  return createHash("sha256").update(ENV.appMasterKey, "utf8").digest();
}

export function encryptSecret(value: string) {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, masterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [CIPHER_VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) return null;
  const [version, ivEncoded, tagEncoded, encryptedEncoded] = value.split(":");
  if (version !== CIPHER_VERSION || !ivEncoded || !tagEncoded || !encryptedEncoded) throw new Error("Segredo Brevo inválido ou incompatível.");
  const decipher = createDecipheriv(ALGORITHM, masterKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedEncoded, "base64url")), decipher.final()]).toString("utf8");
}

export type BrevoConfig = {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  smsSender: string;
  whatsappSender: string;
  whatsappTemplateId: string;
  emailAtivo: boolean;
  smsAtivo: boolean;
  whatsappAtivo: boolean;
};

export function environmentBrevoConfig(): BrevoConfig {
  return {
    apiKey: ENV.brevoApiKey,
    fromEmail: ENV.brevoFromEmail,
    smsSender: ENV.brevoSmsSender,
    whatsappSender: ENV.brevoWhatsappSender,
    whatsappTemplateId: ENV.brevoWhatsappTemplateId,
    emailAtivo: true,
    smsAtivo: Boolean(ENV.brevoSmsSender),
    whatsappAtivo: Boolean(ENV.brevoWhatsappSender && ENV.brevoWhatsappTemplateId),
  };
}

export async function clinicBrevoConfig(clinicaId: number): Promise<BrevoConfig> {
  const fallback = environmentBrevoConfig();
  const db = await getDb();
  if (!db) return fallback;
  const row = (await db.select().from(clinicMessagingSettings).where(eq(clinicMessagingSettings.clinicaId, clinicaId)).limit(1))[0];
  if (!row) return fallback;
  return {
    apiKey: row.brevoApiKeyEncrypted ? decryptSecret(row.brevoApiKeyEncrypted) ?? "" : fallback.apiKey,
    fromEmail: row.brevoFromEmail ?? fallback.fromEmail,
    fromName: row.brevoFromName ?? undefined,
    replyTo: row.brevoReplyTo ?? undefined,
    smsSender: row.brevoSmsSender ?? "",
    whatsappSender: row.brevoWhatsappSender ?? "",
    whatsappTemplateId: row.brevoWhatsappTemplateId ?? "",
    emailAtivo: row.emailAtivo,
    smsAtivo: row.smsAtivo,
    whatsappAtivo: row.whatsappAtivo,
  };
}

export function maskSecret(value: string | null | undefined) {
  if (!value) return "";
  return `${value.slice(0, 4)}${"*".repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
}
