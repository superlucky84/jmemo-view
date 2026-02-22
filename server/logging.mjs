function maskString(input) {
  return String(input ?? "")
    .replace(/(mongodb(?:\+srv)?:\/\/[^:\s]+:)[^@\s]+@/gi, "$1***@")
    .replace(/\b(password|token|cookie)=([^&\s]+)/gi, "$1=***")
    .replace(/\b(authorization:\s*bearer\s+)[^\s]+/gi, "$1***");
}

function isSensitiveKey(key) {
  return /password|token|cookie|authorization|mongodb?_?uri|mongo_?uri/i.test(String(key));
}

function maskValue(value, keyHint = "") {
  if (value == null) {
    return value;
  }

  if (typeof value === "string") {
    if (isSensitiveKey(keyHint)) {
      return "***";
    }

    return maskString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskValue(item, keyHint));
  }

  if (typeof value === "object") {
    const sanitized = {};
    for (const [key, item] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = "***";
      } else {
        sanitized[key] = maskValue(item, key);
      }
    }
    return sanitized;
  }

  return value;
}

export function sanitizeLogPayload(payload) {
  return maskValue(payload);
}

export function buildRequestLogPayload({ req, res, startAt, now = Date.now() }) {
  return {
    time: new Date(now).toISOString(),
    level: "info",
    requestId: req?.requestId || null,
    route: req?.originalUrl || req?.url || "",
    status: Number.isInteger(res?.statusCode) ? res.statusCode : 0,
    latencyMs: Math.max(0, now - Number(startAt || now))
  };
}

export function writeStructuredLog(payload, options = {}) {
  const { logger = (message) => console.log(message) } = options;
  logger(JSON.stringify(sanitizeLogPayload(payload)));
}
