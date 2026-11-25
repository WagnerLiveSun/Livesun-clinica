import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getClinicTrialInfo: vi.fn(), clinicCommercialAccess: vi.fn() }));
vi.mock("./clinicTrial", () => ({ getClinicTrialInfo: mocks.getClinicTrialInfo, startClinicTrial: vi.fn() }));
vi.mock("./centralAccess", () => ({ clinicCommercialAccess: mocks.clinicCommercialAccess }));
import { appRouter } from "./routers";

function context(role: string, clinicaId = 7) {
  return { user: { id: 5, clinicaId, role, ativo: true }, req: { headers: {} }, res: {} } as any;
}
describe("informações do período de experiência", () => {
  it("recusa acesso sem sessão", async () => {
    await expect(appRouter.createCaller({ user: null, req: {} as any, res: {} as any }).auth.trialStatus()).rejects.toThrow();
  });
  it("retorna apenas o trial da clínica do gestor autenticado", async () => {
    mocks.clinicCommercialAccess.mockResolvedValue(true);
    mocks.getClinicTrialInfo.mockResolvedValue({ endsAt: "2026-12-02T21:20:07Z", secondsRemaining: 123 });
    await expect(appRouter.createCaller(context("admin")).auth.trialStatus()).resolves.toEqual({ endsAt: "2026-12-02T21:20:07Z", secondsRemaining: 123 });
    expect(mocks.getClinicTrialInfo).toHaveBeenCalledWith(7);
  });
  it("não mostra informações comerciais a outros perfis", async () => {
    mocks.getClinicTrialInfo.mockClear();
    mocks.clinicCommercialAccess.mockResolvedValue(true);
    await expect(appRouter.createCaller(context("profissional")).auth.trialStatus()).resolves.toBeNull();
    expect(mocks.getClinicTrialInfo).not.toHaveBeenCalled();
  });
});