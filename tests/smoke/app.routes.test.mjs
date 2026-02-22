import { describe, expect, it } from "vitest";
import { createApp } from "../../server/app.mjs";

function createMockReviewService() {
  return {
    async listReviews() {
      return {
        items: [
          {
            id: "65f111111111111111111111",
            title: "Mock Title",
            dateLabel: "2026-2-22",
            favorite: true,
            tags: ["review"]
          }
        ],
        page: 1,
        pageSize: 30,
        total: 1,
        hasNext: false
      };
    },
    async getReviewById(id) {
      if (!/^[a-f\d]{24}$/i.test(id)) {
        const error = new Error("Invalid note id format");
        error.code = "INVALID_ID_FORMAT";
        error.status = 404;
        throw error;
      }

      return {
        id,
        title: "Detail Title",
        note: "# hello",
        dateLabel: "2026-2-22",
        favorite: true,
        tags: ["review"]
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
    headers,
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
      if (typeof payload === "string") {
        this.text = payload;
      } else if (payload != null) {
        this.body = payload;
        this.text = String(payload);
      }
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

function getNotFoundMiddleware(app) {
  const stack = app.router.stack;
  return stack[stack.length - 2].handle;
}

function getErrorMiddleware(app) {
  const stack = app.router.stack;
  return stack[stack.length - 1].handle;
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
  let nextCalled = false;
  let nextError = null;

  await handler(req, res, (error) => {
    nextCalled = true;
    if (error) {
      nextError = error;
    }
  });

  return { req, res, nextCalled, nextError };
}

async function invokeErrorMiddleware(app, error, reqOverrides = {}) {
  const req = {
    headers: {},
    originalUrl: reqOverrides.originalUrl || reqOverrides.url || "/",
    ...reqOverrides
  };
  const res = createMockRes();
  const handler = getErrorMiddleware(app);
  await handler(error, req, res, () => {});
  return res;
}

describe("app routes", () => {
  it("returns live and ready routes", async () => {
    const app = createApp({
      reviewService: createMockReviewService(),
      config: { categoryFilterTags: ["review"] },
      readinessCheck: async () => ({ ok: true })
    });

    const liveHandler = getRouteHandler(app, "/health/live");
    const readyHandler = getRouteHandler(app, "/health/ready");

    const [live, ready] = await Promise.all([
      invokeHandler(liveHandler, { url: "/health/live" }),
      invokeHandler(readyHandler, { url: "/health/ready" })
    ]);

    expect(live.res.statusCode).toBe(200);
    expect(live.res.body.ok).toBe(true);
    expect(ready.res.statusCode).toBe(200);
    expect(ready.res.body.ok).toBe(true);
  });

  it("returns 503 when readiness fails", async () => {
    const app = createApp({
      reviewService: createMockReviewService(),
      config: { categoryFilterTags: ["review"] },
      readinessCheck: async () => ({ ok: false, message: "DB down" })
    });

    const readyHandler = getRouteHandler(app, "/health/ready");
    const ready = await invokeHandler(readyHandler, { url: "/health/ready" });
    expect(ready.nextError?.status).toBe(503);

    const errorRes = await invokeErrorMiddleware(app, ready.nextError, {
      url: "/health/ready"
    });
    expect(errorRes.statusCode).toBe(503);
    expect(errorRes.text).toContain("status: 503");
    expect(errorRes.text).toContain("503 Error");
  });

  it("renders list and detail pages", async () => {
    const app = createApp({
      reviewService: createMockReviewService(),
      config: { categoryFilterTags: ["review"] },
      readinessCheck: async () => ({ ok: true })
    });

    const listHandler = getRouteHandler(app, "/");
    const detailHandler = getRouteHandler(app, "/notes/:id");

    const [list, detail] = await Promise.all([
      invokeHandler(listHandler, { url: "/", query: {} }),
      invokeHandler(detailHandler, {
        url: "/notes/65f111111111111111111111",
        params: { id: "65f111111111111111111111" }
      })
    ]);

    expect(list.res.statusCode).toBe(200);
    expect(list.res.text).toContain("Mock Title");
    expect(list.res.text).toContain("review-card-link");
    expect(detail.res.statusCode).toBe(200);
    expect(detail.res.text).toContain("markdown-body");
    expect(detail.res.text).toContain("Detail Title");
  });

  it("supports legacy alias redirect and 404", async () => {
    const app = createApp({
      reviewService: createMockReviewService(),
      config: { categoryFilterTags: ["review"] },
      readinessCheck: async () => ({ ok: true })
    });

    const aliasHandler = getRouteHandler(app, "/:id");
    const detailHandler = getRouteHandler(app, "/notes/:id");
    const notFound = getNotFoundMiddleware(app);

    const [alias, invalidAlias, invalidDetail] = await Promise.all([
      invokeHandler(aliasHandler, {
        url: "/65f111111111111111111111",
        params: { id: "65f111111111111111111111" }
      }),
      invokeHandler(aliasHandler, {
        url: "/not-a-note-id",
        params: { id: "not-a-note-id" }
      }),
      invokeHandler(detailHandler, {
        url: "/notes/not-an-object-id",
        params: { id: "not-an-object-id" }
      })
    ]);

    expect(alias.res.statusCode).toBe(302);
    expect(alias.res.getHeader("location")).toBe("/notes/65f111111111111111111111");
    expect(invalidAlias.nextCalled).toBe(true);
    expect(invalidAlias.nextError).toBeNull();
    expect(invalidDetail.nextError?.status).toBe(404);

    const detailErrorRes = await invokeErrorMiddleware(app, invalidDetail.nextError, {
      url: "/notes/not-an-object-id"
    });
    expect(detailErrorRes.statusCode).toBe(404);

    const notFoundRes = createMockRes();
    await notFound({ headers: {}, originalUrl: "/unknown-path" }, notFoundRes);
    expect(notFoundRes.statusCode).toBe(404);
    expect(notFoundRes.text).toContain("/unknown-path");
  });

  it("maps error responses for 400/404/500/503", async () => {
    const app = createApp({
      reviewService: createMockReviewService(),
      config: { categoryFilterTags: ["review"] },
      readinessCheck: async () => ({ ok: true })
    });

    const badRequest = Object.assign(new Error("bad input"), {
      code: "VALIDATION_ERROR",
      status: 400
    });
    const notFound = Object.assign(new Error("missing"), {
      code: "NOTE_NOT_FOUND"
    });
    const internal = new Error("boom");
    const unavailable = Object.assign(new Error("db down"), {
      status: 503
    });

    const [res400, res404, res500, res503] = await Promise.all([
      invokeErrorMiddleware(app, badRequest, { url: "/bad" }),
      invokeErrorMiddleware(app, notFound, { url: "/missing" }),
      invokeErrorMiddleware(app, internal, { url: "/error" }),
      invokeErrorMiddleware(app, unavailable, { url: "/ready" })
    ]);

    expect(res400.statusCode).toBe(400);
    expect(res400.text).toContain("status: 400");
    expect(res404.statusCode).toBe(404);
    expect(res404.text).toContain("404 Not Found");
    expect(res500.statusCode).toBe(500);
    expect(res500.text).toContain("500 Error");
    expect(res503.statusCode).toBe(503);
    expect(res503.text).toContain("503 Error");
  });
});
