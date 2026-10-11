import { execFileSync } from "node:child_process";
import path from "node:path";
import { root } from "./site.mjs";
if (
  process.env.GCLOUD_PROJECT !== "demo-misattribution" ||
  process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:28080" ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:29099"
)
  throw Error("Demo emulator scope required");
// Backend E08 deliberately rotates the epoch. Start each subsequent suite with
// a fresh disposable Firestore emulator DB before invoking its own fixture seed.
async function resetDemoDatabase() {
  const response = await fetch(
    "http://127.0.0.1:28080/emulator/v1/projects/demo-misattribution/databases/(default)/documents",
    { method: "DELETE" },
  );
  if (!response.ok) throw Error("Could not isolate the next demo test suite");
  const authReset = await fetch(
    "http://127.0.0.1:29099/emulator/v1/projects/demo-misattribution/accounts",
    { method: "DELETE" },
  );
  if (!authReset.ok)
    throw Error("Could not isolate demo Auth identities for the next suite");

  execFileSync("node", ["scripts/tests/seed-data-epoch.cjs"], {
    cwd: process.env.EDITORIAL_TEST_BACKEND,
    stdio: "inherit",
  });
}
await resetDemoDatabase();
execFileSync("npm", ["run", "build:local"], { cwd: root, stdio: "inherit" });
execFileSync(
  "npm",
  [
    "--prefix",
    "editorial-app",
    "run",
    "test:e2e",
    "--",
    ...(process.env.EDITORIAL_BROWSER_GREP
      ? ["--grep", process.env.EDITORIAL_BROWSER_GREP]
      : []),
  ],
  { cwd: root, stdio: "inherit" },
);
if (process.env.EDITORIAL_LEGACY_TESTS === "1") {
  await resetDemoDatabase();
  execFileSync("node", ["scripts/tests/seed-data-epoch.cjs"], {
    cwd: process.env.EDITORIAL_TEST_BACKEND,
    stdio: "inherit",
  });
  execFileSync("node", ["scripts/tests/emulator-integration.cjs"], {
    cwd: process.env.EDITORIAL_TEST_BACKEND,
    stdio: "inherit",
  });
  execFileSync("npm", ["run", "test:e2e"], {
    cwd: path.join(process.env.EDITORIAL_TEST_BACKEND, "editorial-portal"),
    stdio: "inherit",
  });
}
