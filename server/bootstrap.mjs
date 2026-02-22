import { createApp } from "./app.mjs";
import { connectMongo, disconnectMongo, pingMongo } from "./db.mjs";
import { resolveAppEnv } from "./env.mjs";
import { writeStructuredLog } from "./logging.mjs";
import { JmemoModel } from "./models/jmemo-model.mjs";
import { createReviewService } from "./services/review-service.mjs";

export async function startServer(options = {}) {
  const {
    rawEnv = process.env,
    deps = {},
    registerSignalHandlers = true
  } = options;

  const resolveEnv = deps.resolveAppEnv ?? resolveAppEnv;
  const connect = deps.connectMongo ?? connectMongo;
  const disconnect = deps.disconnectMongo ?? disconnectMongo;
  const ping = deps.pingMongo ?? pingMongo;
  const createService = deps.createReviewService ?? createReviewService;
  const createExpressApp = deps.createApp ?? createApp;
  const Jmemo = deps.JmemoModel ?? JmemoModel;
  const logger = deps.logger ?? ((message) => console.log(message));

  const config = resolveEnv(rawEnv, { requireMongoUri: true });

  await connect(config.mongoUri, config.mongoDbName);

  const reviewService = createService({
    JmemoModel: Jmemo,
    categoryFilterTags: config.categoryFilterTags
  });

  const app = createExpressApp({
    reviewService,
    config,
    readinessCheck: async () => {
      try {
        await ping();
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
    writeStructuredLog(
      {
        time: new Date().toISOString(),
        level: config.logLevel,
        event: "server_started",
        port: config.port,
        categoryFilter: config.categoryFilterTags
      },
      { logger }
    );
  });

  async function shutdown(signal) {
    writeStructuredLog(
      {
        time: new Date().toISOString(),
        level: "info",
        event: "server_shutdown",
        signal
      },
      { logger }
    );

    await new Promise((resolve) => server.close(() => resolve()));
    await disconnect();
  }

  if (registerSignalHandlers) {
    process.on("SIGINT", () => {
      void shutdown("SIGINT").finally(() => process.exit(0));
    });

    process.on("SIGTERM", () => {
      void shutdown("SIGTERM").finally(() => process.exit(0));
    });
  }

  return {
    app,
    server,
    config,
    shutdown
  };
}
