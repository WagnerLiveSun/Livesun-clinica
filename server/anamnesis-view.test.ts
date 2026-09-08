import { describe, expect, it } from "vitest";
import { formatAnamnesisAnswer } from "../client/src/lib/anamnesis";
import { appRouter } from "./routers";

const emptyAnswer = { respostaTexto: null, respostaBoolean: null, respostaNumero: null, respostaData: null, respostaJson: null };

describe("visualização de anamnese no prontuário", () => {
  it("prioriza e apresenta cada formato de resposta de forma legível", () => {
    expect(formatAnamnesisAnswer({ ...emptyAnswer, respostaTexto: "Uso contínuo de medicação" }, (value) => value)).toBe("Uso contínuo de medicação");
    expect(formatAnamnesisAnswer({ ...emptyAnswer, respostaBoolean: true }, (value) => value)).toBe("Sim");
    expect(formatAnamnesisAnswer({ ...emptyAnswer, respostaBoolean: false }, (value) => value)).toBe("Não");
    expect(formatAnamnesisAnswer({ ...emptyAnswer, respostaNumero: "18" }, (value) => value)).toBe("18");
    expect(formatAnamnesisAnswer({ ...emptyAnswer, respostaData: "2026-08-13" }, () => "13/08/2026")).toBe("13/08/2026");
  });

  it("apresenta opções múltiplas e preserva conteúdo não serializado", () => {
    expect(formatAnamnesisAnswer({ ...emptyAnswer, respostaJson: '["Rosácea", "Dermatite"]' }, (value) => value)).toBe("Rosácea, Dermatite");
    expect(formatAnamnesisAnswer({ ...emptyAnswer, respostaJson: "valor livre" }, (value) => value)).toBe("valor livre");
    expect(formatAnamnesisAnswer(null, (value) => value)).toBe("Não respondida");
  });

  it("impede que o perfil de cliente consulte a anamnese por meio do prontuário interno", async () => {
    const caller = appRouter.createCaller({
      req: {},
      res: {},
      user: { id: 900, clinicaId: 1, openId: "cliente-teste", role: "cliente", ativo: true },
    } as any);

    await expect(caller.clientes.get({ id: 1 })).rejects.toThrow("Seu perfil não tem permissão");
  });
});
