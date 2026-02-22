import { startServer } from "./bootstrap.mjs";
import { writeStructuredLog } from "./logging.mjs";

try {
  await startServer();
} catch (error) {
  writeStructuredLog({
    time: new Date().toISOString(),
    level: "error",
    event: "server_boot_failed",
    message: error?.message || String(error)
  });
  process.exit(1);
}
