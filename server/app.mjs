import { randomUUID } from "node:crypto";
import express from "express";
import { buildRequestLogPayload, writeStructuredLog } from "./logging.mjs";
import { renderMarkdownToHtml } from "./markdown.mjs";
import { renderDetailPage, renderErrorPage, renderListPage, renderNotFoundPage } from "./ssr/pages.mjs";
import { isNoteId } from "./services/review-service.mjs";
import { resolveRequestTheme } from "./theme.mjs";

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function statusFromError(error) {
  if (!error) {
    return 500;
  }

  if (typeof error.status === "number" && error.status >= 400) {
    return error.status;
  }

  if (error.code === "INVALID_ID_FORMAT" || error.code === "NOTE_NOT_FOUND") {
    return 404;
  }

  if (error.code === "VALIDATION_ERROR") {
    return 400;
  }

  return 500;
}

function safeMessage(error, status) {
  if (status >= 500) {
    return "서버 처리 중 오류가 발생했습니다.";
  }

  return error?.message || "요청을 처리할 수 없습니다.";
}

function logRequest(req, res, startAt) {
  const payload = buildRequestLogPayload({
    req,
    res,
    startAt
  });
  writeStructuredLog(payload);
}

export function createApp(options = {}) {
  const {
    reviewService,
    config,
    readinessCheck = async () => ({ ok: true })
  } = options;

  if (!reviewService) {
    throw new Error("reviewService is required");
  }

  const app = express();
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    req.requestId = randomUUID();
    const startedAt = Date.now();
    res.setHeader("x-request-id", req.requestId);
    res.on("finish", () => {
      logRequest(req, res, startedAt);
    });
    next();
  });

  app.use("/assets", express.static("public/assets"));

  app.get(
    "/health/live",
    asyncRoute(async (_req, res) => {
      res.json({
        ok: true,
        status: "live",
        time: new Date().toISOString()
      });
    })
  );

  app.get(
    "/health/ready",
    asyncRoute(async (_req, res) => {
      const readiness = await readinessCheck();
      if (!readiness?.ok) {
        const error = new Error(readiness?.message || "Service is not ready");
        error.status = 503;
        throw error;
      }

      res.json({
        ok: true,
        status: "ready",
        time: new Date().toISOString()
      });
    })
  );

  app.get(
    "/",
    asyncRoute(async (req, res) => {
      const theme = resolveRequestTheme(req);
      const listResult = await reviewService.listReviews({
        page: req.query.page,
        pageSize: req.query.pageSize
      });

      const html = renderListPage({
        listResult,
        theme,
        filterTags: config.categoryFilterTags
      });

      res.status(200).type("text/html").send(html);
    })
  );

  app.get(
    "/notes/:id",
    asyncRoute(async (req, res) => {
      const theme = resolveRequestTheme(req);
      const review = await reviewService.getReviewById(req.params.id);
      const noteHtml = renderMarkdownToHtml(review.note);
      const html = renderDetailPage({ review, noteHtml, theme });
      res.status(200).type("text/html").send(html);
    })
  );

  app.get(
    "/:id",
    asyncRoute(async (req, res, next) => {
      const { id } = req.params;
      if (!isNoteId(id)) {
        next();
        return;
      }

      res.redirect(302, `/notes/${id}`);
    })
  );

  app.use((req, res) => {
    const theme = resolveRequestTheme(req);
    const html = renderNotFoundPage({
      theme,
      message: `경로를 찾을 수 없습니다: ${req.originalUrl}`
    });
    res.status(404).type("text/html").send(html);
  });

  app.use((error, req, res, _next) => {
    const status = statusFromError(error);
    const theme = resolveRequestTheme(req);

    if (status === 404) {
      const html = renderNotFoundPage({ theme, message: safeMessage(error, status) });
      res.status(404).type("text/html").send(html);
      return;
    }

    if (status === 400) {
      const html = renderErrorPage({
        theme,
        message: safeMessage(error, status),
        status
      });
      res.status(400).type("text/html").send(html);
      return;
    }

    const html = renderErrorPage({
      theme,
      message: safeMessage(error, status),
      status
    });
    res.status(status).type("text/html").send(html);
  });

  return app;
}
