import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/app.mjs";
import { resolveAppEnv } from "../../server/env.mjs";
import { createReviewService } from "../../server/services/review-service.mjs";

function matchesCategoryFilter(item, filter) {
  if (!filter?.category?.$in?.length) {
    return true;
  }

  const categories = Array.isArray(item.category) ? item.category : [];
  return categories.some((tag) => filter.category.$in.includes(tag));
}

function createInMemoryJmemoModel(seedItems) {
  const data = seedItems.map((item) => ({ ...item }));

  function project(item, projection = {}) {
    const projected = { _id: item._id };
    for (const [key, enabled] of Object.entries(projection)) {
      if (enabled) {
        projected[key] = item[key];
      }
    }
    return projected;
  }

  function sortItems(items, sort) {
    const entries = Object.entries(sort || {});
    if (entries.length === 0) {
      return items;
    }

    return [...items].sort((a, b) => {
      for (const [field, dir] of entries) {
        const factor = dir === -1 ? -1 : 1;
        const av = a[field];
        const bv = b[field];

        if (av > bv) {
          return 1 * factor;
        }
        if (av < bv) {
          return -1 * factor;
        }
      }
      return 0;
    });
  }

  return {
    find(filter = {}, projection = {}) {
      let working = data.filter((item) => matchesCategoryFilter(item, filter));
      let skipValue = 0;
      let limitValue = working.length;

      return {
        sort(sort) {
          working = sortItems(working, sort);
          return this;
        },
        skip(skip) {
          skipValue = skip;
          return this;
        },
        limit(limit) {
          limitValue = limit;
          return this;
        },
        async lean() {
          return working.slice(skipValue, skipValue + limitValue).map((item) => project(item, projection));
        }
      };
    },
    async countDocuments(filter = {}) {
      return data.filter((item) => matchesCategoryFilter(item, filter)).length;
    },
    findOne(filter = {}, projection = {}) {
      return {
        async lean() {
          const found = data.find((item) => {
            const idMatch = filter._id ? String(item._id) === String(filter._id) : true;
            return idMatch && matchesCategoryFilter(item, filter);
          });

          if (!found) {
            return null;
          }

          return project(found, projection);
        }
      };
    }
  };
}

function createMockRes() {
  const headers = {};

  return {
    statusCode: 200,
    text: "",
    body: null,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
      return this;
    },
    getHeader(name) {
      return headers[String(name).toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    type(contentType) {
      this.setHeader("content-type", contentType);
      return this;
    },
    json(payload) {
      this.body = payload;
      this.text = JSON.stringify(payload);
      this.setHeader("content-type", "application/json; charset=utf-8");
      return this;
    },
    send(payload) {
      this.text = typeof payload === "string" ? payload : String(payload ?? "");
      return this;
    },
    redirect(codeOrUrl, maybeUrl) {
      if (typeof codeOrUrl === "number") {
        this.statusCode = codeOrUrl;
        this.setHeader("location", maybeUrl);
      } else {
        this.statusCode = 302;
        this.setHeader("location", codeOrUrl);
      }
      return this;
    }
  };
}

function getRouteHandler(app, path) {
  const layer = app.router.stack.find(
    (item) => item.route?.path === path && item.route.methods?.get
  );

  if (!layer) {
    throw new Error(`Route not found: GET ${path}`);
  }

  return layer.route.stack[0].handle;
}

async function invokeHandler(handler, reqOverrides = {}) {
  const req = {
    headers: {},
    query: {},
    params: {},
    originalUrl: reqOverrides.originalUrl || reqOverrides.url || "/",
    ...reqOverrides
  };
  const res = createMockRes();
  let nextError = null;
  await handler(req, res, (error) => {
    if (error) {
      nextError = error;
    }
  });
  return { req, res, nextError };
}

describe("integration scenarios", () => {
  const seedItems = [
    {
      _id: "65f111111111111111111111",
      title: "Review A",
      note: "# review a",
      regdate: new Date("2026-02-22T00:00:00.000Z"),
      favorite: true,
      category: ["review"]
    },
    {
      _id: "65f222222222222222222222",
      title: "Share B",
      note: "# share b",
      regdate: new Date("2026-02-20T00:00:00.000Z"),
      favorite: false,
      category: ["share"]
    }
  ];

  it("A: review filter list -> detail navigation flow", async () => {
    const config = resolveAppEnv(
      {
        MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority",
        JMEMO_CATEGORY_FILTER: "review"
      },
      { requireMongoUri: true }
    );

    const reviewService = createReviewService({
      JmemoModel: createInMemoryJmemoModel(seedItems),
      categoryFilterTags: config.categoryFilterTags
    });
    const app = createApp({
      reviewService,
      config,
      readinessCheck: async () => ({ ok: true })
    });

    const list = await invokeHandler(getRouteHandler(app, "/"), {
      url: "/",
      query: { page: "1", pageSize: "30" }
    });
    expect(list.res.statusCode).toBe(200);
    expect(list.res.text).toContain("Review A");
    expect(list.res.text).not.toContain("Share B");

    const detail = await invokeHandler(getRouteHandler(app, "/notes/:id"), {
      url: "/notes/65f111111111111111111111",
      params: { id: "65f111111111111111111111" }
    });
    expect(detail.res.statusCode).toBe(200);
    expect(detail.res.text).toContain("review a");
  });

  it("B: env filter change modifies list result without code change", async () => {
    const reviewConfig = resolveAppEnv(
      {
        MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority",
        JMEMO_CATEGORY_FILTER: "review"
      },
      { requireMongoUri: true }
    );
    const shareConfig = resolveAppEnv(
      {
        MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority",
        JMEMO_CATEGORY_FILTER: "share"
      },
      { requireMongoUri: true }
    );

    const reviewOnly = createReviewService({
      JmemoModel: createInMemoryJmemoModel(seedItems),
      categoryFilterTags: reviewConfig.categoryFilterTags
    });
    const shareOnly = createReviewService({
      JmemoModel: createInMemoryJmemoModel(seedItems),
      categoryFilterTags: shareConfig.categoryFilterTags
    });

    const reviewList = await reviewOnly.listReviews({ page: 1, pageSize: 30 });
    const shareList = await shareOnly.listReviews({ page: 1, pageSize: 30 });

    expect(reviewList.items.map((item) => item.title)).toEqual(["Review A"]);
    expect(shareList.items.map((item) => item.title)).toEqual(["Share B"]);
  });

  it("C: theme toggle persists after reconnect (reload)", () => {
    const script = readFileSync(resolve(process.cwd(), "public/assets/theme-toggle.js"), "utf8");

    const first = new JSDOM(
      `<!doctype html><html><body><button id="theme-toggle"></button></body></html>`,
      { url: "https://jmemo.local/", runScripts: "outside-only" }
    );
    first.window.matchMedia = () => ({ matches: false });
    first.window.eval(script);
    first.window.dispatchEvent(new first.window.Event("DOMContentLoaded"));
    first.window.document.getElementById("theme-toggle").click();

    const persistedTheme = first.window.localStorage.getItem("jmemo_theme");
    const persistedCookie = first.window.document.cookie;

    const second = new JSDOM(
      `<!doctype html><html><body><button id="theme-toggle"></button></body></html>`,
      { url: "https://jmemo.local/", runScripts: "outside-only" }
    );
    second.window.matchMedia = () => ({ matches: false });
    second.window.localStorage.setItem("jmemo_theme", persistedTheme);
    second.window.document.cookie = persistedCookie;
    second.window.eval(script);
    second.window.dispatchEvent(new second.window.Event("DOMContentLoaded"));

    expect(second.window.document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("D: mobile/pc layout contract and max width are present", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles/app.css"), "utf8");
    expect(css).toContain("sm:grid-cols-2");
    expect(css).toContain("max-width: 768px;");
  });
});
