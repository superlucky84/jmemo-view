import { describe, expect, it } from "vitest";
import { resolveRequestTheme } from "../../server/theme.mjs";

describe("theme resolver", () => {
  it("uses cookie theme when provided", () => {
    const req = {
      headers: {
        cookie: "a=1; jmemo_theme=dark; b=2"
      }
    };

    expect(resolveRequestTheme(req)).toBe("dark");
  });

  it("falls back to client hint", () => {
    const req = {
      headers: {
        "sec-ch-prefers-color-scheme": "dark"
      }
    };

    expect(resolveRequestTheme(req)).toBe("dark");
  });

  it("falls back to light", () => {
    expect(resolveRequestTheme({ headers: {} })).toBe("light");
  });
});
