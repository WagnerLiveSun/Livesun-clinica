/** Permite delegar apenas o envio da outbox ao worker externo, sem desligar o Central. */
export function shouldDispatchCentralOutbox(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CENTRAL_ENABLED === "true" && env.CENTRAL_OUTBOX_WORKER !== "external";
}