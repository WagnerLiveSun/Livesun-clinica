import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("superfícies sobrepostas do SunSet", () => {
  it("renderiza a personalização completa somente para o perfil gestor", () => {
    expect(home).toContain('{section === "gestao" && isAdmin && <>');
    expect(home).toContain('{ id: "gestao", label: "Gestão", icon: Settings2, visible: isAdmin }');
  });

  it("mantém diálogos, seletores e menus em superfícies opacas e contrastadas", () => {
    expect(styles).toContain('[data-slot="dialog-content"]');
    expect(styles).toContain('[data-slot="select-content"]');
    expect(styles).toContain("background: #fff !important");
    expect(styles).toContain("opacity: 1 !important");
    expect(styles).toContain("color: var(--neutral-800) !important");
  });

  it("mantém títulos em aberto como filtro operacional inicial", () => {
    expect(home).toContain('situacao: "ABERTAS"');
    expect(home).toContain('Em aberto (total ou parcial)');
    expect(home).toContain('Serviços executados');
    expect(home).toContain('Confirmados não executados');
  });

  it("deixa a ação de recebimento dentro de cada registro operacional", () => {
    expect(home).toContain('Registrar recebimento');
    expect(home).toContain('className="primary-action w-full lg:w-auto"');
    expect(home).toContain('filteredAccounts.map((account)');
    expect(home).not.toContain('<TableHead>ID / Cliente</TableHead><TableHead>Procedimento</TableHead><TableHead>Valor Total / Saldo</TableHead>');
  });

  it("posiciona a ação de recebimento em linha própria dentro da lista financeira", () => {
    expect(styles).toContain('.finance-grid .large-card .primary-action.w-full.lg\\:w-auto');
    expect(styles).toContain('grid-column: 1 / -1;');
    expect(styles).toContain('width: 100% !important;');
    expect(styles).toContain('justify-content: center;');
  });

  it("faz os filtros se adaptarem à largura interna do cartão sem cortar a última coluna", () => {
    expect(styles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(styles).toContain('@media (min-width: 1360px)');
    expect(styles).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');
    expect(styles).toContain('max-width: 100%;');
    expect(styles).toContain('overflow: hidden;');
    expect(styles).toContain('text-overflow: ellipsis;');
  });
});
