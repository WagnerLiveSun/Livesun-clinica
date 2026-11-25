import { z } from "zod";
import { centralOrigin } from "./centralRegistrationClient";

/** Envio transacional do cadastro LiveSun; independente da conta Brevo da clínica. */
export async function sendRegistrationEmail(input: {
  email: string; name: string; token: string; baseUrl: string; apiKey: string;
  fromEmail: string; environment: string; allowLocalHttp: boolean; fetcher?: typeof fetch;
}) {
  const email = z.string().email().parse(input.email);
  const sender = z.string().email().parse(input.fromEmail);
  if (!input.apiKey || !/^[A-Za-z0-9_-]{43}$/.test(input.token)) throw new Error("Configuração de e-mail de cadastro inválida.");
  const origin = centralOrigin(input.baseUrl, { environment: input.environment, allowLocalHttp: input.allowLocalHttp });
  const link = `${origin}/lp/clinicas?confirmar=${encodeURIComponent(input.token)}#cadastro`;
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await (input.fetcher ?? fetch)("https://api.brevo.com/v3/smtp/email", {
      method: "POST", redirect: "error", signal: controller.signal,
      headers: { "api-key": input.apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { email: sender, name: "LiveSun Clínicas" }, to: [{ email, name: input.name }], subject: "Confirme seu e-mail — LiveSun Clínicas", htmlContent: `<p>Olá, ${escape(input.name)}.</p><p>Confirme seu e-mail para continuar o cadastro.</p><p><a href="${escape(link)}">Confirmar meu e-mail</a></p><p>O link é válido por uma hora.</p>` }),
    });
    if (response.status !== 201) throw new Error("Envio de confirmação não aceito.");
    await response.body?.cancel();
  } finally { clearTimeout(timer); }
}