import { describe, expect, it } from "vitest";
import { groupScheduleByReference } from "../client/src/lib/calendar";

const sessions = [
  { profissionalNome: "Aline", salaNome: "Sala 01", servicoNome: "Limpeza de pele" },
  { profissionalNome: "Aline", salaNome: "Sala 02", servicoNome: "Peeling" },
  { profissionalNome: "Bruno", salaNome: "Sala 01", servicoNome: "Limpeza de pele" },
];

describe("groupScheduleByReference", () => {
  it("agrupa a agenda por profissional", () => {
    expect(groupScheduleByReference(sessions, "profissional")).toEqual([
      { label: "Aline", sessions: [sessions[0], sessions[1]] },
      { label: "Bruno", sessions: [sessions[2]] },
    ]);
  });

  it("reorganiza a agenda por sala ou procedimento", () => {
    expect(groupScheduleByReference(sessions, "sala").map((group) => group.label)).toEqual(["Sala 01", "Sala 02"]);
    expect(groupScheduleByReference(sessions, "procedimento").map((group) => group.label)).toEqual(["Limpeza de pele", "Peeling"]);
  });
});
