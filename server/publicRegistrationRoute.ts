import express, { type Express } from "express";
import { TRPCError } from "@trpc/server";
import { cadastroClinicaRouter } from "./cadastroClinica";

/** Somente operações públicas de cadastro, sem cookies e sem acesso ao restante do tRPC. */
export function registerPublicRegistrationRoute(app: Express, allowedOrigins = ["https://livesun.com.br", "https://www.livesun.com.br"]) {
  const paths = ["solicitar", "reenviar", "confirmar", "concluir"] as const;
  for (const action of paths) {
    const path = `/api/public/cadastro-clinica/${action}`;
    const cors: express.RequestHandler = (req, res, next) => {
      res.vary("Origin");
      res.set("Cache-Control", "no-store");
      const origin = req.get("Origin");
      if (!origin || !allowedOrigins.includes(origin)) return void res.sendStatus(403);
      res.set("Access-Control-Allow-Origin", origin);
      if (req.method === "OPTIONS") {
        if (req.get("Access-Control-Request-Method") !== "POST") return void res.sendStatus(405);
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        return void res.sendStatus(204);
      }
      if (!req.is("application/json")) return void res.sendStatus(415);
      next();
    };
    app.options(path, cors);
    app.post(path, cors, express.json({ limit: "8kb" }), async (req: express.Request, res: express.Response) => {
      try {
        const caller = cadastroClinicaRouter.createCaller({ user: null, req, res });
        const result = await caller[action](req.body);
        // Tokens de homologação nunca são devolvidos por este endpoint público.
        return res.json({ success: result.success });
      } catch (error) {
        const known = error instanceof TRPCError;
        const status = known && error.code === "BAD_REQUEST" ? 400 : known && error.code === "CONFLICT" ? 409 : 503;
        const message = status === 400 ? "Dados inválidos ou link expirado. Confira e tente novamente." : status === 409 ? "Não foi possível concluir o cadastro. Entre em contato com a LiveSun." : "Cadastro temporariamente indisponível. Tente novamente mais tarde.";
        return res.status(status).json({ error: message });
      }
    }, (_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(400).json({ error: "Dados inválidos. Confira e tente novamente." });
    });
  }
}