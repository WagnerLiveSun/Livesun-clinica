import { describe, expect, it } from "vitest";
import { automaticDeliveryIssue, buildBrevoReminderPayload, normalizeBrazilianPhone, parseBrevoSender, resolveReminderDeliveryChannel } from "./reminders";

describe("lembretes por e-mail", () => {
  it("separa o nome e o e-mail de um remetente configurado", () => {
    expect(parseBrevoSender("Agenda SunSet <agenda@sunset.com.br>")).toEqual({ name: "Agenda SunSet", email: "agenda@sunset.com.br" });
  });

  it("monta o conteúdo transacional sem interpolar HTML fornecido pelo usuário", () => {
    const payload = buildBrevoReminderPayload({ email: "cliente@sunset.com.br", name: "Cliente" }, "Consulta <confirmada>");
    expect(payload.to[0]).toMatchObject({ email: "cliente@sunset.com.br", name: "Cliente" });
    expect(payload.htmlContent).toContain("&lt;confirmada&gt;");
    expect(payload.subject).toBe("Lembrete de atendimento — SunSet");
    expect(payload.htmlContent).toContain("SUNSET");
  });

  it("usa SunSet como nome padrão quando o remetente não informa uma marca", () => {
    expect(parseBrevoSender("atendimento@sunset.com.br")).toEqual({ name: "SunSet", email: "atendimento@sunset.com.br" });
  });

  it("identifica os canais ainda não ativados e direciona a entrega para e-mail", () => {
    const completeConfig = { smsSender: "SunSet", whatsappSender: "5511999999999", whatsappTemplateId: "12345" };
    expect(automaticDeliveryIssue("EMAIL", completeConfig)).toBeNull();
    expect(automaticDeliveryIssue("WHATSAPP", { ...completeConfig, whatsappTemplateId: "" })).toContain("WhatsApp");
    expect(automaticDeliveryIssue("SMS", { ...completeConfig, smsSender: "" })).toContain("SMS");
    expect(resolveReminderDeliveryChannel("WHATSAPP", { ...completeConfig, whatsappTemplateId: "" })).toBe("EMAIL");
    expect(resolveReminderDeliveryChannel("SMS", { ...completeConfig, smsSender: "" })).toBe("EMAIL");
    expect(resolveReminderDeliveryChannel("EMAIL", completeConfig)).toBe("EMAIL");
  });

  it("normaliza telefone brasileiro para o formato internacional do Brevo", () => {
    expect(normalizeBrazilianPhone("(11) 99999-9999")).toBe("5511999999999");
    expect(normalizeBrazilianPhone("5511999999999")).toBe("5511999999999");
  });
});
