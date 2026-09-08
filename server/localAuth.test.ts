import { describe, expect, it } from "vitest";
import { createLocalSessionToken, getLocalSessionUserId } from "./localAuth";

describe("sessão local", () => {
  it("emite um token que identifica o usuário correto", async () => {
    const token = await createLocalSessionToken(42);

    await expect(getLocalSessionUserId(token)).resolves.toBe(42);
  });

  it("rejeita token alterado ou ausente", async () => {
    const token = await createLocalSessionToken(7);

    await expect(getLocalSessionUserId()).resolves.toBeNull();
    await expect(getLocalSessionUserId(`${token}invalid`)).resolves.toBeNull();
  });
});
