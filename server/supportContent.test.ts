import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SupportContent } from "../client/src/components/SupportContent";

describe("contato e suporte", () => {
  it("apresenta os mesmos canais do Propostas e protege os links externos", () => {
    const html = renderToStaticMarkup(createElement(SupportContent));
    expect(html).toContain("Contato e suporte");
    expect(html).toContain('href="mailto:suporte@livesun.com.br"');
    expect(html).toContain('href="https://wa.me/5521927891083"');
    expect(html).toContain("21 92789-1083");
    expect(html).toContain('href="https://app.pipefy.com/public/form/ETeM9Gbz"');
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
    expect(html).toContain("Não envie sua senha.");
  });
});