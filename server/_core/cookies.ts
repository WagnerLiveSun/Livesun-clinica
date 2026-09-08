import type { CookieOptions, Request, Response } from "express";
import { ACTIVE_CLINIC_COOKIE } from "@shared/const";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  const secure = isSecureRequest(req);

  return {
    httpOnly: true,
    path: "/",
    // Browsers reject SameSite=None unless the cookie is also Secure.  The
    // development server may be reached through HTTP, so use Lax locally and
    // keep None for the HTTPS production/proxy path.
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
const ACTIVE_CLINIC_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Lê o ID da clínica ativa memorizado para usuários master (consultores de acesso global). */
export function getActiveClinicId(req: Request): number | null {
  const raw = req.headers.cookie ? parseCookieHeader(req.headers.cookie) : {};
  const value = raw[ACTIVE_CLINIC_COOKIE];
  if (!value) return null;
 const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Grava no cookie a clínica que o consultor master escolheu para operar. */
export function setActiveClinicCookie(req: Request, res: Response, clinicId: number) {
  res.cookie(ACTIVE_CLINIC_COOKIE, String(clinicId), {
     ...getSessionCookieOptions(req),
     httpOnly: true,
     maxAge: ACTIVE_CLINIC_MAX_AGE_MS,
   });
}

/** Remove o cookie de clínica ativa (ex.: ao encerrar a sessão). */
export function clearActiveClinicCookie(req: Request, res: Response) {
  res.clearCookie(ACTIVE_CLINIC_COOKIE, { ...getSessionCookieOptions(req), maxAge: -1 });
}

/** Parser mínimimo da header Cookie, sem otimização (usado apenas para leitura do cookie ativo). */
function parseCookieHeader(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of header.split(";")) {
   const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) result[decodeURIComponent(name)] = decodeURIComponent(value);
  }
  return result;
}
