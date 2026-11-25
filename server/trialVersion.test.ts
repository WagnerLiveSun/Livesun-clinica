import express from "express";
import { describe, expect, it } from "vitest";
import { registerTrialVersion } from "./trialVersion";

describe("identificação da versão do trial", () => {
  it("retorna somente a versão, sem cache", async () => {
    const app = express();
    registerTrialVersion(app);
    const server = app.listen(0, "127.0.0.1");
    try {
      await new Promise<void>(resolve => server.once("listening", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("porta indisponível");
      const response = await fetch(`http://127.0.0.1:${address.port}/api/status/trial`);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ trialVersion: "20261125-1", welcomeVersion: "20261125-1" });
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});