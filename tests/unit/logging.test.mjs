import { describe, expect, it } from "vitest";
import { buildRequestLogPayload, sanitizeLogPayload, writeStructuredLog } from "../../server/logging.mjs";

describe("logging helpers", () => {
  it("builds request log payload with required fields", () => {
    const now = new Date("2026-02-22T10:00:00.000Z").getTime();
    const startAt = now - 42;
    const payload = buildRequestLogPayload({
      req: {
        requestId: "req-1",
        originalUrl: "/notes/65f111111111111111111111"
      },
      res: {
        statusCode: 200
      },
      startAt,
      now
    });

    expect(payload).toEqual({
      time: "2026-02-22T10:00:00.000Z",
      level: "info",
      requestId: "req-1",
      route: "/notes/65f111111111111111111111",
      status: 200,
      latencyMs: 42
    });
  });

  it("masks mongo uri, token and cookie fields", () => {
    const sanitized = sanitizeLogPayload({
      mongoUri: "mongodb+srv://user:secret@cluster.mongodb.net/db",
      token: "abc123",
      cookie: "a=1; b=2",
      nested: {
        message:
          "authorization: bearer abcdef password=1234 token=qwer mongodb+srv://u:p@host/db"
      }
    });

    expect(sanitized.mongoUri).toBe("***");
    expect(sanitized.token).toBe("***");
    expect(sanitized.cookie).toBe("***");
    expect(sanitized.nested.message).not.toContain("abcdef");
    expect(sanitized.nested.message).not.toContain("password=1234");
    expect(sanitized.nested.message).not.toContain("token=qwer");
    expect(sanitized.nested.message).not.toContain("://u:p@");
    expect(sanitized.nested.message).toContain("password=***");
    expect(sanitized.nested.message).toContain("token=***");
    expect(sanitized.nested.message).toContain("://u:***@");
  });

  it("writes sanitized structured json log line", () => {
    const lines = [];
    writeStructuredLog(
      {
        level: "info",
        route: "/",
        token: "plain-secret"
      },
      {
        logger: (line) => {
          lines.push(line);
        }
      }
    );

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.level).toBe("info");
    expect(parsed.route).toBe("/");
    expect(parsed.token).toBe("***");
  });
});
