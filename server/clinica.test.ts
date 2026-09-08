import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../shared/const";
import { appRouter, filterPendingQuestionnaires, formatAppointmentDateTime, hasScheduleConflict, publicAvailableSlots, publicBookingConfirmationMessage, publicBookingReminderMessage, reminderDeliveryUpdate, staffBookingReminderMessage } from "./routers";
import type { TrpcContext } from "./_core/context";
import { clinicSettings } from "../drizzle/schema";

function makeCtx(role: string, id = 1): TrpcContext {
  return {
    user: {
      id, openId: `test-${role}`, email: `${role}@clinica.com`, name: `Usuário ${role}`,
      loginMethod: "manus", role: role as any, ativo: true, telefone: null,
      clinicaId: 1,
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("auth", () => {
  it("logout limpa o cookie de sessão e retorna sucesso", async () => {
    const cleared: string[] = [];
    const ctx: TrpcContext = {
      ...makeCtx("admin"),
      res: { clearCookie: (name: string) => cleared.push(name) } as any,
    };
    const result = await appRouter.createCaller(ctx).auth.logout();
    expect(result).toEqual({ success: true });
    expect(cleared).toContain(COOKIE_NAME);
  });

  it("me retorna null quando não autenticado", async () => {
    const ctx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as any, res: {} as any };
    const result = await appRouter.createCaller(ctx).auth.me();
    expect(result).toBeNull();
  });
});

describe("controle de acesso por perfil", () => {
  it("bloqueia rotas protegidas quando o usuário não possui clínica ativa", async () => {
    const ctx = makeCtx("admin");
    ctx.user!.clinicaId = null;
    await expect(appRouter.createCaller(ctx).clientes.list()).rejects.toThrow("Este usuário não está vinculado a uma clínica ativa.");
  });

  it("cliente não pode listar clientes (rota de equipe)", async () => {
    const caller = appRouter.createCaller(makeCtx("cliente"));
    await expect(caller.clientes.list()).rejects.toThrow(TRPCError);
  });

  it("profissional pode listar serviços", async () => {
    const caller = appRouter.createCaller(makeCtx("profissional"));
    const result = await caller.servicos.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("recepcao não pode criar serviços (somente admin)", async () => {
    const caller = appRouter.createCaller(makeCtx("recepcao"));
    await expect(caller.servicos.create({ nome: "Teste", valor: "100", duracaoMin: 60 })).rejects.toThrow(TRPCError);
  });

  it("recepcao não pode editar serviços (somente admin)", async () => {
    const caller = appRouter.createCaller(makeCtx("recepcao"));
    await expect(caller.servicos.update({ id: 1, nome: "Teste corrigido", valor: "100", duracaoMin: 60, exigeQuestionario: true, ativo: true })).rejects.toThrow(TRPCError);
  });

  it("admin pode acessar comissões", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.financeiro.comissoes({ dataInicio: "2026-08-01", dataFim: "2026-08-31" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin pode consultar as regras de comissão por profissional e serviço", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.profissionais.regrasComissao();
    expect(Array.isArray(result)).toBe(true);
  });

  it("recepção não pode consultar nem alterar regras de comissão", async () => {
    const caller = appRouter.createCaller(makeCtx("recepcao"));
    await expect(caller.profissionais.regrasComissao()).rejects.toThrow(TRPCError);
    await expect(caller.profissionais.salvarRegraComissao({ profissionalId: 1, servicoId: 1, tipoComissao: "PERCENTUAL", comissaoPercentual: "20", comissaoValorFixo: "0", ativo: true })).rejects.toThrow(TRPCError);
  });

  it("profissional não pode acessar comissões (somente admin)", async () => {
    const caller = appRouter.createCaller(makeCtx("profissional"));
    await expect(caller.financeiro.comissoes()).rejects.toThrow(TRPCError);
  });

  it("recepção não pode registrar pagamento de comissões", async () => {
    const caller = appRouter.createCaller(makeCtx("recepcao"));
    await expect(caller.financeiro.pagarComissoes({ ids: [1], dataPagamento: "2026-08-14" })).rejects.toThrow(TRPCError);
  });

  it("gestor consulta o relatório financeiro com suas seções consolidadas", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const report = await caller.financeiro.relatorio({ dataInicio: "2026-08-01", dataFim: "2026-08-31" });
    expect(report).toHaveProperty("resumo");
    expect(report).toHaveProperty("contasReceber");
    expect(report).toHaveProperty("recebimentos");
    expect(report).toHaveProperty("contasPagar");
    expect(report).toHaveProperty("pagamentos");
    expect(report).toHaveProperty("comissoes");
    expect(report).toHaveProperty("servicos");
    expect(report.resumo).toHaveProperty("comissoesPendentes");
    expect(report.resumo).toHaveProperty("comissoesPagas");
    expect(Array.isArray(report.comissoes)).toBe(true);
    expect(Array.isArray(report.servicos)).toBe(true);
  });

  it("recepção não acessa o relatório financeiro consolidado", async () => {
    const caller = appRouter.createCaller(makeCtx("recepcao"));
    await expect(caller.financeiro.relatorio({ dataInicio: "2026-08-01", dataFim: "2026-08-31" })).rejects.toThrow(TRPCError);
  });
});

describe("dashboard stats", () => {
  it("retorna as chaves esperadas para usuário de equipe", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const stats = await caller.financeiro.dashboardStats();
    expect(stats).toHaveProperty("faturamentoMes");
    expect(stats).toHaveProperty("agendamentosHoje");
    expect(stats).toHaveProperty("taxaOcupacao");
    expect(stats).toHaveProperty("aniversariantes");
    expect(Array.isArray(stats.aniversariantes)).toBe(true);
  });
});

describe("portal do cliente", () => {
  it("usuário com role admin não pode acessar o portal do cliente", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(caller.portal.resumo()).rejects.toThrow(TRPCError);
  });

  it("usuário com role cliente pode acessar o portal", async () => {
    const caller = appRouter.createCaller(makeCtx("cliente"));
    const result = await caller.portal.resumo();
    expect(result).toHaveProperty("vinculado");
  });
});

describe("agenda", () => {
  const session = {
    profissionalId: 7,
    salaId: 3,
    dataHoraInicio: new Date("2026-08-11T14:00:00.000Z"),
    dataHoraFim: new Date("2026-08-11T15:00:00.000Z"),
  };

  it("bloqueia sobreposição de horários do mesmo profissional", () => {
    expect(hasScheduleConflict([session], {
      profissionalId: 7,
      dataHoraInicio: new Date("2026-08-11T14:30:00.000Z"),
      dataHoraFim: new Date("2026-08-11T15:30:00.000Z"),
    })).toBe(true);
  });

  it("bloqueia sobreposição de horários da mesma sala", () => {
    expect(hasScheduleConflict([session], {
      profissionalId: 9,
      salaId: 3,
      dataHoraInicio: new Date("2026-08-11T14:30:00.000Z"),
      dataHoraFim: new Date("2026-08-11T15:30:00.000Z"),
    })).toBe(true);
  });

  it("permite horários consecutivos sem sobreposição", () => {
    expect(hasScheduleConflict([session], {
      profissionalId: 7,
      dataHoraInicio: new Date("2026-08-11T15:00:00.000Z"),
      dataHoraFim: new Date("2026-08-11T16:00:00.000Z"),
    })).toBe(false);
  });

  it("oferece apenas slots que comportam o serviço e não se sobrepõem aos atendimentos ativos", () => {
    const slots = publicAvailableSlots(
      "2030-01-01",
      60,
      [{ dataHoraInicio: new Date("2030-01-01T09:00:00"), dataHoraFim: new Date("2030-01-01T10:00:00") }],
      new Date("2029-12-01T00:00:00"),
    );
    expect(slots.some((slot) => slot.hora === "09:00")).toBe(false);
    expect(slots.some((slot) => slot.hora === "08:30")).toBe(false);
    expect(slots.some((slot) => slot.hora === "10:00")).toBe(true);
  });
});

describe("administração", () => {
  it("mantém os campos empresariais e de endereço no modelo persistido da clínica", () => {
    expect(Object.keys(clinicSettings)).toEqual(expect.arrayContaining([
      "razaoSocial", "segmento", "cnpj", "telefone", "whatsapp", "emailContato",
      "endereco", "numero", "complemento", "bairro", "cep", "cidade", "estado",
    ]));
  });

  it("rejeita formatos inválidos antes de processar o cadastro da clínica", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(caller.settings.update({ nome: "Clínica Exemplo", cnpj: "12", cep: "123", estado: "SP" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("aceita os campos empresariais completos e bloqueia sua alteração por perfis não gestores", async () => {
    const caller = appRouter.createCaller(makeCtx("recepcao"));
    await expect(caller.settings.update({
      nome: "Clínica Exemplo", razaoSocial: "Clínica Exemplo Ltda", segmento: "Estética avançada",
      cnpj: "12.345.678/0001-90", telefone: "(11) 3333-4444", whatsapp: "(11) 99999-8888",
      emailContato: "contato@exemplo.com.br", endereco: "Avenida Central", numero: "100",
      complemento: "Sala 4", bairro: "Centro", cep: "01001-000", cidade: "São Paulo", estado: "SP",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("somente o administrador pode consultar usuários", async () => {
    const caller = appRouter.createCaller(makeCtx("recepcao"));
    await expect(caller.auth.listUsers()).rejects.toThrow(TRPCError);
  });

  it("profissional pode consultar os insumos ativos", async () => {
    const caller = appRouter.createCaller(makeCtx("profissional"));
    const result = await caller.recursos.insumos.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("recepção não pode cadastrar insumos", async () => {
    const caller = appRouter.createCaller(makeCtx("recepcao"));
    await expect(caller.recursos.insumos.create({ nome: "Gel condutor", unidade: "ml", estoqueAtual: "100", estoqueMinimo: "20", custoUnitario: "0,50" })).rejects.toThrow(TRPCError);
  });
});

describe("anamnese no portal", () => {
  it("mantém pendente somente a versão de questionário ainda não respondida", () => {
    const pending = filterPendingQuestionnaires(
      [{ id: 10, versao: 2 }, { id: 11, versao: 1 }],
      [{ questionarioId: 10, versaoQuestionario: 1 }, { questionarioId: 11, versaoQuestionario: 1 }],
    );
    expect(pending).toEqual([{ id: 10, versao: 2 }]);
  });
});

describe("fila de lembretes", () => {
  it("gestor consulta a fila com filtro de status", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.lembretes.list({ status: "PENDENTE" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.every((item) => item.status === "PENDENTE")).toBe(true);
  });

  it("prepara a transição de um lembrete para enviado com data de processamento", () => {
    const sentAt = new Date("2026-08-11T14:00:00.000Z");
    expect(reminderDeliveryUpdate(sentAt)).toEqual({ status: "ENVIADO", enviadoEm: sentAt });
  });

  it("recepção não pode confirmar o processamento de lembretes", async () => {
    const caller = appRouter.createCaller(makeCtx("recepcao"));
    await expect(caller.lembretes.marcarEnviado({ id: 1 })).rejects.toThrow(TRPCError);
  });
});

describe("fuso horário das comunicações", () => {
  it("formata o horário do atendimento no fuso regional informado pelo navegador", () => {
    const appointment = new Date("2026-08-13T13:00:00.000Z");
    expect(formatAppointmentDateTime(appointment, "America/Sao_Paulo")).toContain("10:00");
  });

  it("usa o fuso padrão da clínica quando recebe uma zona inválida", () => {
    const appointment = new Date("2026-08-13T13:00:00.000Z");
    expect(formatAppointmentDateTime(appointment, "Fuso/Inexistente")).toContain("10:00");
  });

  it("gera confirmação e lembrete com o horário local escolhido pelo cliente", () => {
    const appointment = new Date("2026-08-13T13:00:00.000Z");
    expect(publicBookingConfirmationMessage("Bronzemento", appointment, "America/Sao_Paulo")).toContain("Bronzemento para 13/08/2026, 10:00");
    expect(publicBookingReminderMessage(appointment, "America/Sao_Paulo")).toContain("13/08/2026, 10:00");
    expect(staffBookingReminderMessage(appointment)).toContain("13/08/2026, 10:00");
  });

  it("explica que canais ainda não ativos são enviados por e-mail", () => {
    const appointment = new Date("2026-08-13T13:00:00.000Z");
    expect(publicBookingConfirmationMessage("Procedimento", appointment, "America/Sao_Paulo")).toContain("13/08/2026, 10:00");
  });
});
