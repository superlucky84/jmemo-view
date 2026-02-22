import { createApp } from "./app.mjs";
import { connectMongo, disconnectMongo, pingMongo } from "./db.mjs";
import { resolveAppEnv } from "./env.mjs";
import { JmemoModel } from "./models/jmemo-model.mjs";
import { createReviewService } from "./services/review-service.mjs";

const config = resolveAppEnv(process.env, { requireMongoUri: true });

await connectMongo(config.mongoUri, config.mongoDbName);

const reviewService = createReviewService({
  JmemoModel,
  categoryFilterTags: config.categoryFilterTags
});

const app = createApp({
  reviewService,
  config,
  readinessCheck: async () => {
    try {
      await pingMongo();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error?.message || "DB unavailable"
      };
    }
  }
});

const server = app.listen(config.port, () => {
  console.log(
    JSON.stringify({
      time: new Date().toISOString(),
      level: config.logLevel,
      event: "server_started",
      port: config.port,
      categoryFilter: config.categoryFilterTags
    })
  );
});

async function shutdown(signal) {
  console.log(
    JSON.stringify({
      time: new Date().toISOString(),
      level: "info",
      event: "server_shutdown",
      signal
    })
  );

  await new Promise((resolve) => server.close(() => resolve()));
  await disconnectMongo();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
