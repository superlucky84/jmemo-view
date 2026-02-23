import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectMongo, disconnectMongo, pingMongo } from "../../server/db.mjs";
import { resolveAppEnv } from "../../server/env.mjs";
import { JmemoModel } from "../../server/models/jmemo-model.mjs";
import { createReviewService } from "../../server/services/review-service.mjs";

const RUN_ATLAS_INTEGRATION = process.env.RUN_ATLAS_INTEGRATION === "1";
const describeAtlas = RUN_ATLAS_INTEGRATION ? describe : describe.skip;

describeAtlas("atlas integration", () => {
  let service = null;
  let config = null;

  beforeAll(async () => {
    config = resolveAppEnv(process.env, { requireMongoUri: true });
    await connectMongo(config.mongoUri, config.mongoDbName);
    service = createReviewService({
      JmemoModel,
      categoryFilterTags: config.categoryFilterTags
    });
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  it("pings atlas successfully", async () => {
    await expect(pingMongo()).resolves.toBeUndefined();
  });

  it("loads first page from atlas with list contract", async () => {
    const result = await service.listReviews({
      page: 1,
      pageSize: 10
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(typeof result.total).toBe("number");
    expect(typeof result.hasNext).toBe("boolean");
    expect(Array.isArray(result.items)).toBe(true);

    if (result.items.length > 0) {
      const first = result.items[0];
      expect(typeof first.id).toBe("string");
      expect(typeof first.title).toBe("string");
      expect(typeof first.dateLabel).toBe("string");
      expect(Array.isArray(first.tags)).toBe(true);
    }
  });
});
