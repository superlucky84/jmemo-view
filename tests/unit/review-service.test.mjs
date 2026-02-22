import { describe, expect, it } from "vitest";
import { createReviewService } from "../../server/services/review-service.mjs";

function createMockModel({ listItems = [], detailItem = null, total = 0 } = {}) {
  const calls = {
    listFilter: null,
    listProjection: null,
    listSort: null,
    listSkip: null,
    listLimit: null,
    detailFilter: null,
    detailProjection: null,
    countFilter: null
  };

  return {
    calls,
    find(filter, projection) {
      calls.listFilter = filter;
      calls.listProjection = projection;
      return {
        sort(sort) {
          calls.listSort = sort;
          return this;
        },
        skip(skip) {
          calls.listSkip = skip;
          return this;
        },
        limit(limit) {
          calls.listLimit = limit;
          return this;
        },
        async lean() {
          return listItems;
        }
      };
    },
    async countDocuments(filter) {
      calls.countFilter = filter;
      return total;
    },
    findOne(filter, projection) {
      calls.detailFilter = filter;
      calls.detailProjection = projection;
      return {
        async lean() {
          return detailItem;
        }
      };
    }
  };
}

describe("review service", () => {
  it("applies filter, sort and pagination contract on list query", async () => {
    const model = createMockModel({
      listItems: [
        {
          _id: "65f111111111111111111111",
          title: "A",
          regdate: new Date("2026-02-22T00:00:00.000Z"),
          favorite: true,
          category: ["review"]
        }
      ],
      total: 35
    });

    const service = createReviewService({
      JmemoModel: model,
      categoryFilterTags: ["review"]
    });

    const result = await service.listReviews({ page: "2", pageSize: "10" });

    expect(model.calls.listFilter).toEqual({ category: { $in: ["review"] } });
    expect(model.calls.countFilter).toEqual({ category: { $in: ["review"] } });
    expect(model.calls.listSort).toEqual({ favorite: -1, regdate: -1, _id: -1 });
    expect(model.calls.listSkip).toBe(10);
    expect(model.calls.listLimit).toBe(10);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.total).toBe(35);
    expect(result.hasNext).toBe(true);
    expect(result.items[0]).toMatchObject({
      id: "65f111111111111111111111",
      title: "A",
      favorite: true,
      tags: ["review"]
    });
  });

  it("throws 400 for invalid page and pageSize", async () => {
    const model = createMockModel();
    const service = createReviewService({
      JmemoModel: model,
      categoryFilterTags: ["review"]
    });

    await expect(service.listReviews({ page: 0 })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400
    });

    await expect(service.listReviews({ pageSize: 101 })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400
    });
  });

  it("returns empty dataset contract without error", async () => {
    const model = createMockModel({
      listItems: [],
      total: 0
    });
    const service = createReviewService({
      JmemoModel: model,
      categoryFilterTags: ["review"]
    });

    const result = await service.listReviews({ page: 1, pageSize: 30 });

    expect(result).toEqual({
      items: [],
      page: 1,
      pageSize: 30,
      total: 0,
      hasNext: false
    });
  });

  it("disables category filter when filter tags are empty", async () => {
    const model = createMockModel({
      listItems: [],
      total: 0
    });
    const service = createReviewService({
      JmemoModel: model,
      categoryFilterTags: []
    });

    await service.listReviews({ page: 1, pageSize: 10 });
    expect(model.calls.listFilter).toEqual({});
    expect(model.calls.countFilter).toEqual({});
  });

  it("handles special character tags and pagination boundary", async () => {
    const model = createMockModel({
      listItems: [
        {
          _id: "65f111111111111111111111",
          title: "Special",
          regdate: new Date("2026-02-22T00:00:00.000Z"),
          favorite: false,
          category: ["review", "a+b", "tag.with.dot", "tag_slash/name"]
        }
      ],
      total: 20
    });
    const service = createReviewService({
      JmemoModel: model,
      categoryFilterTags: ["review"]
    });

    const result = await service.listReviews({ page: 2, pageSize: 10 });

    expect(result.hasNext).toBe(false);
    expect(result.items[0].tags).toEqual(["review", "a+b", "tag.with.dot", "tag_slash/name"]);
  });

  it("throws 404 for invalid detail id format", async () => {
    const model = createMockModel();
    const service = createReviewService({ JmemoModel: model });

    await expect(service.getReviewById("not-object-id")).rejects.toMatchObject({
      code: "INVALID_ID_FORMAT",
      status: 404
    });
  });

  it("throws 404 when detail document does not exist", async () => {
    const model = createMockModel({ detailItem: null });
    const service = createReviewService({
      JmemoModel: model,
      categoryFilterTags: ["review"]
    });

    await expect(service.getReviewById("65f111111111111111111111")).rejects.toMatchObject({
      code: "NOTE_NOT_FOUND",
      status: 404
    });

    expect(model.calls.detailFilter).toEqual({
      _id: "65f111111111111111111111",
      category: { $in: ["review"] }
    });
  });

  it("returns detail payload with title/tags/date/note", async () => {
    const model = createMockModel({
      detailItem: {
        _id: "65f111111111111111111111",
        title: "Detail",
        note: "# heading",
        regdate: new Date("2026-02-22T00:00:00.000Z"),
        favorite: false,
        category: ["review", "share"]
      }
    });

    const service = createReviewService({
      JmemoModel: model,
      categoryFilterTags: ["review"]
    });

    const detail = await service.getReviewById("65f111111111111111111111");

    expect(detail).toMatchObject({
      id: "65f111111111111111111111",
      title: "Detail",
      note: "# heading",
      favorite: false,
      tags: ["review", "share"]
    });
  });
});
