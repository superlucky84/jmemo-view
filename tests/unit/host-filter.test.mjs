import { describe, expect, it } from "vitest";
import { resolveCategoryFilterTagsByHostname } from "../../server/host-filter.mjs";

describe("host filter resolver", () => {
  it("returns review when hostname starts with review", () => {
    expect(resolveCategoryFilterTagsByHostname("review.example.com", ["share"]))
      .toEqual(["review"]);
  });

  it("returns share when hostname starts with share", () => {
    expect(resolveCategoryFilterTagsByHostname("share.example.com", ["review"]))
      .toEqual(["share"]);
  });

  it("falls back to env tags when hostname has no review/share prefix", () => {
    expect(resolveCategoryFilterTagsByHostname("memo.example.com", ["review", "share"]))
      .toEqual(["review", "share"]);
  });

  it("returns empty array when no hostname match and fallback is empty", () => {
    expect(resolveCategoryFilterTagsByHostname("localhost", []))
      .toEqual([]);
  });
});
