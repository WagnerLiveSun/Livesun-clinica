export type CalendarReference = "profissional" | "sala" | "procedimento";

export type CalendarSession = {
  profissionalNome: string | null;
  salaNome: string | null;
  servicoNome: string | null;
};

export function getCalendarGroupLabel(session: CalendarSession, reference: CalendarReference) {
  if (reference === "profissional") return session.profissionalNome || "Profissional não informado";
  if (reference === "sala") return session.salaNome || "Sem sala definida";
  return session.servicoNome || "Procedimento não informado";
}

export function groupScheduleByReference<T extends CalendarSession>(sessions: T[], reference: CalendarReference) {
  return sessions.reduce<Array<{ label: string; sessions: T[] }>>((groups, session) => {
    const label = getCalendarGroupLabel(session, reference);
    const existing = groups.find((group) => group.label === label);
    if (existing) existing.sessions.push(session);
    else groups.push({ label, sessions: [session] });
    return groups;
  }, []);
}
