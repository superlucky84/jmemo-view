const ALLOWED_LOG_LEVELS = new Set(["debug", "info", "warn", "error"]);

function normalizeString(value) {
  return String(value ?? "").trim();
}

export function validateMongoUri(rawValue) {
  const uri = normalizeString(rawValue);

  if (!uri) {
    throw new Error("Missing MONGODB_URI in .env");
  }

  if (!uri.startsWith("mongodb+srv://")) {
    throw new Error("MONGODB_URI must start with mongodb+srv:// for Atlas.");
  }

  if (uri.includes("<db_password>") || uri.includes("<URL_ENCODED_PASSWORD>")) {
    throw new Error("Replace MONGODB_URI password placeholder before running.");
  }

  return uri;
}

export function parseMongoDbName(rawValue, fallback = "jmemo") {
  const value = normalizeString(rawValue);
  return value || fallback;
}

export function parsePort(rawValue, fallback = 4000) {
  const value = normalizeString(rawValue);

  if (!value) {
    return fallback;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

export function parseLogLevel(rawValue, fallback = "info") {
  const normalized = normalizeString(rawValue).toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (!ALLOWED_LOG_LEVELS.has(normalized)) {
    throw new Error(`LOG_LEVEL must be one of: ${Array.from(ALLOWED_LOG_LEVELS).join(", ")}`);
  }

  return normalized;
}

export function parseCategoryFilter(rawValue, fallback = "review") {
  const source =
    rawValue === undefined || rawValue === null
      ? normalizeString(fallback)
      : normalizeString(rawValue);

  if (!source) {
    return {
      raw: "",
      tags: []
    };
  }

  const tags = source
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    raw: source,
    tags
  };
}

export function resolveAppEnv(rawEnv = process.env, options = {}) {
  const { requireMongoUri = true } = options;

  const mongoUri = requireMongoUri
    ? validateMongoUri(rawEnv.MONGODB_URI)
    : normalizeString(rawEnv.MONGODB_URI)
      ? validateMongoUri(rawEnv.MONGODB_URI)
      : null;

  const category = parseCategoryFilter(rawEnv.JMEMO_CATEGORY_FILTER, "review");

  return {
    mongoUri,
    mongoDbName: parseMongoDbName(rawEnv.MONGODB_DB_NAME, "jmemo"),
    port: parsePort(rawEnv.PORT, 4000),
    logLevel: parseLogLevel(rawEnv.LOG_LEVEL, "info"),
    categoryFilterRaw: category.raw,
    categoryFilterTags: category.tags
  };
}
