import { describe, expect, it } from "vitest";
import { renderMarkdownToHtml } from "../../server/markdown.mjs";

describe("markdown renderer", () => {
  it("renders heading/list/code/table/blockquote elements", () => {
    const source = [
      "# Heading",
      "",
      "- one",
      "- two",
      "",
      "> quote",
      "",
      "| a | b |",
      "| - | - |",
      "| 1 | 2 |",
      "",
      "```js",
      "console.log('ok')",
      "```"
    ].join("\n");

    const html = renderMarkdownToHtml(source);

    expect(html).toContain("<h1>Heading</h1>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<table>");
    expect(html).toContain("<pre><code");
  });

  it("removes script tags and inline event handlers", () => {
    const source = [
      "# Title",
      "",
      "<script>alert('xss')</script>",
      "<img src=\"x\" onerror=\"alert('xss')\" />",
      "<div onclick='alert(1)'>click</div>",
      "<p>safe</p>"
    ].join("\n");

    const html = renderMarkdownToHtml(source);

    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror=");
    expect(html).not.toContain("onclick=");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<p>safe</p>");
  });

  it("blocks javascript protocol links in href/src", () => {
    const source = [
      "[bad](javascript:alert(1))",
      "",
      "<a href='javascript:alert(1)'>bad-link</a>",
      "<img src=\"javascript:alert(2)\" onload=\"alert(3)\" />"
    ].join("\n");

    const html = renderMarkdownToHtml(source);

    expect(html).not.toContain("href=\"javascript:");
    expect(html).not.toContain("href='javascript:");
    expect(html).not.toContain("src=\"javascript:");
    expect(html).toMatch(/href=['"]#['"]/);
    expect(html).toContain("bad-link");
  });

  it("renders long markdown content without truncation", () => {
    const lines = Array.from({ length: 200 }, (_, index) => `- item-${index + 1}`).join("\n");
    const source = ["# Long Doc", "", lines, "", "ending paragraph"].join("\n");

    const html = renderMarkdownToHtml(source);

    expect(html).toContain("<h1>Long Doc</h1>");
    expect(html).toContain("item-200");
    expect(html).toContain("ending paragraph");
  });
});
