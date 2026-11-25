import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { formatTrialDeadline, TrialWelcomeContent } from "../client/src/components/TrialWelcome";
import { Dialog } from "../client/src/components/ui/dialog";

describe("boas-vindas do período de experiência", () => {
  it("apresenta sete dias, o prazo em Brasília e botão de continuar", () => {
    const html = renderToStaticMarkup(createElement(Dialog, null, createElement(TrialWelcomeContent, {
      trial: { endsAt: "2026-12-02T21:20:07Z", secondsRemaining: 604800 }, onContinue: () => {},
    })));
    expect(html).toContain("Boas-vindas ao LiveSun Clínicas!");
    expect(html).toContain("7 dias");
    expect(html).toContain("2 de dezembro de 2026");
    expect(html).toContain("18:20");
    expect(html).toContain("Começar a usar");
    expect(html).toContain("assinatura ativa");
  });
  it("mostra tempo restante singular e converte UTC corretamente", () => {
    expect(formatTrialDeadline("2026-12-02T21:20:07Z")).toContain("18:20");
    const html = renderToStaticMarkup(createElement(Dialog, null, createElement(TrialWelcomeContent, {
      trial: { endsAt: "2026-12-02T21:20:07Z", secondsRemaining: 45 }, onContinue: () => {},
    })));
    expect(html).toContain("Resta até 1 dia");
  });
});