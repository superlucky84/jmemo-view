import { describe, expect, it } from "vitest";
import { parseCategoryFilter, resolveAppEnv, validateMongoUri } from "../../server/env.mjs";

describe("env parser", () => {
  it("parses category filter list", () => {
    const parsed = parseCategoryFilter("review, share,  note");
    expect(parsed.tags).toEqual(["review", "share", "note"]);
  });

  it("uses default category when key is missing", () => {
    const parsed = parseCategoryFilter(undefined);
    expect(parsed.tags).toEqual(["review"]);
  });

  it("disables filter when empty string is provided", () => {
    const parsed = parseCategoryFilter("   ");
    expect(parsed.tags).toEqual([]);
  });

  it("rejects missing mongo uri", () => {
    expect(() => validateMongoUri("")).toThrowError("Missing MONGODB_URI");
  });

  it("resolves env with defaults", () => {
    const config = resolveAppEnv(
      {
        MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
      },
      { requireMongoUri: true }
    );

    expect(config.port).toBe(4000);
    expect(config.categoryFilterTags).toEqual(["review"]);
  });

  it("keeps category filter disabled when env key is empty", () => {
    const config = resolveAppEnv(
      {
        MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority",
        JMEMO_CATEGORY_FILTER: ""
      },
      { requireMongoUri: true }
    );

    expect(config.categoryFilterTags).toEqual([]);
  });
});
