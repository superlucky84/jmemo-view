import { fFragment, fTags } from "lithent/ftags";
import { renderToString } from "lithent/ssr";
import { getThemeBootstrapScript } from "../theme.mjs";

const {
  html,
  head,
  meta,
  title,
  link,
  script,
  body,
  div,
  header,
  main,
  h1,
  h2,
  p,
  a,
  article,
  section,
  span,
  time,
  nav,
  button
} = fTags;

function makePageQuery(page, pageSize) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return `/?${params.toString()}`;
}

function ThemeToggle(theme) {
  const icon = theme === "dark" ? "☀️" : "🌙";
  const label = theme === "dark" ? "Light" : "Dark";
  return button(
    {
      id: "theme-toggle",
      class: "theme-toggle",
      type: "button",
      "aria-label": "테마 전환"
    },
    span({ class: "theme-icon" }, icon),
    label
  );
}

function AppDocument({ pageTitle, theme, content }) {
  const initialTheme = theme === "dark" ? "dark" : "light";

  return html(
    {
      lang: "ko",
      class: initialTheme === "dark" ? "dark" : "",
      "data-theme": initialTheme,
      style: `color-scheme:${initialTheme};`
    },
    head(
      {},
      meta({ charset: "UTF-8" }),
      meta({ name: "viewport", content: "width=device-width, initial-scale=1.0" }),
      title({}, pageTitle),
      script({}, getThemeBootstrapScript()),
      link({ rel: "stylesheet", href: "/assets/github-markdown.css" }),
      link({ rel: "stylesheet", href: "/assets/app.css" })
    ),
    body({}, content, script({ type: "module", src: "/assets/theme-toggle.js" }))
  );
}

function Topbar({ titleText, subtitleText, theme }) {
  return header(
    {
      class: "topbar"
    },
    div(
      {},
      h1({ class: "brand-title" }, titleText),
      subtitleText ? p({ class: "brand-sub" }, subtitleText) : null
    ),
    ThemeToggle(theme)
  );
}

function ReviewCard(item) {
  const tags = item.tags && item.tags.length > 0 ? item.tags : ["untagged"];

  return a(
    {
      href: `/notes/${item.id}`,
      class: "review-card-link",
      "aria-label": `${item.title} 상세 보기`
    },
    article(
      {
        class: "review-card"
      },
      h2({ class: "review-title" }, item.title),
      div(
        {
          class: "tag-row"
        },
        ...tags.map((tag) =>
          span(
            {
              class: "tag-chip",
              key: `${item.id}-${tag}`
            },
            tag
          )
        )
      ),
      div(
        {
          class: "date-row"
        },
        span({}, item.favorite ? "favorite" : "review"),
        time({}, item.dateLabel)
      )
    )
  );
}

function ListContent({ listResult, filterTags, theme }) {
  const { items, page, pageSize, total, hasNext } = listResult;
  const hasPrev = page > 1;
  const subtitle =
    filterTags.length > 0
      ? `category: ${filterTags.join(", ")}`
      : "category: all";

  const pager = nav(
    {
      class: "pagination",
      "aria-label": "페이지 이동"
    },
    hasPrev
      ? a({ href: makePageQuery(page - 1, pageSize), class: "pager-link" }, "Prev")
      : span({ class: "pager-disabled" }, "Prev"),
    span({}, `${page} / ${Math.max(1, Math.ceil(total / pageSize))}`),
    hasNext
      ? a({ href: makePageQuery(page + 1, pageSize), class: "pager-link" }, "Next")
      : span({ class: "pager-disabled" }, "Next")
  );

  return main(
    {
      class: "page-shell"
    },
    div(
      { class: "list-container" },
      Topbar({ titleText: "JW Review", subtitleText: subtitle, theme }),
      items.length > 0
        ? section(
            {
              class: "review-grid"
            },
            ...items.map((item) => ReviewCard(item))
          )
        : section(
            {
              class: "review-grid"
            },
            div({ class: "empty-card" }, "표시할 리뷰가 없습니다.")
          ),
      pager
    )
  );
}

function DetailContent({ review, noteHtml, theme }) {
  return main(
    {
      class: "page-shell"
    },
    section(
      {
        class: "detail-container"
      },
      Topbar({
        titleText: review.title,
        subtitleText: review.tags.length > 0
          ? `${review.tags.join(", ")}  ·  ${review.dateLabel}`
          : `untagged  ·  ${review.dateLabel}`,
        theme
      }),
      a({ href: "/", class: "back-link" }, "← 리스트로"),
      article(
        {
          class: "markdown-frame"
        },
        div({
          class: "markdown-body",
          innerHTML: noteHtml
        })
      )
    )
  );
}

function ErrorContent({ status, titleText, message, theme }) {
  return main(
    {
      class: "page-shell"
    },
    div(
      { class: "error-container" },
      Topbar({ titleText: "JW Review", subtitleText: `status: ${status}`, theme }),
      section(
        {
          class: "error-wrap"
        },
        h1({ class: "error-title" }, titleText),
        p({ class: "error-text" }, message),
        div(
          {
            class: "mt-4"
          },
          a({ href: "/", class: "back-link" }, "리스트로 이동")
        )
      )
    )
  );
}

function toHtml(documentWDom) {
  return `<!doctype html>${renderToString(documentWDom)}`;
}

export function renderListPage({ listResult, theme, filterTags }) {
  return toHtml(
    AppDocument({
      pageTitle: "JW Review - List",
      theme,
      content: ListContent({ listResult, filterTags, theme })
    })
  );
}

export function renderDetailPage({ review, noteHtml, theme }) {
  return toHtml(
    AppDocument({
      pageTitle: `JW Review - ${review.title}`,
      theme,
      content: DetailContent({ review, noteHtml, theme })
    })
  );
}

export function renderNotFoundPage({ theme, message = "요청한 페이지를 찾을 수 없습니다." }) {
  return toHtml(
    AppDocument({
      pageTitle: "JW Review - Not Found",
      theme,
      content: ErrorContent({
        status: 404,
        titleText: "404 Not Found",
        message,
        theme
      })
    })
  );
}

export function renderErrorPage({
  theme,
  message = "일시적인 오류가 발생했습니다.",
  status = 500
}) {
  const normalizedStatus =
    Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;

  return toHtml(
    AppDocument({
      pageTitle: "JW Review - Error",
      theme,
      content: ErrorContent({
        status: normalizedStatus,
        titleText: `${normalizedStatus} Error`,
        message,
        theme
      })
    })
  );
}
