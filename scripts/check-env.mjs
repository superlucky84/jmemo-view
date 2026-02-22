import { resolveAppEnv } from "../server/env.mjs";

try {
  const config = resolveAppEnv(process.env, { requireMongoUri: true });
  console.log(
    JSON.stringify(
      {
        ok: true,
        port: config.port,
        mongoDbName: config.mongoDbName,
        categoryFilterTags: config.categoryFilterTags
      },
      null,
      2
    )
  );
  process.exit(0);
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error?.message || String(error)
      },
      null,
      2
    )
  );
  process.exit(1);
}
