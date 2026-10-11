// Local-only candidate orchestration. All backend writes occur in demo emulators.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { root, sha } from "./site.mjs";
const backend = path.resolve(
  process.env.EDITORIAL_BACKEND_ROOT ?? path.join(root, "../MisAttribution"),
);
execFileSync(
  "node",
  ["scripts/contract.mjs", "--local", `--backend=${backend}`],
  { cwd: root, stdio: "inherit" },
);
const target = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-step-c-"));
const names = execFileSync("git", ["ls-files", "-z"], {
  cwd: backend,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
const sourceFiles = {},
  substitutions = [];
for (const name of names) {
  const from = path.join(backend, name);
  if (!fs.statSync(from).isFile()) continue;
  const bytes = fs.readFileSync(from);
  sourceFiles[name] = sha(bytes);
  let output = bytes;
  if (/\.(cjs|mjs|js|ts|tsx)$/.test(name)) {
    const text = bytes.toString(),
      modified = text
        .replace(
          /(127\.0\.0\.1|localhost):(8080|9099|5001)\b/g,
          (_, h, p) => h + ":" + { 8080: 28080, 9099: 29099, 5001: 25001 }[p],
        )
        .replace(
          /(\}:)(8080|9099|5001)\b/g,
          (_, h, p) => h + { 8080: 28080, 9099: 29099, 5001: 25001 }[p],
        )
        .replace(
          /((?:connectFunctionsEmulator|connectFirestoreEmulator)\([^;\n]*,\s*)(8080|5001)(\s*\))/g,
          (_, a, p, b) => a + { 8080: 28080, 5001: 25001 }[p] + b,
        )
        .replaceAll("127\\.0\\.0\\.1:8080", "127\\.0\\.0\\.1:28080")
        .replaceAll("127\\.0\\.0\\.1:9099", "127\\.0\\.0\\.1:29099")
        .replaceAll("127\\.0\\.0\\.1:5001", "127\\.0\\.0\\.1:25001");
    output = Buffer.from(modified);
    if (!output.equals(bytes))
      substitutions.push({
        name,
        kind: "loopback ports only",
        before: sha(bytes),
        after: sha(output),
      });
  }
  const dest = path.join(target, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, output);
}
for (const folder of [
  "",
  "functions",
  "services/content-ingestion",
  "editorial-portal",
])
  fs.symlinkSync(
    path.join(backend, folder, "node_modules"),
    path.join(target, folder, "node_modules"),
    "dir",
  );
for (const name of ["config/environments.json", "firebase.json"]) {
  const file = path.join(target, name),
    j = JSON.parse(fs.readFileSync(file));
  if (name.startsWith("config"))
    Object.assign(j.local, {
      functionsPort: 25001,
      firestorePort: 28080,
      authPort: 29099,
    });
  else {
    for (const [n, port] of Object.entries({
      functions: 25001,
      firestore: 28080,
      auth: 29099,
      ui: 24000,
      hub: 24400,
      logging: 24500,
    }))
      j.emulators[n] = { ...j.emulators[n], host: "127.0.0.1", port };
    j.emulators.ui.enabled = false;
  }
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
  substitutions.push({ name, kind: "demo ports / disabled UI only" });
}
const runner = path.join(target, "scripts/emulators.cjs");
const quote = (s) => "'" + s.replaceAll("'", "'\\''") + "'";
const command =
  (process.env.EDITORIAL_BROWSER_ONLY === "1"
    ? ""
    : "node scripts/tests/editorial-backend-integration.cjs && ") +
  `node ${quote(path.join(root, "scripts/browser-run.mjs"))}`;
fs.writeFileSync(
  runner,
  fs
    .readFileSync(runner, "utf8")
    .replace(
      "node scripts/tests/emulator-integration.cjs && npm --prefix editorial-portal run test:e2e",
      command,
    ),
);
substitutions.push({
  name: "scripts/emulators.cjs",
  kind: "portal-test command selects fresh Step B integration then website browser suite",
});
fs.writeFileSync(
  path.join(target, ".git"),
  "gitdir: " + path.join(backend, ".git") + "\n",
);
const evidence = path.join(root, ".operations/step-c");
fs.mkdirSync(evidence, { recursive: true });
const manifest = {
  backendSha: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: backend,
    encoding: "utf8",
  }).trim(),
  target,
  sourceFiles,
  sourceFingerprint: sha(JSON.stringify(sourceFiles)),
  substitutions,
  startedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(evidence, "emulator-candidate.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
const java =
  process.env.JAVA_HOME ??
  "/private/tmp/misattribution-step9-java/amazon-corretto-21.jdk/Contents/Home";
const env = {
  ...process.env,
  EDITORIAL_TEST_BACKEND: target,
  JAVA_HOME: java,
  PATH: path.join(java, "bin") + path.delimiter + process.env.PATH,
  PLAYWRIGHT_BROWSERS_PATH:
    process.env.PLAYWRIGHT_BROWSERS_PATH ??
    "/private/tmp/misattribution-step-b-browsers",
};
console.log("Credential-free demo candidate: " + target);
const result = spawnSync("node", ["scripts/emulators.cjs", "portal-test"], {
  cwd: target,
  env,
  stdio: "inherit",
});
manifest.exitCode = result.status;
manifest.finishedAt = new Date().toISOString();
manifest.sourceChanged = Object.keys(sourceFiles).filter(
  (name) =>
    sha(fs.readFileSync(path.join(backend, name))) !== sourceFiles[name],
);
fs.writeFileSync(
  path.join(evidence, "emulator-candidate.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
process.exitCode = result.status ?? 1;
