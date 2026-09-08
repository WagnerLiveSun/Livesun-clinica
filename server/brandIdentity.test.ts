import { describe, expect, it } from "vitest";

describe("identidade configurada", () => {
  it("expõe SunSet como título público do aplicativo", () => {
    expect(process.env.VITE_APP_TITLE).toBe("SunSet");
  });
});
