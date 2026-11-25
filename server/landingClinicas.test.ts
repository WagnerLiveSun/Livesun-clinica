import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LandingClinicas from "../client/src/pages/LandingClinicas";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "../client/src/lib/trpc";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

describe("landing LiveSun Clínicas", () => {
  it("apresenta o produto para estética e informa que o cadastro ainda não está habilitado", () => {
    const queryClient = new QueryClient();
    const client = trpc.createClient({ links: [httpBatchLink({ url: "http://127.0.0.1/api/trpc", transformer: superjson })] });
    const html = renderToStaticMarkup(createElement(trpc.Provider, { client, queryClient }, createElement(QueryClientProvider, { client: queryClient }, createElement(LandingClinicas))));
    expect(html).toContain("clínica de estética");
    expect(html).toContain("Após o cadastro e a confirmação do e-mail");
    expect(html).toContain("Nenhum dado é coletado");
    expect(html).toContain("Prévia para validação");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("clínicas médicas");
    expect(html).not.toContain("R$");
    expect(html).toContain("/assets/landing/agenda.jpg");
    expect(html).toContain("/assets/landing/financeiro.jpg");
    expect(html).toContain("/assets/landing/visao-geral.jpg");
    expect(html).toContain("Telas reais do sistema com nomes, horários e valores fictícios");
    expect(html).toContain('href="https://livesun.com.br/termos"');
    expect(html).toContain('href="https://livesun.com.br/lgpd"');
  });
});