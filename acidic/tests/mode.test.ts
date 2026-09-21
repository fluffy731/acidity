import { describe, expect, it } from "vitest";
import { appMode, liveConfigured } from "../src/lib/mode";

describe("mode guard", () => {
  it("defaults to preview and rejects anything else", () => {
    expect(appMode(undefined)).toBe("preview");
    expect(appMode("live")).toBe("live");
    expect(() => appMode("staging")).toThrow();
  });
  it("only calls live configured with a database, a real secret and one HTTPS origin", () => {
    const good = { DATABASE_URL: "postgres://x", AUTH_SECRET: "a".repeat(32), APP_URL: "https://acidic.acidity.com.au", AUTH_URL: "https://acidic.acidity.com.au" };
    expect(liveConfigured(good)).toBe(true);
    expect(liveConfigured({ ...good, AUTH_SECRET: "short" })).toBe(false);
    expect(liveConfigured({ ...good, AUTH_URL: "https://other.example" })).toBe(false);
    expect(liveConfigured({ ...good, APP_URL: "http://acidic.acidity.com.au", AUTH_URL: "http://acidic.acidity.com.au" })).toBe(false);
    expect(liveConfigured({ ...good, APP_URL: "http://localhost:3000", AUTH_URL: "http://localhost:3000" })).toBe(true);
    expect(liveConfigured({ ...good, DATABASE_URL: "" })).toBe(false);
  });
});
