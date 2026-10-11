import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
export const root = path.resolve(import.meta.dirname, "..");
export const sha = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
export function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
    .flatMap((e) =>
      e.isDirectory()
        ? files(path.join(dir, e.name))
        : e.isFile()
          ? [path.join(dir, e.name)]
          : [],
    );
}
export function sourceDigest() {
  const list = [
    ...files(path.join(root, "editorial-app/src")),
    ...files(path.join(root, "editorial-app/tests")),
    ...files(path.join(root, "scripts")),
    ...[
      "editorial-app/.npmrc",
      ".github/workflows/editorial-validation.yml",
      "editorial-app/package.json",
      "editorial-app/package-lock.json",
      "editorial-app/config.ts",
      "editorial-app/environments.json",
      "editorial-app/backend-pin.json",
      "editorial-app/vite.config.ts",
      "editorial-app/tsconfig.json",
      "editorial-app/eslint.config.js",
      "editorial-app/index.html",
      "editorial-app/playwright.config.ts",
      "package.json",
      "package-lock.json",
    ].map((f) => path.join(root, f)),
  ].sort();
  return sha(
    JSON.stringify(
      Object.fromEntries(
        list.map((f) => [path.relative(root, f), sha(fs.readFileSync(f))]),
      ),
    ),
  );
}
export function verify(environment) {
  if (!["local", "staging", "prod"].includes(environment))
    throw Error("Explicit local/staging/prod required");
  const folder = path.join(root, "dist", environment),
    manifest = JSON.parse(
      fs.readFileSync(
        path.join(folder, "misattribution/editorial/build-manifest.json"),
      ),
    ),
    pin = JSON.parse(
      fs.readFileSync(path.join(root, "editorial-app/backend-pin.json")),
    );
  const expected = {
    local: "demo-misattribution",
    staging: "misattribution-staging",
    prod: "misattribution-aa1e2",
  };
  if (
    manifest.environment !== environment ||
    manifest.projectId !== expected[environment] ||
    manifest.sourceDigest !== sourceDigest() ||
    manifest.backendSha !== pin.backendSha ||
    manifest.contractDigest !== pin.contractDigest ||
    manifest.contractVersion !== pin.contractVersion
  )
    throw Error("Stale or mismatched artifact");
  const output = files(folder).map((f) => path.relative(folder, f));
  const actual = {};
  for (const name of output) {
    if (name.endsWith("build-manifest.json")) continue;
    actual[name] = sha(fs.readFileSync(path.join(folder, name)));
    if (manifest.files[name] !== actual[name])
      throw Error("Changed artifact: " + name);
    if (
      /\.map$|node_modules|\.env|\.md$|test|contract\/|src\/|\.operations|package|\.tsx?$/.test(
        name,
      )
    )
      throw Error("Nonpublic output: " + name);
  }
  if (
    Object.keys(manifest.files).sort().join() !==
      Object.keys(actual).sort().join() ||
    manifest.bundleDigest !== sha(JSON.stringify(manifest.files))
  )
    throw Error("Artifact inventory/digest mismatch");
  const baseline = JSON.parse(
    fs.readFileSync(path.join(root, "scripts/public-baseline.json")),
  );
  for (const [name, digest] of Object.entries(baseline))
    if (
      sha(fs.readFileSync(path.join(root, name))) !== digest ||
      actual[name] !== digest
    )
      throw Error("Public site regression: " + name);
  const html = fs.readFileSync(
    path.join(folder, "misattribution/editorial/index.html"),
    "utf8",
  );
  if (
    !html.includes("noindex,nofollow,noarchive") ||
    !html.includes("Content-Security-Policy") ||
    !html.includes("/misattribution/editorial/assets/")
  )
    throw Error("Static entry metadata/base missing");
  for (const f of output
    .filter(
      (f) => f.endsWith(".html") && !f.startsWith("misattribution/editorial/"),
    )
    .concat(["sitemap.xml"]))
    if (
      fs
        .readFileSync(path.join(folder, f), "utf8")
        .includes("/misattribution/editorial")
    )
      throw Error("Editorial public navigation/sitemap leak");
  const js = output
    .filter((f) => f.endsWith(".js"))
    .map((f) => fs.readFileSync(path.join(folder, f), "utf8"))
    .join("\n");
  if (
    !js.includes(expected[environment]) ||
    Object.values(expected)
      .filter((id) => id !== expected[environment])
      .some((id) => js.includes(id))
  )
    throw Error("Cross-project routing in bundle");
  if (
    /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|"private_key"\s*:|"client_email"\s*:|signInEmulator|@example\.test|firebase-admin|VITE_.*SECRET/.test(
      js,
    )
  )
    throw Error("Test identity or privileged material in artifact");
  for (const f of files(path.join(root, "editorial-app/src"))) {
    const s = fs.readFileSync(f, "utf8");
    if (
      /from ["'].*(?:MisAttribution|functions\/src|firebase\/firestore|firebase-admin)|dangerouslySetInnerHTML|localStorage|serviceWorker|console\.(?:log|error)/.test(
        s,
      )
    )
      throw Error("Unsafe browser source: " + f);
  }
  console.log(
    `Verified ${environment} static site: ${output.length} files, ${manifest.bundleDigest}`,
  );
  return manifest;
}
const [action, environment] = process.argv.slice(2);
if (action === "build") {
  if (!["local", "staging", "prod"].includes(environment))
    throw Error("Explicit local/staging/prod required");
  execFileSync("node", ["scripts/contract.mjs"], {
    cwd: root,
    stdio: "inherit",
  });
  execFileSync(
    "npm",
    [
      "--prefix",
      "editorial-app",
      "run",
      environment === "prod"
        ? "build:prod"
        : environment === "local"
          ? "build:local"
          : "build",
    ],
    { cwd: root, stdio: "inherit" },
  );
  const folder = path.join(root, "dist", environment);
  fs.rmSync(folder, { recursive: true, force: true });
  fs.mkdirSync(folder, { recursive: true });
  const baseline = JSON.parse(
    fs.readFileSync(path.join(root, "scripts/public-baseline.json")),
  );
  for (const name of Object.keys(baseline)) {
    fs.mkdirSync(path.dirname(path.join(folder, name)), { recursive: true });
    fs.copyFileSync(path.join(root, name), path.join(folder, name));
  }
  fs.cpSync(
    path.join(root, "editorial-app/dist"),
    path.join(folder, "misattribution/editorial"),
    { recursive: true },
  );
  // The root robots policy stays byte-for-byte intact; the HTML supplies noindex.
  fs.writeFileSync(path.join(folder, ".nojekyll"), "");
  const pin = JSON.parse(
      fs.readFileSync(path.join(root, "editorial-app/backend-pin.json")),
    ),
    env = JSON.parse(
      fs.readFileSync(path.join(root, "editorial-app/environments.json")),
    )[environment];
  const inventory = Object.fromEntries(
    files(folder).map((f) => [
      path.relative(folder, f),
      sha(fs.readFileSync(f)),
    ]),
  );
  const manifest = {
    schemaVersion: 1,
    ...pin,
    websiteBaseSha: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim(),
    sourceDigest: sourceDigest(),
    environment,
    projectId: env.projectId,
    base: "/misattribution/editorial/",
    bundleDigest: sha(JSON.stringify(inventory)),
    files: inventory,
  };
  fs.writeFileSync(
    path.join(folder, "misattribution/editorial/build-manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  verify(environment);
} else if (action === "verify") verify(environment);
