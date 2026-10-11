// Reproducibility and fail-closed gates in a disposable website-only checkout.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { root, files, sha } from "./site.mjs";
const target = fs.mkdtempSync(
  path.join(os.tmpdir(), "editorial-static-acceptance-"),
);
const exclude = new Set([
  ".git",
  "node_modules",
  "dist",
  ".operations",
  "test-results",
  "playwright-report",
]);
function copy(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (exclude.has(entry.name)) continue;
    const a = path.join(from, entry.name),
      b = path.join(to, entry.name);
    if (entry.isDirectory()) copy(a, b);
    else if (entry.isFile()) fs.copyFileSync(a, b);
  }
}
copy(root, target);
fs.symlinkSync(
  path.join(root, "editorial-app/node_modules"),
  path.join(target, "editorial-app/node_modules"),
  "dir",
);
// Only the website HEAD is read; no sibling backend or private contract generation.
fs.writeFileSync(
  path.join(target, ".git"),
  "gitdir: " + path.join(root, ".git") + "\n",
);
const run = (...args) =>
  execFileSync(process.execPath, args, {
    cwd: target,
    stdio: "pipe",
    encoding: "utf8",
  });
const rejects = (...args) =>
  assert.notEqual(
    spawnSync(process.execPath, args, { cwd: target, stdio: "pipe" }).status,
    0,
  );
const manifests = {};
for (const env of ["local", "staging", "prod"]) {
  run("scripts/site.mjs", "build", env);
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(
        target,
        `dist/${env}/misattribution/editorial/build-manifest.json`,
      ),
    ),
  );
  run("scripts/site.mjs", "build", env);
  assert.deepEqual(
    JSON.parse(
      fs.readFileSync(
        path.join(
          target,
          `dist/${env}/misattribution/editorial/build-manifest.json`,
        ),
      ),
    ),
    manifest,
  );
  manifests[env] = {
    bundleDigest: manifest.bundleDigest,
    sourceDigest: manifest.sourceDigest,
    projectId: manifest.projectId,
  };
  console.log("Reproducible standalone build: " + env);
}
rejects("scripts/site.mjs", "build", "unspecified");
const contract = path.join(target, "editorial-app/src/contract/contracts.ts"),
  contractBytes = fs.readFileSync(contract);
fs.appendFileSync(contract, "\n// invalid drift\n");
rejects("scripts/contract.mjs");
fs.writeFileSync(contract, contractBytes);
const source = path.join(target, "editorial-app/src/App.tsx"),
  sourceBytes = fs.readFileSync(source);
fs.appendFileSync(source, "\n// stale artifact test\n");
rejects("scripts/site.mjs", "verify", "prod");
fs.writeFileSync(source, sourceBytes);
const asset = files(path.join(target, "dist/prod")).find((f) =>
    f.endsWith(".js"),
  ),
  assetBytes = fs.readFileSync(asset);
fs.appendFileSync(asset, "\n// artifact tampering\n");
rejects("scripts/site.mjs", "verify", "prod");
fs.writeFileSync(asset, assetBytes);
const publicPage = path.join(target, "index.html"),
  publicBytes = fs.readFileSync(publicPage);
fs.appendFileSync(publicPage, "\n<!-- unexpected public change -->\n");
rejects("scripts/site.mjs", "verify", "prod");
fs.writeFileSync(publicPage, publicBytes);
run("scripts/site.mjs", "verify", "prod");
const result = {
  passed: true,
  checks: [
    "website-only standalone builds",
    "deterministic local/staging/prod rebuilds",
    "invalid environment denied",
    "contract drift denied",
    "stale source denied",
    "tampered artifact denied",
    "public baseline drift denied",
  ],
  manifests,
  finishedAt: new Date().toISOString(),
};
fs.mkdirSync(path.join(root, ".operations/step-c"), { recursive: true });
fs.writeFileSync(
  path.join(root, ".operations/step-c/build-checks.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log("All static negative gates passed.");
// This script created this isolated directory and owns all files in it.
fs.rmSync(target, { recursive: true, force: true });
