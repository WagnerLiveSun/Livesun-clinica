import { describe, expect, it } from "vitest";
import { canLoadClientPortal } from "../client/src/lib/access";

describe("carregamento do portal do cliente", () => {
  it("aguarda a autenticação antes de habilitar consultas do portal", () => {
    expect(canLoadClientPortal(undefined, true)).toBe(false);
  });

  it("não habilita consultas do portal para usuários internos", () => {
    expect(canLoadClientPortal({ role: "admin" }, false)).toBe(false);
    expect(canLoadClientPortal({ role: "recepcao" }, false)).toBe(false);
    expect(canLoadClientPortal({ role: "profissional" }, false)).toBe(false);
  });

  it("habilita consultas apenas para perfis de cliente autenticados", () => {
    expect(canLoadClientPortal({ role: "cliente" }, false)).toBe(true);
    expect(canLoadClientPortal({ role: "user" }, false)).toBe(true);
  });
});
