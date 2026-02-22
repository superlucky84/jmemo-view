import { describe, expect, it } from "vitest";
import { renderDetailPage, renderListPage } from "../../server/ssr/pages.mjs";

function normalizeSnapshotHtml(html) {
  return String(html).replace(/\s+/g, " ").trim();
}

describe("ssr pages", () => {
  it("renders list page with card information", () => {
    const html = renderListPage({
      listResult: {
        items: [
          {
            id: "65f111111111111111111111",
            title: "Sample Title",
            dateLabel: "2026-2-22",
            favorite: false,
            tags: ["review"]
          }
        ],
        page: 1,
        pageSize: 30,
        total: 1,
        hasNext: false
      },
      theme: "dark",
      filterTags: ["review"]
    });

    expect(html).toContain("Sample Title");
    expect(html).toContain("review-card");
    expect(html).toContain("theme-toggle");
    expect(html).toContain('href="/notes/65f111111111111111111111"');
    expect(html).toContain("review-card-link");
    expect(normalizeSnapshotHtml(html)).toMatchSnapshot();
  });

  it("renders detail page with markdown wrapper", () => {
    const html = renderDetailPage({
      review: {
        id: "65f111111111111111111111",
        title: "Detail",
        note: "# hello",
        dateLabel: "2026-2-22",
        favorite: false,
        tags: ["review"]
      },
      noteHtml: "<h1>hello</h1>",
      theme: "light"
    });

    expect(html).toContain("markdown-body");
    expect(html).toContain("<h1>hello</h1>");
    expect(normalizeSnapshotHtml(html)).toMatchSnapshot();
  });
});
