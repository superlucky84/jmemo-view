import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
  typographer: true
});

function sanitizeRenderedHtml(html) {
  return String(html ?? "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
}

export function renderMarkdownToHtml(markdownText) {
  const rendered = markdown.render(String(markdownText ?? ""));
  return sanitizeRenderedHtml(rendered);
}
