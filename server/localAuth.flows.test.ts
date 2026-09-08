import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getUserByEmail: vi.fn(),
  sendBrevoReminder: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: mocks.getDb,
  getUserByEmail: mocks.getUserByEmail,
}));

vi.mock("./reminders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./reminders")>()),
  sendBrevoReminder: mocks.sendBrevoReminder,
}));

import { appRouter, canBootstrapFirstManager } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

function createDb(record?: unknown) {
  const updateWhere = vi.fn(async () => undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));
  const insertValues = vi.fn(async () => undefined);
  const insert = vi.fn(() => ({ values: insertValues }));
  const selectLimit = vi.fn(async () => record ? [record] : []);
  const selectWhere = vi.fn(() => ({ limit: selectLimit }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));
  return { update, updateSet, updateWhere, insert, insertValues, select, selectLimit };
}

function createContext() {
  const cookie = vi.fn();
  const clearCookie = vi.fn();
  return {
    req: { protocol: "https", headers: {}, get: vi.fn(() => "sunset.test") },
    res: { cookie, clearCookie },
    user: null,
    cookie,
    clearCookie,
  };
}

describe("fluxos completos de autenticação local", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("autentica uma credencial válida e grava a sessão em cookie", async () => {
    const db = createDb();
    mocks.getDb.mockResolvedValue(db);
    mocks.getUserByEmail.mockResolvedValue({
      id: 12,
      ativo: true,
      passwordHash: await bcrypt.hash("Senha forte 123", 10),
    });
    const context = createContext();

    await expect(appRouter.createCaller(context as any).auth.login({
      email: "gestora@sunset.test",
      password: "Senha forte 123",
    })).resolves.toEqual({ success: true });
    expect(context.cookie).toHaveBeenCalledOnce();
    expect(context.cookie.mock.calls[0][0]).toBe(COOKIE_NAME);
    expect(db.update).toHaveBeenCalledOnce();
  });

  it("emite sessão compatível com acesso HTTP local para que o painel avance após o login", () => {
    const options = getSessionCookieOptions({ protocol: "http", headers: {} } as any);

    expect(options).toMatchObject({ httpOnly: true, path: "/", secure: false, sameSite: "lax" });
  });

  it("rejeita a credencial de um usuário bloqueado e encerra a sessão no logout", async () => {
    mocks.getUserByEmail.mockResolvedValue({
      id: 13,
      ativo: false,
      passwordHash: await bcrypt.hash("Senha forte 123", 10),
    });
    const context = createContext();
    const caller = appRouter.createCaller(context as any);

    await expect(caller.auth.login({ email: "bloqueado@sunset.test", password: "Senha forte 123" })).rejects.toThrow("E-mail ou senha inválidos");
    await expect(caller.auth.logout()).resolves.toEqual({ success: true });
    expect(context.clearCookie).toHaveBeenCalledOnce();
    expect(context.clearCookie.mock.calls[0][0]).toBe(COOKIE_NAME);
  });

  it("permite recuperação inicial por e-mail, redefine a senha e bloqueia a reutilização do token", async () => {
    const setupDb = createDb();
    mocks.getDb.mockResolvedValueOnce(setupDb);
    mocks.getUserByEmail.mockResolvedValue({ id: 20, ativo: true, email: "gestora@sunset.test", passwordHash: null });
    const setupContext = createContext();

    await expect(appRouter.createCaller(setupContext as any).auth.requestPasswordReset({ email: "gestora@sunset.test" })).resolves.toEqual({ success: true });
    expect(setupDb.insert).toHaveBeenCalledOnce();
    expect(mocks.sendBrevoReminder).toHaveBeenCalledOnce();

    const resetDb = createDb({ id: 8, userId: 20 });
    mocks.getDb.mockResolvedValueOnce(resetDb).mockResolvedValueOnce(createDb());
    const caller = appRouter.createCaller(createContext() as any);
    const token = "t".repeat(40);
    await expect(caller.auth.resetPassword({ token, password: "Nova senha 123" })).resolves.toEqual({ success: true });
    expect(resetDb.update).toHaveBeenCalledTimes(2);

    await expect(caller.auth.resetPassword({ token, password: "Nova senha 123" })).rejects.toThrow("inválido ou expirou");
  });

  it("envia o bootstrap somente para gestor sem senha quando não existem credenciais locais ativas", async () => {
    expect(canBootstrapFirstManager([])).toBe(true);
    expect(canBootstrapFirstManager([{ id: 1 }])).toBe(false);
    const bootstrapDb = createDb();
    mocks.getDb.mockResolvedValue(bootstrapDb);
    mocks.getUserByEmail.mockResolvedValue({ id: 30, ativo: true, role: "admin", email: "gestora@sunset.test", passwordHash: null });

    await expect(appRouter.createCaller(createContext() as any).auth.bootstrapFirstManager({ email: "gestora@sunset.test" })).resolves.toEqual({ success: true });
    expect(bootstrapDb.insert).toHaveBeenCalledOnce();
    expect(mocks.sendBrevoReminder).toHaveBeenCalledOnce();
  });
});
