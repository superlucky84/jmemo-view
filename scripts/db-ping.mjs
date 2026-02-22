import { connectMongo, disconnectMongo, pingMongo } from "../server/db.mjs";
import { resolveAppEnv } from "../server/env.mjs";

try {
  const config = resolveAppEnv(process.env, { requireMongoUri: true });
  await connectMongo(config.mongoUri, config.mongoDbName);
  await pingMongo();
  console.log(
    JSON.stringify(
      {
        ok: true,
        message: "MongoDB ping success",
        mongoDbName: config.mongoDbName
      },
      null,
      2
    )
  );
  await disconnectMongo();
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
  try {
    await disconnectMongo();
  } catch (_) {
    // ignore cleanup failure
  }
  process.exit(1);
}
