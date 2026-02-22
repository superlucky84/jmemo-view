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
});
