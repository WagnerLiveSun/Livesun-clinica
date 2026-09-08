import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const bookingSource = readFileSync(new URL("../client/src/pages/Booking.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

describe("estrutura responsiva do autoagendamento", () => {
  it("mantém consultas de slots e mensagens de carregamento, vazio e erro no portal", () => {
    expect(bookingSource).toContain("agendamentoPublico.disponibilidade.useQuery");
    expect(bookingSource).toContain("Buscando horários disponíveis...");
    expect(bookingSource).toContain("Não há horários sem conflito nesta data.");
    expect(bookingSource).toContain("Não foi possível consultar a agenda. Tente novamente.");
    expect(bookingSource).toContain("Nenhum profissional disponível");
    expect(bookingSource).toContain("Ainda não há profissional ativo vinculado a este serviço");
  });

  it("declara regras móveis específicas para o shell e o cartão do portal público", () => {
    expect(stylesSource).toMatch(/@media\s*\(max-width:\s*760px\)/);
    expect(stylesSource).toContain(".booking-shell");
    expect(stylesSource).toContain(".booking-card");
  });
});
