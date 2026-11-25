import { describe, expect, it } from "vitest";
import { automaticDeliveryIssue, buildBrevoReminderPayload, buildBrevoWhatsappPayload, normalizeBrazilianPhone, parseBrevoSender, resolveReminderDeliveryChannel } from "./reminders";

describe("lembretes por e-mail", () => {
  it("separa o nome e o e-mail de um remetente configurado", () => {
    expect(parseBrevoSender("Agenda SunSet <agenda@sunset.com.br>")).toEqual({ name: "Agenda SunSet", email: "agenda@sunset.com.br" });
  });

  it("monta o conteúdo transacional sem interpolar HTML fornecido pelo usuário", () => {
    const payload = buildBrevoReminderPayload({ email: "cliente@sunset.com.br", name: "Cliente" }, "Consulta <confirmada>");
    expect(payload.to[0]).toMatchObject({ email: "cliente@sunset.com.br", name: "Cliente" });
    expect(payload.htmlContent).toContain("&lt;confirmada&gt;");
    expect(payload.subject).toBe("Lembrete de atendimento — LiveSun Clínicas");
    expect(payload.htmlContent).toContain("LiveSun Clínicas");
  });

  it("usa identidade institucional quando o remetente não informa uma marca", () => {
    expect(parseBrevoSender("atendimento@sunset.com.br")).toEqual({ name: "LiveSun Clínicas", email: "atendimento@sunset.com.br" });
  });

  it("usa e escapa o nome do remetente configurado pela clínica", () => {
    const config = { apiKey: "teste", fromEmail: "agenda@example.com", fromName: "Clínica <A>", smsSender: "", whatsappSender: "", whatsappTemplateId: "", emailAtivo: true, smsAtivo: false, whatsappAtivo: false };
    const payload = buildBrevoReminderPayload({ email: "cliente@example.com" }, "Conteúdo", config);
    expect(payload.sender.name).toBe("Clínica <A>");
    expect(payload.htmlContent).toContain("Clínica &lt;A&gt;");
    expect(payload.htmlContent).not.toContain("Clínica <A>");
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

  it("usa o número WhatsApp configurado pela clínica", () => {
    const config = { apiKey: "", fromEmail: "", smsSender: "", whatsappSender: "11988887777", whatsappTemplateId: "123", emailAtivo: true, smsAtivo: false, whatsappAtivo: true };
    expect(buildBrevoWhatsappPayload({ telefone: "11999990000" }, config)).toEqual({ senderNumber: "5511988887777", contactNumbers: ["5511999990000"], templateId: 123 });
  });
});
