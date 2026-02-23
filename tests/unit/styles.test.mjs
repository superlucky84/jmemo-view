import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("style contract", () => {
  it("keeps responsive list/detail breakpoints and desktop max width", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles/app.css"), "utf8");

    expect(css).toContain(".review-grid");
    expect(css).toContain("sm:grid-cols-2");
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toContain(".markdown-frame");
    expect(css).toContain("max-width: 800px;");
  });
});
