import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function publicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as any,
    res: {} as any,
  };
}

describe("contratos públicos de autoagendamento", () => {
  it("exige consentimento explícito no cadastro antes de consultar o banco", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.agendamentoPublico.cadastro({
      nome: "Cliente de teste",
      email: "cliente@exemplo.com",
      telefone: "11999999999",
      canalPreferido: "EMAIL",
      consentimentoDados: false,
      optInComunicacao: true,
    })).rejects.toThrow();
  });

  it("protege anamnese, disponibilidade e solicitação contra entradas inválidas", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.agendamentoPublico.questionarios({ token: "curto" })).rejects.toThrow();
    await expect(caller.agendamentoPublico.responderAnamnese({
      token: "curto",
      questionarioId: 0,
      declaracaoVeracidade: false,
      assinaturaDigital: "A",
      respostas: [],
    })).rejects.toThrow();
    await expect(caller.agendamentoPublico.disponibilidade({ profissionalId: 0, servicoId: 0, data: "01-01-2030" })).rejects.toThrow();
    await expect(caller.agendamentoPublico.solicitar({
      token: "curto",
      servicoId: 0,
      profissionalId: 0,
      dataHoraInicio: new Date("2030-01-01T10:00:00"),
    })).rejects.toThrow();
  });
});
