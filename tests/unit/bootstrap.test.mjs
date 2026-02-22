import { describe, expect, it } from "vitest";
import { startServer } from "../../server/bootstrap.mjs";

function createResolvedEnv() {
  return {
    mongoUri: "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority",
    mongoDbName: "jmemo",
    port: 4000,
    logLevel: "info",
    categoryFilterTags: ["review"]
  };
}

describe("server bootstrap", () => {
  it("fails fast when mongo connection fails during boot", async () => {
    const calls = {
      createAppCalled: false
    };

    await expect(
      startServer({
        registerSignalHandlers: false,
        deps: {
          resolveAppEnv: () => createResolvedEnv(),
          connectMongo: async () => {
            throw new Error("connect failed");
          },
          createApp: () => {
            calls.createAppCalled = true;
            return {
              listen() {
                throw new Error("should not listen when connect fails");
              }
            };
          }
        }
      })
    ).rejects.toThrow("connect failed");

    expect(calls.createAppCalled).toBe(false);
  });

  it("boots and shuts down without real socket when app is injected", async () => {
    const calls = {
      connect: 0,
      disconnect: 0,
      ping: 0,
      listenPort: null
    };

    let capturedReadinessCheck = null;
    const logLines = [];

    const runtime = await startServer({
      registerSignalHandlers: false,
      deps: {
        logger: (line) => {
          logLines.push(line);
        },
        resolveAppEnv: () => createResolvedEnv(),
        connectMongo: async () => {
          calls.connect += 1;
        },
        disconnectMongo: async () => {
          calls.disconnect += 1;
        },
        pingMongo: async () => {
          calls.ping += 1;
        },
        createReviewService: () => ({
          async listReviews() {
            return { items: [], page: 1, pageSize: 30, total: 0, hasNext: false };
          },
          async getReviewById() {
            return {
              id: "65f111111111111111111111",
              title: "title",
              note: "",
              dateLabel: "2026-2-22",
              favorite: false,
              tags: ["review"]
            };
          }
        }),
        createApp: ({ readinessCheck }) => {
          capturedReadinessCheck = readinessCheck;
          return {
            listen(port, callback) {
              calls.listenPort = port;
              callback();
              return {
                close(done) {
                  done();
                }
              };
            }
          };
        }
      }
    });

    expect(calls.connect).toBe(1);
    expect(calls.listenPort).toBe(4000);
    expect(typeof capturedReadinessCheck).toBe("function");

    const readiness = await capturedReadinessCheck();
    expect(readiness).toEqual({ ok: true });
    expect(calls.ping).toBe(1);

    await runtime.shutdown("TEST");
    expect(calls.disconnect).toBe(1);

    const joined = logLines.join("\n");
    expect(joined).toContain("server_started");
    expect(joined).toContain("server_shutdown");
  });

  it("returns not-ready when ping throws timeout error", async () => {
    let readinessCheck = null;

    const runtime = await startServer({
      registerSignalHandlers: false,
      deps: {
        logger: () => {},
        resolveAppEnv: () => createResolvedEnv(),
        connectMongo: async () => {},
        disconnectMongo: async () => {},
        pingMongo: async () => {
          throw new Error("ping timeout");
        },
        createReviewService: () => ({
          async listReviews() {
            return { items: [], page: 1, pageSize: 30, total: 0, hasNext: false };
          },
          async getReviewById() {
            return {
              id: "65f111111111111111111111",
              title: "title",
              note: "",
              dateLabel: "2026-2-22",
              favorite: false,
              tags: ["review"]
            };
          }
        }),
        createApp: ({ readinessCheck: injectedReadinessCheck }) => {
          readinessCheck = injectedReadinessCheck;
          return {
            listen(_port, callback) {
              callback();
              return {
                close(done) {
                  done();
                }
              };
            }
          };
        }
      }
    });

    const readiness = await readinessCheck();
    expect(readiness).toEqual({ ok: false, message: "ping timeout" });

    await runtime.shutdown("TEST");
  });
});
