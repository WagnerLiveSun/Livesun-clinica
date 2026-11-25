import { createHash } from "node:crypto";
import { z } from "zod";

const positiveId = z.number().int().positive().max(2147483647);
const registrationSchema = z.object({
  evento_id: z.string().regex(/^cad_[a-f0-9]{32}$/),
  empresa_id: positiveId,
  razao_social: z.string().trim().min(1).max(200),
  nome_fantasia: z.string().trim().max(200).nullable(),
  cnpj_cpf: z.string().regex(/^\d{11}(?:\d{3})?$/),
  email: z.string().email().max(320),
  telefone: z.string().max(30).nullable(),
  responsavel: z.string().trim().min(1).max(150),
}).strict();
const acknowledgementSchema = z.object({
  produto: z.literal("CLINICAS"),
  solicitacao_id: positiveId,
  empresa_id: positiveId,
  evento_id: z.string().regex(/^cad_[a-f0-9]{32}$/),
  status: z.enum(["PENDENTE", "VINCULO_PENDENTE", "VINCULADA"]),
}).passthrough();

export type CentralRegistration = z.infer<typeof registrationSchema>;
export type CentralRegistrationResult =
  | { received: true; centralRequestId: number; status: "PENDENTE" | "VINCULO_PENDENTE" | "VINCULADA" }
  | { received: false; reason: "CONFIGURACAO" | "HTTP" | "RESPOSTA_INVALIDA" | "TIMEOUT" | "CONEXAO" };

/** Identificador estável compatível com o contrato de cadastro do Central. */
export function centralRegistrationEvent(clinicId: number) {
  positiveId.parse(clinicId);
  return `cad_${createHash("sha256").update(`CLINICAS:empresa:${clinicId}`).digest("hex").slice(0, 32)}`;
}

export function centralOrigin(value: string, options: { allowLocalHttp: boolean; environment: string }) {
  const parsed = new URL(value);
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") throw new Error("Origem do Central inválida.");
  const local = options.allowLocalHttp && ["development", "test", "testing"].includes(options.environment)
    && parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !local) throw new Error("A origem do Central exige HTTPS.");
  return parsed.origin;
}

/**
 * Realiza uma tentativa. A persistência, o lease e as novas tentativas devem
 * ser administrados pelo chamador; reconhecimento não significa autorização.
 */
export async function sendCentralRegistration(input: {
  baseUrl: string;
  apiToken: string;
  environment: string;
  allowLocalHttp: boolean;
  payload: CentralRegistration;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}): Promise<CentralRegistrationResult> {
  let payload: CentralRegistration;
  let origin: string;
  try {
    payload = registrationSchema.parse(input.payload);
    origin = centralOrigin(input.baseUrl, { allowLocalHttp: input.allowLocalHttp, environment: input.environment });
    if (!input.apiToken || /[\r\n]/.test(input.apiToken) || payload.evento_id !== centralRegistrationEvent(payload.empresa_id)) throw new Error("Configuração inválida.");
  } catch { return { received: false, reason: "CONFIGURACAO" }; }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, Math.min(input.timeoutMs ?? 8000, 30000)));
  try {
    const response = await (input.fetcher ?? fetch)(`${origin}/api/v1/cadastros`, {
      method: "POST", headers: { authorization: `Bearer ${input.apiToken}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload), redirect: "error", signal: controller.signal,
    });
    if (response.status !== 200 && response.status !== 202) return { received: false, reason: "HTTP" };
    const reader = response.body?.getReader();
    if (!reader) return { received: false, reason: "RESPOSTA_INVALIDA" };
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8192) { await reader.cancel(); return { received: false, reason: "RESPOSTA_INVALIDA" }; }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    let data: z.infer<typeof acknowledgementSchema>;
    try { data = acknowledgementSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
    catch { return { received: false, reason: "RESPOSTA_INVALIDA" }; }
    if (data.empresa_id !== payload.empresa_id || data.evento_id !== payload.evento_id) return { received: false, reason: "RESPOSTA_INVALIDA" };
    return { received: true, centralRequestId: data.solicitacao_id, status: data.status };
  } catch {
    return { received: false, reason: controller.signal.aborted ? "TIMEOUT" : "CONEXAO" };
  } finally { clearTimeout(timer); }
}