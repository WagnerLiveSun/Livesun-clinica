import { z } from "zod";
import { centralOrigin } from "./centralRegistrationClient";

/** Retorna somente nomes de variáveis inválidas, nunca seus valores. */
export function registrationConfig(env: NodeJS.ProcessEnv) {
  const problems: string[] = [];
  if (env.CENTRAL_ENABLED !== "true") problems.push("CENTRAL_ENABLED");
  if (!(env.CENTRAL_API_TOKEN ?? "").trim() || /[\r\n]/.test(env.CENTRAL_API_TOKEN ?? "")) problems.push("CENTRAL_API_TOKEN");
  if ((env.CENTRAL_WEBHOOK_SECRET ?? "").length < 32) problems.push("CENTRAL_WEBHOOK_SECRET");
  if (!(env.BREVO_API_KEY ?? "").trim()) problems.push("BREVO_API_KEY");
  const fromEmail = (env.BREVO_FROM_EMAIL?.trim() || env.BREVO_SENDER_EMAIL?.trim() || "");
  if (!z.string().email().safeParse(fromEmail).success) problems.push("BREVO_FROM_EMAIL (ou BREVO_SENDER_EMAIL)");
  const options = { environment: env.NODE_ENV ?? "production", allowLocalHttp: env.CENTRAL_ALLOW_LOCAL_HTTP === "true" };
  for (const key of ["PUBLIC_BASE_URL", "CENTRAL_BASE_URL"] as const) {
    try { centralOrigin(env[key] ?? "", options); } catch { problems.push(key); }
  }
  return { problems, fromEmail };
}