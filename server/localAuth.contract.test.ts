import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function unauthenticatedContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as any, res: {} as any };
}

describe("contratos de autenticação local", () => {
  it("recusa credenciais e pedidos de recuperação malformados antes de acessar dados", async () => {
    const caller = appRouter.createCaller(unauthenticatedContext());
    await expect(caller.auth.login({ email: "invalido", password: "" })).rejects.toThrow();
    await expect(caller.auth.requestPasswordReset({ email: "invalido" })).rejects.toThrow();
    await expect(caller.auth.resetPassword({ token: "curto", password: "123" })).rejects.toThrow();
  });

  it("exige uma sessão de gestor para cadastrar credenciais internas", async () => {
    const caller = appRouter.createCaller(unauthenticatedContext());
    await expect(caller.auth.createLocalUser({
      name: "Profissional SunSet",
      email: "profissional@sunset.test",
      password: "senha-segura-123",
      role: "profissional",
    })).rejects.toThrow();
  });
});
