import { expect, test } from "@playwright/test";

type Procedure = "agendamentoPublico.opcoes" | "agendamentoPublico.questionarios" | "agendamentoPublico.responderAnamnese" | "agendamentoPublico.disponibilidade" | "agendamentoPublico.solicitar";

function publicBookingResponse(procedure: Procedure) {
  const responses: Record<Procedure, unknown> = {
    "agendamentoPublico.opcoes": { servicos: [{ id: 101, nome: "Avaliação SunSet", duracaoMin: 60, valor: "150.00", descricao: "Avaliação personalizada" }], profissionais: [{ id: 201, nome: "Dra. SunSet" }], vinculosProfissionais: [{ servicoId: 101, profissionalId: 201 }] },
    "agendamentoPublico.questionarios": [{ id: 301, nome: "Anamnese inicial", descricao: "Responda com atenção.", respondido: false, perguntas: [{ id: 401, texto: "Possui alguma alergia?", tipoResposta: "TEXTO", opcoesJson: null, obrigatoria: true }] }],
    "agendamentoPublico.responderAnamnese": { success: true },
    "agendamentoPublico.disponibilidade": { slots: [{ hora: "09:00" }] },
    "agendamentoPublico.solicitar": { success: true },
  };
  return { result: { data: { json: responses[procedure] } } };
}

async function mockPublicBooking(page: import("@playwright/test").Page) {
  await page.route("**/api/trpc/**", async (route) => {
    const procedures = new URL(route.request().url()).pathname.split("/").pop()?.split(",") ?? [];
    const publicProcedures = procedures.filter((procedure): procedure is Procedure => procedure in {
      "agendamentoPublico.opcoes": true,
      "agendamentoPublico.questionarios": true,
      "agendamentoPublico.responderAnamnese": true,
      "agendamentoPublico.disponibilidade": true,
      "agendamentoPublico.solicitar": true,
    });
    if (!publicProcedures.length) return route.continue();
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(publicProcedures.map(publicBookingResponse)) });
  });
}

test("portal público apresenta o cadastro de forma íntegra em desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/agendar", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Seu cuidado começa com uma escolha simples." })).toBeVisible();
  await expect(page.getByText("Vamos criar seu cadastro", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar para a anamnese" })).toBeVisible();
  await expect(page.locator(".booking-card")).toBeVisible();
  await expect(page.locator(".booking-card")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".booking-card")).toHaveCSS("opacity", "1");
  await expect(page.locator(".booking-help")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".channel-choice").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".booking-form")).toHaveCSS("grid-template-columns", /.+/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("portal público reorganiza o cadastro sem rolagem horizontal em mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/agendar", { waitUntil: "networkidle" });
  await expect(page.getByText("Como você prefere receber atualizações?")).toBeVisible();
  await expect(page.getByText("WhatsApp", { exact: true })).toBeVisible();
  await expect(page.getByText("SMS", { exact: true })).toBeVisible();
  await expect(page.locator(".booking-card")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".booking-card")).toHaveCSS("opacity", "1");
  await expect(page.locator(".booking-consents")).toHaveCSS("background-color", "rgb(255, 253, 247)");
  const columns = await page.locator(".booking-form").evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  expect(columns.split(" ").filter(Boolean)).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("assinatura SunSet mantém nome e slogan separados em desktop e mobile", async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/agendar", { waitUntil: "networkidle" });

    const signature = page.locator(".booking-header .brand-lockup");
    const copy = signature.locator(".brand-copy");
    const name = copy.getByText("SunSet", { exact: true });
    const slogan = copy.getByText("Seu cuidado, seu momento", { exact: true });
    await expect(name).toBeVisible();
    await expect(slogan).toBeVisible();
    await expect(copy).toHaveCSS("flex-direction", "column");

    const [nameBox, sloganBox] = await Promise.all([name.boundingBox(), slogan.boundingBox()]);
    expect(nameBox).not.toBeNull();
    expect(sloganBox).not.toBeNull();
    expect((sloganBox?.y ?? 0) - ((nameBox?.y ?? 0) + (nameBox?.height ?? 0))).toBeGreaterThanOrEqual(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("portal público mantém superfícies opacas durante anamnese, seleção e confirmação preenchidas", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => sessionStorage.setItem("sunset-public-booking-token", "token-e2e-publico"));
  await mockPublicBooking(page);
  await page.goto("/agendar", { waitUntil: "networkidle" });

  await expect(page.getByText("Anamnese obrigatória", { exact: true })).toBeVisible();
  await expect(page.locator(".booking-card")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.getByLabel("Possui alguma alergia? *").fill("Nenhuma alergia conhecida");
  await page.getByLabel("Assinatura digital").fill("Cliente de Teste");
  await page.getByRole("button", { name: "Confirmar anamnese" }).click();

  await expect(page.getByText("Escolha sua solicitação", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("combobox").nth(0).click();
  await expect(page.getByRole("option", { name: /Avaliação SunSet/ })).toBeVisible();
  await expect(page.getByRole("listbox")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.getByRole("option", { name: /Avaliação SunSet/ }).click();
  await page.getByRole("combobox").nth(1).click();
  await expect(page.getByRole("option", { name: "Dra. SunSet" })).toBeVisible();
  await expect(page.getByRole("listbox")).toHaveCSS("opacity", "1");
  await page.getByRole("option", { name: "Dra. SunSet" }).click();
  await expect(page.getByRole("combobox").nth(2)).toBeEnabled();
  await page.getByRole("combobox").nth(2).click();
  await page.getByRole("option", { name: "09:00" }).click();
  await page.getByRole("button", { name: "Solicitar agendamento" }).click();

  await expect(page.getByRole("heading", { name: "Recebemos seu pedido de agendamento." })).toBeVisible();
  await expect(page.locator(".booking-success")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
