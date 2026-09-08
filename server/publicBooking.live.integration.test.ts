import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { clinicas, profissionaisServicos } from "../drizzle/schema";

const publicContext: TrpcContext = {
  user: null,
  req: { protocol: "https", headers: {} } as any,
  res: {} as any,
};

function nextCalendarDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

describe("integração pública operacional do autoagendamento", () => {
  it("retorna um profissional vinculado a serviço e consulta horários reais sem alterar dados", async () => {
    const caller = appRouter.createCaller(publicContext);
    const db = await getDb();
    const clinic = (await db!.select().from(clinicas).limit(1))[0];
    expect(clinic).toBeDefined();
    const options = await caller.agendamentoPublico.opcoes({ clinicaSlug: clinic!.slug });
    const link = options.vinculosProfissionais[0];
    const service = options.servicos.find((item) => item.id === link?.servicoId);
    const professional = options.profissionais.find((item) => item.id === link?.profissionalId);

    expect(link).toBeDefined();
    expect(service).toBeDefined();
    expect(professional).toBeDefined();
    expect(options.vinculosProfissionais).toContainEqual({
      servicoId: service!.id,
      profissionalId: professional!.id,
    });

    const availability = await caller.agendamentoPublico.disponibilidade({
      clinicaSlug: clinic!.slug,
      servicoId: service!.id,
      profissionalId: professional!.id,
      data: nextCalendarDate(),
    });

    expect(availability.slots.length).toBeGreaterThan(0);
    expect(availability.slots.every((slot) => /^\d{2}:\d{2}$/.test(slot.hora))).toBe(true);
  });

  it("mantém o vínculo público disponível quando somente a comissão está inativa", async () => {
    const db = await getDb();
    expect(db).not.toBeNull();
    const clinic = (await db!.select().from(clinicas).limit(1))[0];
    expect(clinic).toBeDefined();
    const rule = (await db!.select().from(profissionaisServicos).where(and(eq(profissionaisServicos.clinicaId, clinic!.id), eq(profissionaisServicos.profissionalId, 1470001), eq(profissionaisServicos.servicoId, 1))).limit(1))[0];
    expect(rule).toBeDefined();
    expect(rule!.ativo).toBe(true);
    const comissaoAtivaOriginal = rule!.comissaoAtiva;

    try {
      await db!.update(profissionaisServicos).set({ comissaoAtiva: false }).where(and(eq(profissionaisServicos.clinicaId, clinic!.id), eq(profissionaisServicos.profissionalId, 1470001), eq(profissionaisServicos.servicoId, 1)));
      const options = await appRouter.createCaller(publicContext).agendamentoPublico.opcoes({ clinicaSlug: clinic!.slug });
      expect(options.vinculosProfissionais).toContainEqual({ profissionalId: 1470001, servicoId: 1 });
    } finally {
      await db!.update(profissionaisServicos).set({ comissaoAtiva: comissaoAtivaOriginal }).where(and(eq(profissionaisServicos.clinicaId, clinic!.id), eq(profissionaisServicos.profissionalId, 1470001), eq(profissionaisServicos.servicoId, 1)));
    }
  });
});
