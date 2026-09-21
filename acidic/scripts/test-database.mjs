import { spawnSync } from "node:child_process";
if (process.env.RUN_DATABASE_TESTS !== "1" || !process.env.TEST_DATABASE_URL) {
  console.error("Database tests were not run. Set RUN_DATABASE_TESTS=1 and TEST_DATABASE_URL in .env.test.local for a migrated, disposable PostgreSQL database.");
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "tests/database.integration.test.ts", "--testTimeout=30000", "--hookTimeout=30000"], { stdio: "inherit", windowsHide: true });
  process.exitCode = result.status ?? 1;
}
