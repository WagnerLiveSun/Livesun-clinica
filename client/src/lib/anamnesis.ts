export type AnamnesisAnswer = {
  respostaTexto: string | null;
  respostaBoolean: boolean | null;
  respostaNumero: string | null;
  respostaData: string | null;
  respostaJson: string | null;
};

export function formatAnamnesisAnswer(answer: AnamnesisAnswer | null, formatDate: (value: string) => string) {
  if (!answer) return "Não respondida";
  if (answer.respostaBoolean !== null) return answer.respostaBoolean ? "Sim" : "Não";
  if (answer.respostaTexto) return answer.respostaTexto;
  if (answer.respostaNumero) return answer.respostaNumero;
  if (answer.respostaData) return formatDate(answer.respostaData);
  if (answer.respostaJson) {
    try {
      const value = JSON.parse(answer.respostaJson);
      return Array.isArray(value) ? value.join(", ") : String(value);
    } catch {
      return answer.respostaJson;
    }
  }
  return "Não respondida";
}
