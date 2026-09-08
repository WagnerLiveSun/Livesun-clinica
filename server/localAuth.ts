import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { COOKIE_NAME } from "../shared/const";
import * as db from "./db";
import { ENV } from "./_core/env";

const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createLocalSessionToken(userId: number) {
  return new SignJWT({ type: "local", userId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(sessionSecret());
}

export async function getLocalSessionUserId(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    const userId = payload.userId;
    return payload.type === "local" && typeof userId === "number" && Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

export async function authenticateLocalRequest(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const userId = await getLocalSessionUserId(cookies[COOKIE_NAME]);
  if (!userId) return null;
  const user = await db.getUserById(userId);
  return user?.ativo ? user : null;
}

export const LOCAL_SESSION_MAX_AGE_MS = SESSION_DURATION_SECONDS * 1000;
