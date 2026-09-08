import { expect, test } from "@playwright/test";
import { createLocalSessionToken } from "../server/localAuth";
import { COOKIE_NAME } from "../shared/const";

test("tela de acesso apresenta login local e recuperação segura", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Bem-vindo(a) ao SunSet." })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await page.getByRole("button", { name: "Esqueci minha senha" }).click();
  await expect(page.getByRole("heading", { name: "Recupere seu acesso." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar link" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar para o login" }).click();
  await page.getByRole("button", { name: "Primeiro acesso do gestor" }).click();
  await expect(page.getByRole("heading", { name: "Prepare o primeiro acesso." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar convite seguro" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("assinatura SunSet no acesso separa nome e slogan em desktop e mobile", async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "networkidle" });

    const signature = page.locator(".login-card .brand-lockup");
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

test("agenda mantém a ação Novo agendamento com contraste legível sobre o tema", async ({ page, context }) => {
  const token = await createLocalSessionToken(1);
  await context.addCookies([{ name: COOKIE_NAME, value: token, url: "http://127.0.0.1:3000", httpOnly: true }]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByText("Agenda", { exact: true }).click();

  const newAppointment = page.getByRole("button", { name: "Novo agendamento" });
  await expect(newAppointment).toBeVisible();
  await expect(newAppointment).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(newAppointment).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  const colors = await newAppointment.evaluate((element) => {
    const { backgroundColor, color } = getComputedStyle(element);
    const channels = (value: string) => value.match(/\d+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
    const [r, g, b] = channels(backgroundColor).map((channel) => channel / 255);
    const [tr, tg, tb] = channels(color).map((channel) => channel / 255);
    const luminance = ([red, green, blue]: number[]) => [red, green, blue]
      .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const foreground = luminance([tr, tg, tb]);
    const background = luminance([r, g, b]);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });

  expect(colors).toBeGreaterThanOrEqual(4.5);
});

test("gestor abre diálogo de usuário e seletor de perfil com superfícies opacas", async ({ page, context }) => {
  const token = await createLocalSessionToken(1);
  await context.addCookies([{ name: COOKIE_NAME, value: token, url: "http://127.0.0.1:3000", httpOnly: true }]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByText("Gestão", { exact: true }).click();
  await page.getByRole("button", { name: "Novo usuário" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(dialog).toHaveCSS("opacity", "1");
  await dialog.getByRole("combobox").click();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  await expect(listbox).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(listbox).toHaveCSS("opacity", "1");
  await expect(page.getByRole("option", { name: "Profissional" })).toBeVisible();
  await page.screenshot({ path: "test-results/internal-overlay-desktop.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(dialog).toHaveCSS("opacity", "1");
  await dialog.getByRole("combobox").click();
  await expect(listbox).toBeVisible();
  await expect(listbox).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(listbox).toHaveCSS("opacity", "1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/internal-overlay-mobile.png" });
});

test("gestor abre a edição de um serviço sem alterar seus vínculos ou histórico", async ({ page, context }) => {
  const token = await createLocalSessionToken(1);
  await context.addCookies([{ name: COOKIE_NAME, value: token, url: "http://127.0.0.1:3000", httpOnly: true }]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByText("Serviços", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Serviços e recursos" })).toBeVisible();
  await page.getByRole("button", { name: "Editar" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Editar serviço" })).toBeVisible();
  const inputs = dialog.locator("input");
  await expect(inputs.nth(0)).not.toHaveValue("");
  await expect(inputs.nth(1)).not.toHaveValue("");
  await expect(inputs.nth(2)).not.toHaveValue("");
  await expect(dialog.getByText("Exige anamnese", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Serviço ativo", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).not.toBeVisible();
});

test("gestor consulta o relatório financeiro por período e encontra a opção de impressão", async ({ page, context }) => {
  const token = await createLocalSessionToken(1);
  await context.addCookies([{ name: COOKIE_NAME, value: token, url: "http://127.0.0.1:3000", httpOnly: true }]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByText("Financeiro", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Financeiro e caixa" })).toBeVisible();
  await expect(page.getByText("Financeiro, serviços e comissões", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Imprimir / PDF" })).toBeEnabled();
  await expect(page.locator("#relatorios-financeiros input[type='date']")).toHaveCount(2);
  await expect(page.getByText("Desempenho de serviços", { exact: true })).toBeVisible();
});

test("gestor abre a configuração de comissão por profissional e procedimento", async ({ page, context }) => {
  const token = await createLocalSessionToken(1);
  await context.addCookies([{ name: COOKIE_NAME, value: token, url: "http://127.0.0.1:3000", httpOnly: true }]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByText("Financeiro", { exact: true }).click();
  await page.getByRole("button", { name: "Configurar comissões" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Regra de comissão" })).toBeVisible();
  await expect(dialog.getByText("Percentual sobre o serviço", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Regra ativa para novas comissões", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Salvar regra" })).toBeDisabled();
});

test("gestor visualiza os controles de baixa de comissões", async ({ page, context }) => {
  const token = await createLocalSessionToken(1);
  await context.addCookies([{ name: COOKIE_NAME, value: token, url: "http://127.0.0.1:3000", httpOnly: true }]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByText("Financeiro", { exact: true }).click();
  await expect(page.getByText("Comissões por profissional", { exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Pagamento" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Pagar selecionadas/ })).toBeVisible();
});

test("gestor confirma a baixa de comissão sem alterar os dados financeiros reais", async ({ page, context }) => {
  const token = await createLocalSessionToken(1);
  await context.addCookies([{ name: COOKIE_NAME, value: token, url: "http://127.0.0.1:3000", httpOnly: true }]);
  let refreshes = 0;
  let paymentMocked = false;
  const commissions = [
    { id: 9101, sessaoId: 8101, profissionalId: 1, profissionalNome: "Profissional de teste", tipoComissao: "PERCENTUAL", percentual: "10.00", valorRegra: "0.00", valor: "25.00", status: "PENDENTE", geradaEm: "2026-08-14T00:00:00.000Z", pagaEm: null },
    { id: 9102, sessaoId: 8102, profissionalId: 1, profissionalNome: "Profissional de teste", tipoComissao: "VALOR_FIXO", percentual: "0.00", valorRegra: "35.00", valor: "35.00", status: "PENDENTE", geradaEm: "2026-08-13T00:00:00.000Z", pagaEm: null },
  ];
  page.on("request", (request) => {
    if (request.url().includes("financeiro.comissoes")) refreshes += 1;
  });
  await page.route("**/api/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const procedures = url.pathname.split("/").pop()?.split(",") ?? [];
    if (!procedures.includes("financeiro.comissoes")) return route.continue();
    const response = await route.fetch();
    const original = await response.json() as Array<unknown>;
    const rows = commissions.map((commission) => paymentMocked && commission.id === 9101
      ? { ...commission, status: "PAGA", pagaEm: "2026-08-14T00:00:00.000Z" }
      : commission);
    const payload = original.map((item, index) => procedures[index] === "financeiro.comissoes"
      ? { result: { data: { json: rows } } }
      : item);
    await route.fulfill({ response, body: JSON.stringify(payload) });
  });
  await page.route("**/api/trpc/financeiro.pagarComissoes**", async (route) => {
    paymentMocked = true;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: { json: { success: true, pagas: 1, jaProcessadas: 0, naoEncontradas: 0 } } } }]),
    });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByText("Financeiro", { exact: true }).click();
  await page.getByRole("button", { name: "Pagar", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Registrar pagamento de comissão" })).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmar pagamento" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("1 comissão marcada como paga.", { exact: true })).toBeVisible();
  const commissionPanel = page.locator(".surface-card").filter({ has: page.getByText("Comissões por profissional", { exact: true }) });
  await expect(commissionPanel.getByText("Paga", { exact: true })).toHaveCount(1);
  await expect(commissionPanel.getByText(/^\d{2}\/\d{2}\/\d{4}$/)).toHaveCount(3);
  await expect(commissionPanel.getByRole("button", { name: "Pagar", exact: true })).toHaveCount(1);
  await expect.poll(() => refreshes).toBeGreaterThan(1);
});
